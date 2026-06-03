const images = [
  "anteversio-anteflexio.png",
  "anteversio-retroflexio.png",
  "retroversio-anteflexio.png",
  "retroversio-retroflexio.png",
];

const figoCategories = ["FIGO1", "FIGO2", "FIGO3", "FIGO4", "FIGO5"];
const markerStartPositions = {
  selected: { x: 50, y: 50 },
  reference: { x: 50, y: 50 },
};
const markerDefaultSize = 58;
const markerMinSize = 34;
const markerMaxSize = 140;
const markerResizeEdgeWidth = 12;

const gallery = document.querySelector("#gallery");
const galleryView = document.querySelector("#gallery-view");
const detailView = document.querySelector("#detail-view");
const detailImage = document.querySelector("#detail-image");
const addMyomaButton = document.querySelector("#add-myoma");
const myomaList = document.querySelector("#myoma-list");
const markerSurfaces = document.querySelectorAll("[data-marker-surface]");

let myomaCounter = 0;

const getCaptionParts = (fileName) => fileName.replace(/\.png$/i, "").split("-");
const getCaptionText = (fileName) => getCaptionParts(fileName).join(" ");

const createCaption = (fileName) => {
  const caption = document.createElement("span");
  caption.className = "caption";

  getCaptionParts(fileName).forEach((part, index) => {
    if (index > 0) {
      caption.append(document.createElement("br"));
    }

    caption.append(part);
  });

  return caption;
};

const getImageUrl = (fileName) => `${window.location.pathname}?image=${encodeURIComponent(fileName)}`;

const renderGallery = () => {
  images.forEach((fileName) => {
    const card = document.createElement("a");
    card.className = "image-card";
    card.href = getImageUrl(fileName);
    card.setAttribute("aria-label", `Відкрити ${getCaptionText(fileName)}`);

    card.addEventListener("click", (event) => {
      event.preventDefault();
      openImage(fileName);
    });

    const image = document.createElement("img");
    image.src = fileName;
    image.alt = getCaptionText(fileName);
    image.loading = "lazy";

    card.append(image, createCaption(fileName));
    gallery.append(card);
  });
};

const renderDetail = (fileName) => {
  galleryView.hidden = true;
  detailView.hidden = false;

  detailImage.src = fileName;
  detailImage.alt = getCaptionText(fileName);
  document.title = `${getCaptionText(fileName)} — Вибір положення матки`;
};

const openImage = (fileName) => {
  if (!images.includes(fileName)) {
    return;
  }

  renderDetail(fileName);
  window.history.pushState({ image: fileName }, "", getImageUrl(fileName));
};

const renderFromUrl = () => {
  const selectedImage = new URLSearchParams(window.location.search).get("image");

  if (images.includes(selectedImage)) {
    renderDetail(selectedImage);
    return;
  }

  galleryView.hidden = false;
  detailView.hidden = true;
  detailImage.removeAttribute("src");
  detailImage.alt = "";
  document.title = "Вибір положення матки";
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const updateMarkerPosition = (marker, x, y) => {
  marker.dataset.x = x;
  marker.dataset.y = y;
  marker.style.left = `${x}%`;
  marker.style.top = `${y}%`;
};

const updateMarkerSize = (marker, size) => {
  const nextSize = clamp(size, markerMinSize, markerMaxSize);

  marker.dataset.size = nextSize;
  marker.style.setProperty("--marker-size", `${nextSize}px`);
};

const getPointerDistanceFromMarkerCenter = (marker, event) => {
  const rect = marker.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const offsetX = event.clientX - centerX;
  const offsetY = event.clientY - centerY;

  return Math.hypot(offsetX, offsetY);
};

const isPointerOnMarkerEdge = (marker, event) => {
  const radius = marker.getBoundingClientRect().width / 2;
  const distance = getPointerDistanceFromMarkerCenter(marker, event);

  return distance >= radius - markerResizeEdgeWidth;
};

const resizeMarkerFromPointer = (marker, event) => {
  const stage = marker.parentElement;
  const stageRect = stage.getBoundingClientRect();
  const centerX = stageRect.left + (Number(marker.dataset.x) / 100) * stageRect.width;
  const centerY = stageRect.top + (Number(marker.dataset.y) / 100) * stageRect.height;
  const diameter = Math.hypot(event.clientX - centerX, event.clientY - centerY) * 2;

  updateMarkerSize(marker, diameter);
};

const makeMarkerInteractive = (marker) => {
  marker.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    marker.setPointerCapture(event.pointerId);

    if (isPointerOnMarkerEdge(marker, event)) {
      marker.dataset.action = "resize";
      marker.classList.add("is-resizing");
      marker.classList.remove("is-resize-ready");
      return;
    }

    marker.dataset.action = "drag";
    marker.classList.add("is-dragging");
  });

  marker.addEventListener("pointermove", (event) => {
    if (!marker.hasPointerCapture(event.pointerId)) {
      marker.classList.toggle("is-resize-ready", isPointerOnMarkerEdge(marker, event));
      return;
    }

    if (marker.dataset.action === "resize") {
      resizeMarkerFromPointer(marker, event);
      return;
    }

    const stage = marker.parentElement;
    const rect = stage.getBoundingClientRect();
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100);

    updateMarkerPosition(marker, x, y);
  });

  marker.addEventListener("pointerleave", () => {
    if (!marker.dataset.action) {
      marker.classList.remove("is-resize-ready");
    }
  });

  const stopInteraction = (event) => {
    if (marker.hasPointerCapture(event.pointerId)) {
      marker.releasePointerCapture(event.pointerId);
    }

    delete marker.dataset.action;
    marker.classList.remove("is-dragging", "is-resizing", "is-resize-ready");
  };

  marker.addEventListener("pointerup", stopInteraction);
  marker.addEventListener("pointercancel", stopInteraction);
};

const createMarker = (myomaNumber, category, surface) => {
  const marker = document.createElement("button");
  marker.className = "myoma-marker";
  marker.type = "button";
  marker.dataset.myomaNumber = myomaNumber;
  marker.dataset.surface = surface.dataset.markerSurface;
  marker.textContent = category;
  marker.setAttribute(
    "aria-label",
    `Міома ${myomaNumber}, ${category}. Перетягніть коло по зображенню або потягніть за край, щоб змінити розмір.`,
  );

  const startPosition = markerStartPositions[marker.dataset.surface];
  updateMarkerPosition(marker, startPosition.x, startPosition.y);
  updateMarkerSize(marker, markerDefaultSize);
  makeMarkerInteractive(marker);

  surface.append(marker);
  return marker;
};

const createCategorySelect = (myomaNumber, initialCategory) => {
  const select = document.createElement("select");
  select.className = "figo-select";
  select.setAttribute("aria-label", `Категорія FIGO для утворення ${myomaNumber}`);

  figoCategories.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    option.selected = category === initialCategory;
    select.append(option);
  });

  select.addEventListener("change", () => {
    document.querySelectorAll(`[data-myoma-number="${myomaNumber}"]`).forEach((marker) => {
      marker.textContent = select.value;
      marker.setAttribute(
        "aria-label",
        `Міома ${myomaNumber}, ${select.value}. Перетягніть коло по зображенню або потягніть за край, щоб змінити розмір.`,
      );
    });
  });

  return select;
};

const addMyoma = () => {
  myomaCounter += 1;
  const category = figoCategories[0];

  const row = document.createElement("tr");

  const numberCell = document.createElement("td");
  numberCell.textContent = myomaCounter;

  const categoryCell = document.createElement("td");
  categoryCell.append(createCategorySelect(myomaCounter, category));

  row.append(numberCell, categoryCell);
  myomaList.append(row);

  markerSurfaces.forEach((surface) => createMarker(myomaCounter, category, surface));
};

renderGallery();
renderFromUrl();

addMyomaButton.addEventListener("click", addMyoma);
window.addEventListener("popstate", renderFromUrl);

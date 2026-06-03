const images = [
  "anteversio-anteflexio.png",
  "anteversio-retroflexio.png",
  "retroversio-anteflexio.png",
  "retroversio-retroflexio.png",
];

const figoCategories = ["FIGO1", "FIGO2", "FIGO3", "FIGO4", "FIGO5", "FIGO6", "FIGO7"];
const figoRangeOptionValues = figoCategories.flatMap((startCategory, startIndex) =>
  figoCategories.slice(startIndex + 1).map((endCategory) => `${startCategory}-${endCategory.replace("FIGO", "")}`),
);
const figoCategoryOptionsId = "figo-category-options";
const markerStartPositions = {
  selected: { x: 50, y: 50 },
  reference: { x: 50, y: 50 },
};
const markerDefaultSize = 58;
const markerMinSize = 16;
const markerMaxSize = 320;
const markerResizeEdgeWidth = 12;

const gallery = document.querySelector("#gallery");
const galleryView = document.querySelector("#gallery-view");
const detailView = document.querySelector("#detail-view");
const detailImage = document.querySelector("#detail-image");
const addMyomaButton = document.querySelector("#add-myoma");
const myomaList = document.querySelector("#myoma-list");
const markerSurfaces = document.querySelectorAll("[data-marker-surface]");

let myomaIdCounter = 0;

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

const getMyomaRows = () => [...myomaList.querySelectorAll("tr[data-myoma-id]")];

const getMyomaMarkers = (myomaId) =>
  document.querySelectorAll(`.myoma-marker[data-myoma-id="${myomaId}"]`);

const setMarkerLabel = (marker, myomaNumber, category) => {
  marker.textContent = category;
  marker.dataset.myomaNumber = myomaNumber;
  marker.setAttribute(
    "aria-label",
    `Міома ${myomaNumber}, ${category}. Перетягніть коло по зображенню або потягніть за край, щоб змінити розмір.`,
  );
};

const createMarker = (myomaId, myomaNumber, category, surface) => {
  const marker = document.createElement("button");
  marker.className = "myoma-marker";
  marker.type = "button";
  marker.dataset.myomaId = myomaId;
  marker.dataset.surface = surface.dataset.markerSurface;
  setMarkerLabel(marker, myomaNumber, category);

  const startPosition = markerStartPositions[marker.dataset.surface];
  updateMarkerPosition(marker, startPosition.x, startPosition.y);
  updateMarkerSize(marker, markerDefaultSize);
  makeMarkerInteractive(marker);

  surface.append(marker);
  return marker;
};

const formatFigoCategory = (value) => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return figoCategories[0];
  }

  const normalizedValue = trimmedValue
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/^FIGO(?=\d)/, "FIGO")
    .replace(/[–—]/g, "-");
  const rangeMatch = normalizedValue.match(/^(?:FIGO)?([1-7])(?:-(?:FIGO)?([1-7]))?$/);

  if (!rangeMatch) {
    return trimmedValue;
  }

  const [, startCategory, endCategory] = rangeMatch;

  if (!endCategory) {
    return `FIGO${startCategory}`;
  }

  return `FIGO${startCategory}-${endCategory}`;
};

const createFigoCategoryOptions = () => {
  const datalist = document.createElement("datalist");
  datalist.id = figoCategoryOptionsId;

  [...figoCategories, ...figoRangeOptionValues].forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    datalist.append(option);
  });

  document.body.append(datalist);
};

const updateMyomaCategory = (myomaId, myomaNumber, input) => {
  const row = input.closest("tr[data-myoma-id]");
  const currentMyomaNumber = row?.querySelector("[data-myoma-number-cell]")?.textContent ?? myomaNumber;
  const category = formatFigoCategory(input.value);

  input.value = category;

  getMyomaMarkers(myomaId).forEach((marker) => {
    setMarkerLabel(marker, currentMyomaNumber, category);
  });
};

const createCategoryInput = (myomaId, myomaNumber, initialCategory) => {
  const input = document.createElement("input");
  input.className = "figo-input";
  input.type = "text";
  input.value = initialCategory;
  input.setAttribute("list", figoCategoryOptionsId);
  input.setAttribute("aria-label", `Категорія FIGO або діапазон для утворення ${myomaNumber}`);
  input.setAttribute("placeholder", "FIGO1 або FIGO2-5");

  input.addEventListener("change", () => updateMyomaCategory(myomaId, myomaNumber, input));
  input.addEventListener("blur", () => updateMyomaCategory(myomaId, myomaNumber, input));

  return input;
};

const renumberMyomas = () => {
  getMyomaRows().forEach((row, index) => {
    const myomaNumber = index + 1;
    const category = row.querySelector(".figo-input").value;

    row.querySelector("[data-myoma-number-cell]").textContent = myomaNumber;
    row.querySelector(".figo-input").setAttribute("aria-label", `Категорія FIGO або діапазон для утворення ${myomaNumber}`);
    row.querySelector(".delete-myoma-button").setAttribute("aria-label", `Видалити утворення ${myomaNumber}`);

    getMyomaMarkers(row.dataset.myomaId).forEach((marker) => {
      setMarkerLabel(marker, myomaNumber, category);
    });
  });
};

const deleteMyoma = (row) => {
  getMyomaMarkers(row.dataset.myomaId).forEach((marker) => marker.remove());
  row.remove();
  renumberMyomas();
};

const createDeleteButton = (row, myomaNumber) => {
  const button = document.createElement("button");
  button.className = "delete-myoma-button";
  button.type = "button";
  button.textContent = "×";
  button.setAttribute("aria-label", `Видалити утворення ${myomaNumber}`);

  button.addEventListener("click", () => deleteMyoma(row));

  return button;
};

const addMyoma = () => {
  myomaIdCounter += 1;
  const myomaId = String(myomaIdCounter);
  const myomaNumber = getMyomaRows().length + 1;
  const category = figoCategories[0];

  const row = document.createElement("tr");
  row.dataset.myomaId = myomaId;

  const numberCell = document.createElement("td");
  numberCell.dataset.myomaNumberCell = "";
  numberCell.textContent = myomaNumber;

  const categoryCell = document.createElement("td");
  categoryCell.append(createCategoryInput(myomaId, myomaNumber, category));

  const actionCell = document.createElement("td");
  actionCell.className = "myoma-action-cell";
  actionCell.append(createDeleteButton(row, myomaNumber));

  row.append(numberCell, categoryCell, actionCell);
  myomaList.append(row);

  markerSurfaces.forEach((surface) => createMarker(myomaId, myomaNumber, category, surface));
};

createFigoCategoryOptions();
renderGallery();
renderFromUrl();

addMyomaButton.addEventListener("click", addMyoma);
window.addEventListener("popstate", renderFromUrl);

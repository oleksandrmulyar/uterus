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

const renderGallery = () => {
  images.forEach((fileName) => {
    const card = document.createElement("a");
    card.className = "image-card";
    card.href = `?image=${encodeURIComponent(fileName)}`;
    card.setAttribute("aria-label", `Відкрити ${getCaptionText(fileName)}`);

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

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const updateMarkerPosition = (marker, x, y) => {
  marker.dataset.x = x;
  marker.dataset.y = y;
  marker.style.left = `${x}%`;
  marker.style.top = `${y}%`;
};

const makeMarkerDraggable = (marker) => {
  marker.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    marker.setPointerCapture(event.pointerId);
    marker.classList.add("is-dragging");
  });

  marker.addEventListener("pointermove", (event) => {
    if (!marker.hasPointerCapture(event.pointerId)) {
      return;
    }

    const stage = marker.parentElement;
    const rect = stage.getBoundingClientRect();
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100);

    updateMarkerPosition(marker, x, y);
  });

  const stopDragging = (event) => {
    if (marker.hasPointerCapture(event.pointerId)) {
      marker.releasePointerCapture(event.pointerId);
    }

    marker.classList.remove("is-dragging");
  };

  marker.addEventListener("pointerup", stopDragging);
  marker.addEventListener("pointercancel", stopDragging);
};

const createMarker = (myomaNumber, category, surface) => {
  const marker = document.createElement("button");
  marker.className = "myoma-marker";
  marker.type = "button";
  marker.dataset.myomaNumber = myomaNumber;
  marker.dataset.surface = surface.dataset.markerSurface;
  marker.textContent = category;
  marker.setAttribute("aria-label", `Міома ${myomaNumber}, ${category}. Перетягніть коло по зображенню.`);

  const startPosition = markerStartPositions[marker.dataset.surface];
  updateMarkerPosition(marker, startPosition.x, startPosition.y);
  makeMarkerDraggable(marker);

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
      marker.setAttribute("aria-label", `Міома ${myomaNumber}, ${select.value}. Перетягніть коло по зображенню.`);
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

addMyomaButton.addEventListener("click", addMyoma);

const selectedImage = new URLSearchParams(window.location.search).get("image");

if (images.includes(selectedImage)) {
  renderDetail(selectedImage);
}

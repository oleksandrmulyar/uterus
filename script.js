const images = [
  "anteversio-anteflexio.png",
  "anteversio-retroflexio.png",
  "retroversio-anteflexio.png",
  "retroversio-retroflexio.png",
];

const defaultFigoText = "1";
const annotationConfigs = {
  myoma: {
    listId: "myoma-list",
    defaultText: defaultFigoText,
    inputClass: "figo-input",
    markerClass: "myoma-marker",
    numberLabel: "утворення",
    deleteLabel: "утворення",
  },
  formation: {
    listId: "formation-list",
    defaultText: "",
    placeholderText: "Назва утвору",
    defaultShape: "округле",
    inputClass: "annotation-label-input",
    markerClass: "myoma-marker formation-marker",
    numberLabel: "утвору",
    deleteLabel: "утвір",
  },
};
const shapePresets = {
  "округле": { key: "round", width: 58, height: 58 },
  "овальне": { key: "oval", width: 82, height: 52 },
  "продовгувате": { key: "elongated", width: 96, height: 38 },
  "лінійне": { key: "linear", width: 120, height: 16 },
};
const markerStartPositions = {
  selected: { x: 50, y: 50 },
  reference: { x: 50, y: 50 },
};
const markerDefaultSize = 58;
const markerMinSize = 16;
const markerMaxSize = 320;
const markerMinHeight = 8;
const markerResizeEdgeWidth = 12;
const myomaColors = [
  "#d93f5c",
  "#2f80ed",
  "#27ae60",
  "#f2994a",
  "#9b51e0",
  "#00a6a6",
  "#eb5757",
  "#6fcf97",
];

const gallery = document.querySelector("#gallery");
const galleryView = document.querySelector("#gallery-view");
const detailView = document.querySelector("#detail-view");
const detailImage = document.querySelector("#detail-image");
const addMyomaButton = document.querySelector("#add-myoma");
const addFormationButton = document.querySelector("#add-formation");
const annotationLists = Object.fromEntries(
  Object.entries(annotationConfigs).map(([type, config]) => [type, document.querySelector(`#${config.listId}`)]),
);
const markerSurfaces = document.querySelectorAll("[data-marker-surface]");
const downloadImageButtons = document.querySelectorAll("[data-download-surface]");

const annotationCounters = { myoma: 0, formation: 0 };

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


const getSafeFilePart = (value, fallback = "image") =>
  (value || fallback)
    .replace(/\.png$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґ_-]+/giu, "-")
    .replace(/^-+|-+$/g, "") || fallback;

const getFileNameFromImageSource = (source) => {
  const pathName = new URL(source, window.location.href).pathname;
  return decodeURIComponent(pathName.split("/").pop() || "image");
};

const getDownloadDatePart = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const drawRoundedRect = (context, x, y, width, height, radius) => {
  const safeRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
};

const getImageDrawBox = (image, stageWidth, stageHeight) => {
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const stageRatio = stageWidth / stageHeight;

  if (imageRatio > stageRatio) {
    const width = stageWidth;
    const height = width / imageRatio;
    return { x: 0, y: (stageHeight - height) / 2, width, height };
  }

  const height = stageHeight;
  const width = height * imageRatio;
  return { x: (stageWidth - width) / 2, y: 0, width, height };
};

const drawMarkerToCanvas = (context, marker, scale) => {
  const x = (Number(marker.dataset.x) / 100) * context.canvas.width;
  const y = (Number(marker.dataset.y) / 100) * context.canvas.height;
  const width = Number(marker.dataset.width || markerDefaultSize) * scale;
  const height = Number(marker.dataset.height || marker.dataset.width || markerDefaultSize) * scale;
  const left = x - width / 2;
  const top = y - height / 2;
  const color = marker.dataset.myomaColor || getComputedStyle(marker).getPropertyValue("--myoma-color") || "#b64f6a";

  context.save();
  context.fillStyle = color.trim();
  drawRoundedRect(context, left, top, width, height, Math.max(width, height) / 2);
  context.fill();

  const label = marker.textContent.trim();
  if (label) {
    context.fillStyle = "#fff";
    context.font = `900 ${Math.max(12, Math.min(width, height) * 0.22)}px sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, x, y, width * 0.82);
  }

  context.restore();
};

const downloadSurfaceImage = (surfaceName) => {
  const stage = document.querySelector(`[data-marker-surface="${surfaceName}"]`);
  const image = stage?.querySelector("img");

  if (!stage || !image?.complete || !image.naturalWidth || !image.naturalHeight) {
    return;
  }

  const stageRect = stage.getBoundingClientRect();
  const scale = image.naturalWidth / stageRect.width;
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = Math.round(stageRect.height * scale);

  const context = canvas.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const drawBox = getImageDrawBox(image, canvas.width, canvas.height);
  context.drawImage(image, drawBox.x, drawBox.y, drawBox.width, drawBox.height);

  stage.querySelectorAll(".myoma-marker").forEach((marker) => drawMarkerToCanvas(context, marker, scale));

  const link = document.createElement("a");
  const imageName = getSafeFilePart(getFileNameFromImageSource(image.currentSrc || image.src));
  link.download = `${imageName}-${getDownloadDatePart()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
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

const updateMarkerSize = (marker, width, height = width) => {
  const forceCircle = marker.dataset.forceCircle === "true";
  const nextWidth = clamp(width, markerMinSize, markerMaxSize);
  const nextHeight = forceCircle ? nextWidth : clamp(height, markerMinHeight, markerMaxSize);

  marker.dataset.width = nextWidth;
  marker.dataset.height = nextHeight;
  marker.dataset.size = nextWidth;
  marker.style.setProperty("--marker-width", `${nextWidth}px`);
  marker.style.setProperty("--marker-height", `${nextHeight}px`);
  marker.style.setProperty("--marker-size", `${Math.max(nextWidth, nextHeight)}px`);
};

const getShapePreset = (shape) => shapePresets[shape] ?? shapePresets["округле"];

const applyMarkerShape = (marker, shape, preserveSize = false) => {
  const preset = getShapePreset(shape);

  marker.dataset.shape = preset.key;
  marker.dataset.forceCircle = String(Boolean(preset.forceCircle));
  marker.classList.toggle("is-linear-shape", preset.key === "linear");

  if (!preserveSize) {
    updateMarkerSize(marker, preset.width, preset.height);
  } else if (preset.forceCircle) {
    const size = Math.max(Number(marker.dataset.width) || preset.width, Number(marker.dataset.height) || preset.height);
    updateMarkerSize(marker, size, size);
  }
};

const isPointerOnMarkerEdge = (marker, event) => {
  const rect = marker.getBoundingClientRect();
  const edgeDistance = Math.min(
    Math.abs(event.clientX - rect.left),
    Math.abs(event.clientX - rect.right),
    Math.abs(event.clientY - rect.top),
    Math.abs(event.clientY - rect.bottom),
  );

  return edgeDistance <= markerResizeEdgeWidth;
};

const resizeMarkerFromPointer = (marker, event) => {
  const stage = marker.parentElement;
  const stageRect = stage.getBoundingClientRect();
  const centerX = stageRect.left + (Number(marker.dataset.x) / 100) * stageRect.width;
  const centerY = stageRect.top + (Number(marker.dataset.y) / 100) * stageRect.height;
  const nextWidth = Math.abs(event.clientX - centerX) * 2;
  const nextHeight = Math.abs(event.clientY - centerY) * 2;

  if (marker.dataset.forceCircle === "true") {
    updateMarkerSize(marker, Math.hypot(event.clientX - centerX, event.clientY - centerY) * 2);
    return;
  }

  updateMarkerSize(marker, nextWidth, nextHeight);
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

const getMyomaRows = (type = "myoma") => [...annotationLists[type].querySelectorAll("tr[data-myoma-id]")];

const getMyomaMarkers = (myomaId) =>
  document.querySelectorAll(`.myoma-marker[data-myoma-id="${myomaId}"]`);

const getMyomaColor = (myomaNumber) => myomaColors[(myomaNumber - 1) % myomaColors.length];

const applyAnnotationColor = (myomaId, color, type = "myoma") => {
  getMyomaMarkers(myomaId).forEach((marker) => {
    marker.style.setProperty("--myoma-color", color);
    marker.dataset.myomaColor = color;
  });

  const row = annotationLists[type].querySelector(`tr[data-myoma-id="${myomaId}"]`);
  row?.style.setProperty("--myoma-color", color);
};

const setMyomaColor = (myomaId, myomaNumber, type = "myoma") => {
  const row = annotationLists[type].querySelector(`tr[data-myoma-id="${myomaId}"]`);
  const colorInput = row?.querySelector(".color-input");
  const color = colorInput?.value || getMyomaColor(myomaNumber);

  if (colorInput && !colorInput.value) {
    colorInput.value = color;
  }

  applyAnnotationColor(myomaId, color, type);
};

const setMarkerLabel = (marker, myomaNumber, category) => {
  marker.textContent = category;
  marker.dataset.annotationNumber = myomaNumber;

  const markerLabel = category ? `${category} ${myomaNumber}` : `Позначка ${myomaNumber}`;

  marker.setAttribute(
    "aria-label",
    `${markerLabel}. Перетягніть позначку по зображенню або потягніть за край, щоб змінити розмір і форму.`,
  );
};

const createMarker = (myomaId, myomaNumber, category, surface, type = "myoma", shape = "округле") => {
  const config = annotationConfigs[type];
  const marker = document.createElement("button");
  marker.className = config.markerClass;
  marker.type = "button";
  marker.dataset.myomaId = myomaId;
  marker.dataset.annotationType = type;
  marker.dataset.surface = surface.dataset.markerSurface;
  setMarkerLabel(marker, myomaNumber, category);

  const startPosition = markerStartPositions[marker.dataset.surface];
  updateMarkerPosition(marker, startPosition.x, startPosition.y);
  applyMarkerShape(marker, shape);
  makeMarkerInteractive(marker);

  surface.append(marker);
  return marker;
};

const formatFigoLabel = (value) => {
  const figoText = value.trim().replace(/^FIGO\s*/i, "");

  return `FIGO${figoText}`;
};


const getRowValue = (row, type) => {
  const config = annotationConfigs[type];
  const control = row.querySelector(`.${config.inputClass}`);

  return control?.value ?? config.defaultText;
};

const formatAnnotationLabel = (value, type) => {
  if (type === "myoma") {
    return formatFigoLabel(value);
  }

  return value.trim();
};

const updateAnnotationCategory = (annotationId, annotationNumber, input, type) => {
  const row = input.closest("tr[data-myoma-id]");
  const currentNumber = row?.querySelector("[data-myoma-number-cell]")?.textContent ?? annotationNumber;
  const category = formatAnnotationLabel(input.value, type);

  getMyomaMarkers(annotationId).forEach((marker) => {
    if (marker.dataset.annotationType !== type) return;
    setMarkerLabel(marker, currentNumber, category);
  });
};

const createCategoryControl = (annotationId, annotationNumber, initialText, type) => {
  const config = annotationConfigs[type];
  const input = document.createElement("input");
  input.className = config.inputClass;
  input.type = "text";
  input.value = initialText;
  input.setAttribute("aria-label", type === "myoma" ? `Текст після FIGO для утворення ${annotationNumber}` : `Назва для ${config.numberLabel} ${annotationNumber}`);
  input.setAttribute("placeholder", type === "myoma" ? "1 або 2-3" : config.placeholderText);

  input.addEventListener("input", () => updateAnnotationCategory(annotationId, annotationNumber, input, type));
  input.addEventListener("change", () => updateAnnotationCategory(annotationId, annotationNumber, input, type));

  return input;
};

const createColorControl = (annotationId, annotationNumber, type) => {
  const input = document.createElement("input");
  input.className = "color-input";
  input.type = "color";
  input.value = getMyomaColor(annotationNumber);
  input.setAttribute("aria-label", `Колір для ${annotationConfigs[type].numberLabel} ${annotationNumber}`);

  input.addEventListener("input", () => applyAnnotationColor(annotationId, input.value, type));
  input.addEventListener("change", () => applyAnnotationColor(annotationId, input.value, type));

  return input;
};

const renumberAnnotations = (type = "myoma") => {
  const config = annotationConfigs[type];

  getMyomaRows(type).forEach((row, index) => {
    const annotationNumber = index + 1;
    const category = formatAnnotationLabel(getRowValue(row, type), type);

    row.querySelector("[data-myoma-number-cell]").textContent = annotationNumber;
    row.querySelector(`.${config.inputClass}`)?.setAttribute("aria-label", type === "myoma" ? `Текст після FIGO для утворення ${annotationNumber}` : `Назва для ${config.numberLabel} ${annotationNumber}`);
    row.querySelector(".color-input")?.setAttribute("aria-label", `Колір для ${config.numberLabel} ${annotationNumber}`);
    row.querySelector(".delete-myoma-button").setAttribute("aria-label", `Видалити ${config.deleteLabel} ${annotationNumber}`);
    setMyomaColor(row.dataset.myomaId, annotationNumber, type);

    getMyomaMarkers(row.dataset.myomaId).forEach((marker) => {
      if (marker.dataset.annotationType === type) {
        setMarkerLabel(marker, annotationNumber, category);
      }
    });
  });
};

const deleteAnnotation = (row, type) => {
  getMyomaMarkers(row.dataset.myomaId).forEach((marker) => marker.remove());
  row.remove();
  renumberAnnotations(type);
};

const createDeleteButton = (row, annotationNumber, type) => {
  const config = annotationConfigs[type];
  const button = document.createElement("button");
  button.className = "delete-myoma-button";
  button.type = "button";
  button.textContent = "×";
  button.setAttribute("aria-label", `Видалити ${config.deleteLabel} ${annotationNumber}`);

  button.addEventListener("click", () => deleteAnnotation(row, type));

  return button;
};

const addAnnotation = (type = "myoma") => {
  annotationCounters[type] += 1;
  const config = annotationConfigs[type];
  const annotationId = `${type}-${annotationCounters[type]}`;
  const annotationNumber = getMyomaRows(type).length + 1;
  const initialText = config.defaultText;
  const initialShape = config.defaultShape ?? "округле";
  const category = formatAnnotationLabel(initialText, type);

  const row = document.createElement("tr");
  row.dataset.myomaId = annotationId;
  row.dataset.annotationType = type;

  const numberCell = document.createElement("td");
  numberCell.dataset.myomaNumberCell = "";
  numberCell.textContent = annotationNumber;

  const categoryCell = document.createElement("td");
  categoryCell.append(createCategoryControl(annotationId, annotationNumber, initialText, type));


  const colorCell = document.createElement("td");
  colorCell.append(createColorControl(annotationId, annotationNumber, type));

  const actionCell = document.createElement("td");
  actionCell.className = "myoma-action-cell";
  actionCell.append(createDeleteButton(row, annotationNumber, type));

  row.append(numberCell);
  row.append(categoryCell);
  row.append(colorCell, actionCell);
  annotationLists[type].append(row);

  markerSurfaces.forEach((surface) => createMarker(annotationId, annotationNumber, category, surface, type, initialShape));
  setMyomaColor(annotationId, annotationNumber, type);
};

renderGallery();
renderFromUrl();

addMyomaButton.addEventListener("click", () => addAnnotation("myoma"));
addFormationButton.addEventListener("click", () => addAnnotation("formation"));
downloadImageButtons.forEach((button) => {
  button.addEventListener("click", () => downloadSurfaceImage(button.dataset.downloadSurface));
});
window.addEventListener("popstate", renderFromUrl);

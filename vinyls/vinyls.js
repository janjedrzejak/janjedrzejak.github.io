const player = document.querySelector(".vinyl-player");
const crate = player.querySelector(".vinyl-crate");
const models = crate.querySelector(".vinyl-models");
const catalog = document.querySelector(".vinyl-catalog");
const entries = Array.from(catalog.querySelectorAll(".vinyl-list a"));
const controls = {
  previous: player.querySelector(".vinyl-previous"),
  next: player.querySelector(".vinyl-next"),
  open: player.querySelector(".vinyl-open"),
};
const metadata = Object.fromEntries(
  ["artist", "title", "year", "count"].map((key) => [key, player.querySelector(".vinyl-" + key)]),
);
const detail = {
  dialog: document.querySelector(".vinyl-detail"),
  cover: document.querySelector(".album-cover"),
  artist: document.querySelector(".album-artist"),
  title: document.getElementById("album-title"),
  year: document.querySelector(".album-year"),
  tracks: document.querySelector(".album-tracks"),
  listen: document.querySelector(".vinyl-listen"),
};
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const wrap = (index) => ((index % entries.length) + entries.length) % entries.length;
const offsetFrom = (index, position) =>
  wrap(index - position + entries.length / 2) - entries.length / 2;

let position = 0;
let target = 0;
let current = -1;
let frame = 0;
let lastFrameTime = 0;
let gesture = null;
let ignorePointerClick = false;
let returnFocus = null;

const sleeves = entries.map((entry, index) => {
  const sleeve = document.createElement("button");
  sleeve.type = "button";
  sleeve.className = "vinyl-sleeve";
  sleeve.tabIndex = -1;
  sleeve.setAttribute("aria-hidden", "true");
  sleeve.setAttribute("aria-haspopup", "dialog");
  sleeve.setAttribute("aria-label", entry.dataset.artist + " – " + entry.dataset.title);
  const fallback = document.createElement("span");
  fallback.textContent = entry.dataset.title;
  fallback.setAttribute("aria-hidden", "true");
  const image = document.createElement("img");
  image.alt = "";
  image.draggable = false;
  image.decoding = "async";
  image.addEventListener("error", () => image.classList.add("is-missing"));
  sleeve.append(fallback, image);
  sleeve.addEventListener("click", () => openAlbum(index));
  models.append(sleeve);
  return { sleeve, image, visible: false };
});

function render() {
  const active = wrap(Math.round(position));
  if (active !== current) {
    if (current >= 0) {
      sleeves[current].sleeve.classList.remove("is-current");
      sleeves[current].sleeve.tabIndex = -1;
      entries[current].removeAttribute("data-current");
    }
    current = active;
    sleeves[current].sleeve.classList.add("is-current");
    sleeves[current].sleeve.tabIndex = 0;
    entries[current].setAttribute("data-current", "");
    const { dataset } = entries[current];
    for (const key of ["artist", "title", "year"]) {
      metadata[key].textContent = dataset[key];
    }
    metadata.count.textContent = String(current + 1).padStart(2, "0") + " / " + entries.length;
  }
  for (const [i, model] of sleeves.entries()) {
    const { sleeve, image } = model;
    const offset = offsetFrom(i, position);
    const distance = Math.abs(offset);
    const visible = distance < 3;
    if (visible !== model.visible) {
      model.visible = visible;
      sleeve.classList.toggle("is-visible", visible);
      sleeve.setAttribute("aria-hidden", String(!visible));
    }
    if (!visible) continue;

    sleeve.style.setProperty("--offset", offset.toFixed(4));
    sleeve.style.setProperty("--distance", distance.toFixed(4));
    sleeve.style.setProperty("--layer", 100 - Math.round(distance * 20));
    sleeve.style.opacity = String(Math.min(1, (3 - distance) * 2));
    if (!image.hasAttribute("src")) image.src = entries[i].dataset.cover;
  }
}

function glide(destination) {
  target = destination;
  cancelAnimationFrame(frame);
  if (reducedMotion.matches || Math.abs(target - position) < .005) {
    position = target;
    render();
    frame = 0;
    return;
  }
  lastFrameTime = performance.now();
  frame = requestAnimationFrame(settle);
}

function settle(now) {
  const elapsed = Math.min(now - lastFrameTime, 40);
  lastFrameTime = now;
  position += (target - position) * (1 - Math.exp(-elapsed / 54));
  if (Math.abs(target - position) < .005) {
    position = target;
    render();
    frame = 0;
    return;
  }
  render();
  frame = requestAnimationFrame(settle);
}

function openAlbum(index) {
  const entry = entries[index];
  const { artist, title, year, cover, tracks, listenLabel } = entry.dataset;
  glide(position + offsetFrom(index, position));
  returnFocus = controls.open;
  detail.cover.classList.remove("is-missing");
  detail.cover.src = cover;
  detail.artist.textContent = artist;
  detail.title.textContent = title;
  detail.year.textContent = "Premiera " + year;
  detail.listen.href = entry.href;
  detail.listen.textContent = listenLabel;
  detail.tracks.replaceChildren(...JSON.parse(tracks).map((name) => {
    const track = document.createElement("li");
    track.textContent = name;
    return track;
  }));
  detail.dialog.showModal();
  detail.dialog.scrollTop = 0;
  window.portfolioScroll?.lock(detail.dialog);
}

function move(direction) {
  glide(Math.round(target) + direction);
}

player.hidden = false;
catalog.open = false;
render();

controls.previous.addEventListener("click", () => move(-1));
controls.next.addEventListener("click", () => move(1));
controls.open.addEventListener("click", () => openAlbum(current));
detail.cover.addEventListener("error", () => detail.cover.classList.add("is-missing"));
detail.dialog.querySelector(".vinyl-close").addEventListener("click", () => detail.dialog.close());
detail.dialog.addEventListener("close", () => {
  window.portfolioScroll?.unlock(detail.dialog);
  returnFocus?.focus({ preventScroll: true });
});
detail.dialog.addEventListener("click", (event) => {
  if (event.target !== detail.dialog) return;
  const rect = detail.dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right ||
      event.clientY < rect.top || event.clientY > rect.bottom) {
    detail.dialog.close();
  }
});

catalog.addEventListener("click", (event) => {
  const link = event.target.closest(".vinyl-list a");
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  openAlbum(entries.indexOf(link));
  returnFocus = link;
});

player.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  if (crate.contains(event.target)) controls.open.focus({ preventScroll: true });
  move(event.key === "ArrowRight" ? 1 : -1);
});

crate.addEventListener("pointerdown", (event) => {
  if (!event.isPrimary || event.button !== 0) return;
  ignorePointerClick = false;
  gesture = {
    id: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    start: position,
    step: Math.max(64, sleeves[current].sleeve.offsetWidth * .46),
    dragging: false,
  };
});

crate.addEventListener("pointermove", (event) => {
  if (!gesture || gesture.id !== event.pointerId) return;
  const dx = event.clientX - gesture.x;
  const dy = event.clientY - gesture.y;
  if (!gesture.dragging) {
    if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    gesture.dragging = true;
    gesture.start = position;
    cancelAnimationFrame(frame);
    frame = 0;
    crate.setPointerCapture(event.pointerId);
    crate.classList.add("is-dragging");
    ignorePointerClick = true;
  }
  position = target = gesture.start - dx / gesture.step;
  render();
});

function finishPointer(event) {
  if (!gesture || gesture.id !== event.pointerId) return;
  const { dragging } = gesture;
  gesture = null;
  if (!dragging) return;
  crate.classList.remove("is-dragging");
  glide(Math.round(position));
}
crate.addEventListener("pointerup", finishPointer);
crate.addEventListener("pointercancel", finishPointer);
crate.addEventListener("lostpointercapture", (event) => {
  // Touch initially captures to the cover under the finger, then to the crate.
  if (event.target === crate) finishPointer(event);
});
crate.addEventListener("click", (event) => {
  if (!ignorePointerClick || event.detail === 0) return;
  ignorePointerClick = false;
  event.preventDefault();
  event.stopPropagation();
}, { capture: true });

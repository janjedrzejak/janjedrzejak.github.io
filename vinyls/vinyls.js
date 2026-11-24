import { shelfPose } from "../shelf-pose.js";

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
let hovered = -1;
let height = 0;
let visibleWidth = 0;
const caseAspect = 1.13;
const caseThickness = .083;

const sleeves = entries.map((entry, index) => {
  const sleeve = document.createElement("button");
  sleeve.type = "button";
  sleeve.className = "cd-case";
  sleeve.dataset.index = index;
  sleeve.tabIndex = -1;
  sleeve.setAttribute("aria-hidden", "true");
  sleeve.setAttribute("aria-label", entry.dataset.artist + " – " + entry.dataset.title);
  const makeFace = (name) => {
    const face = document.createElement("span");
    face.className = "cd-face cd-" + name;
    face.setAttribute("aria-hidden", "true");
    return face;
  };
  const spine = makeFace("spine");
  const spineTitle = document.createElement("span");
  spineTitle.className = "cd-spine-title";
  spineTitle.textContent = entry.dataset.title;
  const spineArtist = document.createElement("span");
  spineArtist.className = "cd-spine-artist";
  spineArtist.textContent = entry.dataset.artist;
  spine.append(spineArtist, spineTitle);
  const front = makeFace("front");
  const fallback = document.createElement("span");
  fallback.textContent = entry.dataset.title;
  fallback.setAttribute("aria-hidden", "true");
  const image = document.createElement("img");
  image.alt = "";
  image.draggable = false;
  image.decoding = "async";
  image.addEventListener("error", () => image.classList.add("is-missing"));
  front.append(fallback, image);
  sleeve.append(spine, front, makeFace("back"), makeFace("edge"), makeFace("head"), makeFace("foot"));
  sleeve.addEventListener("click", () => {
    if (index === current) openAlbum(index);
    else {
      glide(position + offsetFrom(index, position));
      controls.open.focus({ preventScroll: true });
    }
  });
  models.append(sleeve);
  return { sleeve, image, spine, front, visible: false, lift: 0 };
});

function measure() {
  visibleWidth = crate.clientWidth;
  height = Math.min(crate.clientHeight - 54, Math.max(120, Math.min(323, visibleWidth * .66)));
  models.style.setProperty("--case-height", height + "px");
  models.style.setProperty("--case-width", height * caseAspect + "px");
  models.style.setProperty("--case-depth", height * caseThickness + "px");
  render();
}

function render(seconds = 0) {
  const active = wrap(Math.round(position));
  if (active !== current) {
    if (current >= 0) {
      sleeves[current].sleeve.classList.remove("is-current");
      sleeves[current].sleeve.tabIndex = -1;
      sleeves[current].sleeve.removeAttribute("aria-haspopup");
      entries[current].removeAttribute("data-current");
    }
    current = active;
    sleeves[current].sleeve.classList.add("is-current");
    sleeves[current].sleeve.tabIndex = 0;
    sleeves[current].sleeve.setAttribute("aria-haspopup", "dialog");
    entries[current].setAttribute("data-current", "");
    const { dataset } = entries[current];
    for (const key of ["artist", "title", "year"]) {
      metadata[key].textContent = dataset[key];
    }
    metadata.count.textContent = String(current + 1).padStart(2, "0") + " / " + entries.length;
  }
  let animatingHover = false;
  for (const [i, model] of sleeves.entries()) {
    const { sleeve, image, spine, front } = model;
    const offset = offsetFrom(i, position);
    const liftGoal = i === hovered && Math.abs(offset) > .5 ? 1 : 0;
    const liftDelta = (liftGoal - model.lift) * Math.exp(-seconds * 12);
    model.lift = reducedMotion.matches || Math.abs(liftDelta) < .005 ? liftGoal : liftGoal - liftDelta;
    animatingHover ||= model.lift !== liftGoal;
    const pose = shelfPose(offset, height, height * caseAspect, model.lift, 0, 0, caseThickness);
    const visible = Math.abs(pose.x) <= visibleWidth / 2 + height * .65;
    if (visible !== model.visible) {
      model.visible = visible;
      sleeve.classList.toggle("is-visible", visible);
      sleeve.setAttribute("aria-hidden", String(!visible));
    }
    if (!visible) continue;

    sleeve.style.transform = `perspective(2200px) translate3d(${pose.x}px, ${pose.y}px, ${pose.z}px) rotateZ(${pose.roll}deg) rotateY(${pose.yaw}deg)`;
    sleeve.style.zIndex = pose.order;
    spine.style.setProperty("--shade", pose.spineShade);
    front.style.setProperty("--shade", pose.coverShade);
    if (Math.abs(offset) < 1.5 && !image.hasAttribute("src")) image.src = entries[i].dataset.cover;
  }
  return animatingHover;
}

function wake() {
  if (frame) return;
  lastFrameTime = performance.now();
  frame = requestAnimationFrame(settle);
}

function glide(destination) {
  target = destination;
  if (reducedMotion.matches) {
    position = target;
    render();
  } else wake();
}

function settle(now) {
  frame = 0;
  const seconds = Math.min(now - lastFrameTime, 50) / 1000;
  lastFrameTime = now;
  const remaining = (target - position) * Math.exp(-seconds * 9);
  position = reducedMotion.matches || Math.abs(remaining) < .005 ? target : target - remaining;
  const animatingHover = render(seconds);
  if (position !== target || animatingHover) frame = requestAnimationFrame(settle);
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
measure();
new ResizeObserver(measure).observe(crate);

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
    step: height * .24,
    dragging: false,
  };
});

crate.addEventListener("pointermove", (event) => {
  if (!gesture || gesture.id !== event.pointerId) {
    if (event.pointerType === "mouse") {
      const next = Number(event.target.closest(".cd-case")?.dataset.index ?? -1);
      if (hovered !== next) {
        hovered = next;
        wake();
      }
    }
    return;
  }
  const dx = event.clientX - gesture.x;
  const dy = event.clientY - gesture.y;
  if (!gesture.dragging) {
    if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    gesture.dragging = true;
    hovered = -1;
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
crate.addEventListener("pointerleave", () => {
  hovered = -1;
  wake();
});
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

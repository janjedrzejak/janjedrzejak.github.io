const player = document.querySelector(".vinyl-player");
const crate = player.querySelector(".vinyl-crate");
const models = crate.querySelector(".vinyl-models");
const catalog = document.querySelector(".vinyl-catalog");
const entries = Array.from(catalog.querySelectorAll(".vinyl-list a"));
const previous = player.querySelector(".vinyl-previous");
const next = player.querySelector(".vinyl-next");
const toggle = player.querySelector(".vinyl-toggle");
const listen = player.querySelector(".vinyl-listen");
const artist = player.querySelector(".vinyl-artist");
const title = player.querySelector(".vinyl-title");
const year = player.querySelector(".vinyl-year");
const count = player.querySelector(".vinyl-count");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

let current = 0;
let opened = false;
let gesture = null;
let suppressClick = false;

const sleeves = entries.map((entry, index) => {
  const sleeve = document.createElement("button");
  sleeve.type = "button";
  sleeve.className = "vinyl-sleeve";
  const disc = document.createElement("span");
  disc.className = "vinyl-disc";
  disc.ariaHidden = "true";
  const jacket = document.createElement("span");
  jacket.className = "vinyl-jacket";
  const fallback = document.createElement("span");
  fallback.textContent = entry.dataset.title;
  fallback.ariaHidden = "true";
  const image = document.createElement("img");
  image.alt = "";
  image.draggable = false;
  image.decoding = "async";
  image.addEventListener("error", () => image.classList.add("is-missing"));
  jacket.append(fallback, image);
  sleeve.append(disc, jacket);
  sleeve.addEventListener("click", () => {
    if (index === current) setOpened(!opened);
    else select(index, true);
  });
  models.append(sleeve);
  return { sleeve, image };
});

function setOpened(value) {
  opened = value;
  crate.classList.toggle("is-open", opened);
  const label = opened ? "Wsuń winyl" : "Wysuń winyl";
  toggle.textContent = label;
  sleeves[current].sleeve.setAttribute("aria-label", label + ": " + entries[current].dataset.title);
}

function select(index, focusControls = false) {
  current = (index + entries.length) % entries.length;
  const { dataset, href } = entries[current];
  artist.textContent = dataset.artist;
  title.textContent = dataset.title;
  year.textContent = dataset.year;
  count.textContent = String(current + 1).padStart(2, "0") + " / " + entries.length;
  listen.href = href;

  for (const [i, { sleeve, image }] of sleeves.entries()) {
    const offset = ((i - current + Math.floor(entries.length / 2) + entries.length) % entries.length)
      - Math.floor(entries.length / 2);
    const visible = Math.abs(offset) <= 2;
    const active = offset === 0;
    const bounded = Math.max(-3, Math.min(3, offset));
    sleeve.style.setProperty("--offset", bounded);
    sleeve.style.setProperty("--distance", Math.abs(bounded));
    sleeve.style.setProperty("--layer", 5 - Math.abs(bounded));
    sleeve.classList.toggle("is-visible", visible);
    sleeve.classList.toggle("is-current", active);
    sleeve.ariaHidden = String(!visible);
    sleeve.tabIndex = active ? 0 : -1;
    sleeve.setAttribute("aria-label", "Wybierz album: " + entries[i].dataset.title);
    if (visible && !image.hasAttribute("src")) image.src = entries[i].dataset.cover;
    if (active) entries[i].setAttribute("aria-current", "true");
    else entries[i].removeAttribute("aria-current");
  }

  setOpened(false);
  if (focusControls) toggle.focus({ preventScroll: true });
}

player.hidden = false;
catalog.open = false;
select(0);

previous.addEventListener("click", () => select(current - 1));
next.addEventListener("click", () => select(current + 1));
toggle.addEventListener("click", () => setOpened(!opened));

catalog.addEventListener("click", (event) => {
  const link = event.target.closest(".vinyl-list a");
  if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  select(entries.indexOf(link), true);
  player.scrollIntoView({ behavior: reducedMotion.matches ? "instant" : "smooth", block: "start" });
});

player.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && opened) {
    setOpened(false);
    return;
  }
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  select(current + (event.key === "ArrowRight" ? 1 : -1), crate.contains(event.target));
});

crate.addEventListener("pointerdown", (event) => {
  if (!event.isPrimary || event.button !== 0) return;
  gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
  suppressClick = false;
});
crate.addEventListener("pointercancel", () => { gesture = null; });
crate.addEventListener("pointerup", (event) => {
  if (!gesture || event.pointerId !== gesture.id) return;
  const dx = event.clientX - gesture.x;
  const dy = event.clientY - gesture.y;
  gesture = null;
  if (Math.abs(dx) < 42 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
  suppressClick = true;
  select(current + (dx < 0 ? 1 : -1));
});
crate.addEventListener("click", (event) => {
  if (!suppressClick || event.detail === 0) return;
  suppressClick = false;
  event.preventDefault();
  event.stopPropagation();
}, { capture: true });

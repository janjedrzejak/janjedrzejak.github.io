(() => {
  "use strict";
  const doc = document.documentElement;
  const body = document.body;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const translatable = [...document.querySelectorAll("[data-en][data-pl]")];
  const rich = [...document.querySelectorAll("[data-en-html][data-pl-html]")];
  const aria = [...document.querySelectorAll("[data-en-aria][data-pl-aria]")];
  const toggles = [...document.querySelectorAll("[data-language-toggle]")];
  const menuButton = document.querySelector(".menu-toggle");
  const mobileMenu = document.getElementById("mobile-menu");
  let language = "en";

  const labels = {
    en: { switch: "Switch language to Polish", open: "Open menu", close: "Close menu" },
    pl: { switch: "Zmień język na angielski", open: "Otwórz menu", close: "Zamknij menu" }
  };

  function applyLanguage(next) {
    language = next === "pl" ? "pl" : "en";
    doc.lang = language;
    body.dataset.language = language;
    translatable.forEach(el => { el.textContent = el.dataset[language]; });
    rich.forEach(el => { el.innerHTML = el.dataset[`${language}Html`]; });
    aria.forEach(el => { el.setAttribute("aria-label", el.dataset[`${language}Aria`]); });
    const title = language === "pl" ? body.dataset.titlePl : body.dataset.titleEn;
    const description = language === "pl" ? body.dataset.descriptionPl : body.dataset.descriptionEn;
    if (title) document.title = title;
    const meta = document.querySelector('meta[name="description"]');
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    const ogLocale = document.querySelector('meta[property="og:locale"]');
    if (meta && description) meta.content = description;
    if (ogTitle && title) ogTitle.content = title;
    if (ogDescription && description) ogDescription.content = description;
    if (ogLocale) ogLocale.content = language === "pl" ? "pl_PL" : "en_US";
    toggles.forEach(button => {
      button.querySelector(".language-current").textContent = language.toUpperCase();
      button.querySelector(".language-next").textContent = language === "pl" ? "EN" : "PL";
      button.setAttribute("aria-label", labels[language].switch);
      button.title = labels[language].switch;
    });
    updateMenuLabel();
    try { localStorage.setItem("portfolio-language", language); } catch (_) {}
    document.dispatchEvent(new CustomEvent("portfolio:language", { detail: { language } }));
  }

  function updateMenuLabel() {
    const label = document.querySelector("[data-menu-label]");
    if (!label) return;
    const open = menuButton?.getAttribute("aria-expanded") === "true";
    label.textContent = open ? labels[language].close : labels[language].open;
  }

  function setMenu(open) {
    if (!menuButton || !mobileMenu) return;
    menuButton.setAttribute("aria-expanded", String(open));
    mobileMenu.setAttribute("aria-hidden", String(!open));
    mobileMenu.classList.toggle("is-open", open);
    body.classList.toggle("menu-open", open);
    updateMenuLabel();
  }

  let initial = "en";
  try {
    const saved = localStorage.getItem("portfolio-language");
    initial = saved === "pl" || saved === "en" ? saved : "en";
  } catch (_) { initial = "en"; }
  applyLanguage(initial);
  toggles.forEach(button => button.addEventListener("click", () => applyLanguage(language === "en" ? "pl" : "en")));
  menuButton?.addEventListener("click", () => setMenu(menuButton.getAttribute("aria-expanded") !== "true"));
  mobileMenu?.querySelectorAll("a").forEach(link => link.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", event => { if (event.key === "Escape") setMenu(false); });

  const year = document.querySelectorAll("[data-current-year]");
  year.forEach(el => el.textContent = String(new Date().getFullYear()));

  const header = document.querySelector("[data-header]");
  const progress = document.querySelector(".page-progress span");
  let ticking = false;
  function updateScroll() {
    const max = Math.max(doc.scrollHeight - innerHeight, 1);
    if (progress) progress.style.transform = `scaleX(${Math.min(1, Math.max(0, scrollY / max))})`;
    header?.classList.toggle("is-scrolled", scrollY > 24);
    ticking = false;
  }
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(updateScroll); } }, { passive: true });
  updateScroll();

  const reveal = [...document.querySelectorAll("[data-reveal]")];
  if (prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
    reveal.forEach(el => el.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); }
    }), { threshold: .12, rootMargin: "0px 0px -7%" });
    reveal.forEach(el => observer.observe(el));
  }

  const filterButtons = [...document.querySelectorAll("[data-filter]")];
  const filterItems = [...document.querySelectorAll("[data-categories]")];
  filterButtons.forEach(button => button.addEventListener("click", () => {
    const filter = button.dataset.filter;
    filterButtons.forEach(item => item.classList.toggle("is-active", item === button));
    filterItems.forEach(item => {
      const show = filter === "all" || item.dataset.categories.split(" ").includes(filter);
      item.hidden = !show;
    });
  }));

  const cursorDot = document.querySelector(".cursor-dot");
  const cursorRing = document.querySelector(".cursor-ring");
  if (matchMedia("(pointer:fine)").matches && cursorDot && cursorRing && !prefersReducedMotion.matches) {
    body.classList.add("has-cursor");
    let x=0,y=0,rx=0,ry=0;
    addEventListener("mousemove", e => { x=e.clientX; y=e.clientY; cursorDot.style.transform=`translate(${x}px,${y}px)`; });
    (function loop(){ rx+=(x-rx)*.14; ry+=(y-ry)*.14; cursorRing.style.transform=`translate(${rx}px,${ry}px)`; requestAnimationFrame(loop); })();
    document.querySelectorAll("a,button,.project-library-card,.blog-card").forEach(el => {
      el.addEventListener("mouseenter",()=>body.classList.add("cursor-active"));
      el.addEventListener("mouseleave",()=>body.classList.remove("cursor-active"));
    });
  }

  document.querySelectorAll("[data-cookie-settings]").forEach(button => button.addEventListener("click", () => {
    if (window.CookieConsent?.showPreferences) window.CookieConsent.showPreferences();
    else alert(language === "pl" ? "Panel ustawień plików cookie jest dostępny przez ikonę zgód na stronie." : "Cookie preferences are available through the consent icon on the page.");
  }));
})();

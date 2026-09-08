(() => {
  "use strict";
  const doc = document.documentElement;
  const body = document.body;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const menuButton = document.querySelector(".menu-toggle");
  const mobileMenu = document.getElementById("mobile-menu");
  const language = doc.lang === "pl" ? "pl" : "en";
  const labels = {
    en: { open: "Open menu", close: "Close menu" },
    pl: { open: "Otwórz menu", close: "Zamknij menu" }
  };

  function updateMenuLabel() {
    const label = document.querySelector("[data-menu-label]");
    if (!label) return;
    const open = menuButton?.getAttribute("aria-expanded") === "true";
    label.textContent = open ? labels[language].close : labels[language].open;
  }

  function setMenu(open) {
    if (!menuButton || !mobileMenu) return;
    if (open) window.portfolioScroll?.lock("menu");
    menuButton.setAttribute("aria-expanded", String(open));
    mobileMenu.setAttribute("aria-hidden", String(!open));
    mobileMenu.classList.toggle("is-open", open);
    body.classList.toggle("menu-open", open);
    if (!open) window.portfolioScroll?.unlock("menu");
    updateMenuLabel();
  }

  updateMenuLabel();
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

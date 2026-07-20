(() => {
  "use strict";

  const doc = document.documentElement;
  const body = document.body;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  // Bilingual content layer. English is kept in the HTML as the source language;
  // Polish translations are applied without a page reload and the preference is remembered.
  const polishTranslations = {
  "skip": "Przejdź do treści",
  "brand.tagline": "Cyfrowe systemy / realne rezultaty",
  "nav.expertise": "Kompetencje",
  "nav.work": "Projekty",
  "nav.experience": "Doświadczenie",
  "nav.notes": "Notatki",
  "nav.selectedWork": "Wybrane projekty",
  "nav.allProjects": "Wszystkie projekty",
  "nav.contact": "Kontakt",
  "nav.main": "Nawigacja główna",
  "nav.mobile": "Nawigacja mobilna",
  "nav.contactCta": "Porozmawiajmy <span aria-hidden=\"true\">↗</span>",
  "location": "Kraków, Polska · CET/CEST",
  "hero.status": "Otwarty na wartościowe wyzwania cyfrowe",
  "hero.eyebrow": "Digital Project Manager · Product Owner · Ekspert automatyzacji",
  "hero.title": "Łączę <span>ludzi</span>,<br>procesy i <em>technologię.</em>",
  "hero.lede": "Przekształcam złożone procesy biznesowe w połączone, zautomatyzowane i mierzalne produkty cyfrowe — od discovery i strategii produktu po integracje, procesy wspierane przez AI i adopcję na dużą skalę.",
  "hero.projectsButton": "Zobacz projekty <span aria-hidden=\"true\">↗</span>",
  "hero.cvButton": "Pobierz CV <span aria-hidden=\"true\">↓</span>",
  "hero.orbit": "ORGANIZUJ / AUTOMATYZUJ / SKALUJ",
  "hero.scroll": "Przewiń, aby odkryć",
  "hero.scrollAria": "Przejdź do sekcji wprowadzającej",
  "marquee": "<span>PRODUCT OWNERSHIP</span><i>◆</i><span>AUTOMATYZACJA PROCESÓW</span><i>◆</i><span>AI I UCZENIE MASZYNOWE</span><i>◆</i><span>INTEGRACJE SYSTEMÓW</span><i>◆</i><span>TRANSFORMACJA CYFROWA</span><i>◆</i><span>PRODUCT OWNERSHIP</span><i>◆</i><span>AUTOMATYZACJA PROCESÓW</span><i>◆</i><span>AI I UCZENIE MASZYNOWE</span><i>◆</i><span>INTEGRACJE SYSTEMÓW</span><i>◆</i><span>TRANSFORMACJA CYFROWA</span><i>◆</i>",
  "profile.index": "01 / PROFIL",
  "profile.title": "Strategia bez realizacji to prezentacja.<br>Realizacja bez strategii to chaos.",
  "profile.portraitRole": "DIGITAL PROJECT MANAGER / PRODUCT OWNER",
  "profile.p1": "Działam na styku biznesu, produktu i technologii. Wyjaśniam problem, angażuję właściwe osoby i buduję sposób realizacji, który przekłada intencje na mierzalną zmianę.",
  "profile.p2": "Moje doświadczenie obejmuje enterprise IT, eCommerce B2B, product ownership, automatyzację procesów i rozwiązania AI. Dzięki temu dostrzegam zarówno architekturę, jak i wyzwania związane z adopcją — bo rozwiązanie tworzy wartość dopiero wtedy, gdy ludzie rzeczywiście z niego korzystają.",
  "profile.linkedinButton": "Zobacz mój profil na LinkedIn <span aria-hidden=\"true\">↗</span>",
  "profile.model": "MODEL DZIAŁANIA",
  "profile.active": "STATUS: AKTYWNY",
  "profile.input": "WEJŚCIE / 01",
  "profile.problem": "Problem biznesowy",
  "profile.problemText": "Cele, ograniczenia, użytkownicy, ryzyka i hipotezy wartości.",
  "profile.system": "SYSTEM / 02",
  "profile.productProcess": "Produkt i proces",
  "profile.productProcessText": "Discovery, priorytetyzacja, projektowanie procesu i koordynacja realizacji.",
  "profile.output": "REZULTAT / 03",
  "profile.solution": "Przyjęte rozwiązanie",
  "profile.solutionText": "Zintegrowana technologia, mierzalne rezultaty i ścieżka skalowania.",
  "expertise.index": "02 / KOMPETENCJE",
  "expertise.title": "Od rozproszonych procesów<br>do połączonego ekosystemu.",
  "expertise.intro": "Łączę myślenie produktowe z praktycznym rozumieniem technologii. Celem nie jest więcej narzędzi — lecz lepszy przepływ, trafniejsze decyzje i mniej tarcia.",
  "expertise.digital.title": "Produkty cyfrowe i transformacja",
  "expertise.digital.text": "Wizja produktu, roadmapy, discovery, współpraca z interesariuszami, zarządzanie backlogiem i kompleksowa realizacja inicjatyw cyfrowych w środowisku enterprise.",
  "expertise.digital.tag1": "Product ownership",
  "expertise.digital.tag2": "Realizacja Agile",
  "expertise.digital.tag3": "Adopcja zmiany",
  "expertise.automation.title": "Automatyzacja i orkiestracja",
  "expertise.automation.text": "Projektowanie niezawodnych procesów, które eliminują powtarzalną pracę, łączą zespoły i zapewniają przejrzysty przepływ danych między systemami biznesowymi.",
  "expertise.ai.title": "AI i uczenie maszynowe",
  "expertise.ai.text": "Przekształcanie danych i dokumentów we wsparcie decyzji z wykorzystaniem systemów RAG, wyszukiwania wektorowego, procesów predykcyjnych i odpowiedzialnego wdrażania AI.",
  "expertise.ai.tag2": "Bazy wektorowe",
  "expertise.ai.tag3": "Procesy ML",
  "expertise.integrations.title": "Systemy i integracje",
  "expertise.integrations.text": "Integracje oparte na API, orkiestracja danych i architektura rozwiązań, dzięki którym informacje niezawodnie przepływają między platformami i ludźmi.",
  "work.index": "03 / WYBRANE PROJEKTY",
  "work.title": "Systemy projektowane pod presją<br>realnych procesów operacyjnych.",
  "work.allButton": "Zobacz wszystkie projekty <span aria-hidden=\"true\">↗</span>",
  "work.rag.type": "AI / SYSTEM WIEDZY",
  "work.rag.title": "Firmowy agent RAG",
  "work.rag.text": "Asystent wiedzy wykorzystujący Retrieval-Augmented Generation, zaprojektowany w celu ułatwienia dostępu do informacji wewnętrznych, zwiększenia trafności odpowiedzi i ograniczenia problemów związanych z rozproszoną dokumentacją.",
  "work.rag.tag1": "Wyszukiwanie informacji",
  "work.rag.tag2": "Wyszukiwanie wektorowe",
  "work.common.automation": "Automatyzacja",
  "work.ml.visual": "PRZEWIDUJ / UCZ SIĘ / ADAPTUJ",
  "work.ml.type": "ML / WSPARCIE DECYZJI",
  "work.ml.title": "Platforma predykcyjna Machine Learning",
  "work.ml.text": "Środowisko predykcyjne wspierające decyzje oparte na danych w obszarach R&D, marketingu i rozwoju produktów — od danych wejściowych modelu po użyteczny insight biznesowy.",
  "work.ml.tag1": "Uczenie maszynowe",
  "work.ml.tag2": "Produkty danych",
  "work.flow.form": "FORMULARZ",
  "work.flow.report": "RAPORT",
  "work.flow.alert": "ALERT",
  "work.flow.action": "DZIAŁANIE",
  "work.flow.type": "AUTOMATYZACJA / INTEGRACJA",
  "work.flow.title": "Automatyzacja procesów enterprise",
  "work.flow.text": "Połączone procesy przenoszące dane między systemami, automatyzujące powtarzalne działania i pokazujące wyjątki, zanim staną się problemem biznesowym.",
  "work.commerce.type": "PRODUKT / ECOMMERCE B2B",
  "work.commerce.title": "Optymalizacja platformy B2B",
  "work.commerce.text": "Usprawnienia ścieżki klienta i platformy ukierunkowane na adopcję, konwersję, operacje contentowe oraz skalowalne doświadczenia w wielu krajach.",
  "work.commerce.tag3": "Wiele rynków",
  "method.index": "04 / METODA",
  "method.title": "Najpierw klarowność.<br>Potem tempo.",
  "method.intro": "W moim podejściu strategia, architektura i adopcja pozostają częścią tej samej rozmowy.",
  "method.frame.title": "Zdefiniuj",
  "method.frame.text": "Określ rezultat, potrzebę użytkownika, ograniczenia, założenia i odpowiedzialność za decyzje.",
  "method.map.title": "Zmapuj",
  "method.map.text": "Zwizualizuj obecny proces, systemy, przekazania, dane i źródła tarcia.",
  "method.prioritize.title": "Ustal priorytety",
  "method.prioritize.text": "Wybierz najmniejszą wartościową ścieżkę, uwzględniając wpływ, wysiłek, ryzyko i potencjał uczenia się.",
  "method.build.title": "Zbuduj i połącz",
  "method.build.text": "Dostarczaj iteracyjnie, integruj odpowiedzialnie i zachowuj widoczność niezawodności operacyjnej.",
  "method.adopt.title": "Wdrażaj i ulepszaj",
  "method.adopt.text": "Mierz wykorzystanie, usuwaj bariery adopcji i rozwijaj produkt na podstawie realnego feedbacku.",
  "experience.index": "05 / DOŚWIADCZENIE",
  "experience.title": "Od operacji do strategii.",
  "experience.cvButton": "Pełne CV <span aria-hidden=\"true\">↓</span>",
  "experience.now": "2026 — OBECNIE",
  "experience.holcim": "Prowadzenie inicjatyw cyfrowych i wdrożeń systemów wspierających kluczowe procesy biznesowe, ze szczególnym uwzględnieniem architektury przepływu danych, integracji, automatyzacji i odpowiedzialnych rozwiązań wykorzystujących AI.",
  "experience.lindeProduct": "Odpowiedzialność za cyfrowe platformy B2B, operacje contentowe w wielu krajach i adopcję automatyzacji — z połączeniem zarządzania produktem, CRO, współpracy z interesariuszami i realizacji w skali enterprise.",
  "experience.lindeIT": "Realizacja projektów infrastrukturalnych, wsparcie aplikacji enterprise i migracje technologiczne — fundament operacyjny późniejszej pracy produktowej i transformacyjnej.",
  "experience.media.title": "Twórca wizualny i specjalista mediów",
  "experience.media.company": "Telewizja, broadcast i media cyfrowe",
  "experience.media.text": "Pracowałem z wideo, kamerą i fotoreportażem. To doświadczenie nadal wpływa na sposób, w jaki komunikuję złożone zagadnienia, buduję narrację i wspieram porozumienie interesariuszy.",
  "credentials.selected": "WYBRANE CERTYFIKATY",
  "credentials.active": "CIĄGŁY ROZWÓJ / AKTYWNY",
  "contact.index": "06 / KONTAKT",
  "contact.eyebrow": "Masz proces, który powinien działać lepiej?",
  "contact.title": "Zamieńmy tarcie<br>w płynny proces.",
  "contact.text": "Interesują mnie inicjatywy cyfrowe, w których myślenie produktowe, automatyzacja i integracje systemów mogą stworzyć rzeczywistą przewagę operacyjną.",
  "contact.email": "E-mail",
  "contact.phone": "Telefon",
  "contact.orbit": "ZBUDUJMY COŚ UŻYTECZNEGO • ",
  "footer.projects": "Projekty",
  "footer.privacy": "Prywatność",
  "footer.cookies": "Pliki cookie",
  "footer.location": "KRAKÓW / POLSKA",
  "language.label": "Język",
  "language.selector": "Wybór języka"
};

  const plainTranslationElements = [...document.querySelectorAll("[data-i18n]")];
  const richTranslationElements = [...document.querySelectorAll("[data-i18n-html]")];
  const ariaTranslationElements = [...document.querySelectorAll("[data-i18n-aria]")];
  const plainOriginals = new Map(plainTranslationElements.map((element) => [element, element.textContent]));
  const richOriginals = new Map(richTranslationElements.map((element) => [element, element.innerHTML]));
  const ariaOriginals = new Map(ariaTranslationElements.map((element) => [element, element.getAttribute("aria-label") || ""]));
  const metaDescription = document.querySelector('meta[name="description"]');
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDescription = document.querySelector('meta[property="og:description"]');
  const ogLocale = document.querySelector('meta[property="og:locale"]');
  const ogLocaleAlternate = document.querySelector('meta[property="og:locale:alternate"]');
  const languageToggles = [...document.querySelectorAll("[data-language-toggle]")];
  const menuLabel = document.querySelector("[data-menu-label]");
  let currentLanguage = "en";
  let splitTextReady = false;

  const pageMeta = {
    en: {
      title: "Jan Jędrzejak — Digital Project Manager, Product Owner & Automation Expert",
      description: "Portfolio of Jan Jędrzejak — Digital Project Manager and Product Owner specializing in workflow automation, AI, machine learning, system integrations and digital transformation.",
      ogTitle: "Jan Jędrzejak — Digital Project Manager & Automation Expert",
      ogDescription: "I turn complex business processes into connected, automated and measurable digital products."
    },
    pl: {
      title: "Jan Jędrzejak — Digital Project Manager, Product Owner i ekspert automatyzacji",
      description: "Portfolio Jana Jędrzejaka — Digital Project Managera i Product Ownera specjalizującego się w automatyzacji procesów, AI, machine learning, integracjach systemów i transformacji cyfrowej.",
      ogTitle: "Jan Jędrzejak — Digital Project Manager i ekspert automatyzacji",
      ogDescription: "Przekształcam złożone procesy biznesowe w połączone, zautomatyzowane i mierzalne produkty cyfrowe."
    }
  };

  const interfaceLabels = {
    en: {
      openMenu: "Open menu",
      closeMenu: "Close menu",
      switchLanguage: "Switch language to Polish"
    },
    pl: {
      openMenu: "Otwórz menu",
      closeMenu: "Zamknij menu",
      switchLanguage: "Zmień język na angielski"
    }
  };

  function updateMenuLabel(open = document.querySelector(".menu-toggle")?.getAttribute("aria-expanded") === "true") {
    if (menuLabel) menuLabel.textContent = open ? interfaceLabels[currentLanguage].closeMenu : interfaceLabels[currentLanguage].openMenu;
  }

  function updateLanguageControls() {
    const isPolish = currentLanguage === "pl";
    languageToggles.forEach((button) => {
      const current = button.querySelector(".language-current");
      const next = button.querySelector(".language-next");
      if (current) current.textContent = isPolish ? "PL" : "EN";
      if (next) next.textContent = isPolish ? "EN" : "PL";
      button.setAttribute("aria-label", interfaceLabels[currentLanguage].switchLanguage);
      button.setAttribute("title", interfaceLabels[currentLanguage].switchLanguage);
    });
  }

  function applyLanguage(language, shouldResplit = false) {
    currentLanguage = language === "pl" ? "pl" : "en";
    const usePolish = currentLanguage === "pl";

    plainTranslationElements.forEach((element) => {
      const key = element.dataset.i18n;
      element.textContent = usePolish ? (polishTranslations[key] ?? plainOriginals.get(element)) : plainOriginals.get(element);
    });

    richTranslationElements.forEach((element) => {
      const key = element.dataset.i18nHtml;
      element.innerHTML = usePolish ? (polishTranslations[key] ?? richOriginals.get(element)) : richOriginals.get(element);
    });

    ariaTranslationElements.forEach((element) => {
      const key = element.dataset.i18nAria;
      element.setAttribute("aria-label", usePolish ? (polishTranslations[key] ?? ariaOriginals.get(element)) : ariaOriginals.get(element));
    });

    const meta = pageMeta[currentLanguage];
    document.title = meta.title;
    if (metaDescription) metaDescription.setAttribute("content", meta.description);
    if (ogTitle) ogTitle.setAttribute("content", meta.ogTitle);
    if (ogDescription) ogDescription.setAttribute("content", meta.ogDescription);
    if (ogLocale) ogLocale.setAttribute("content", usePolish ? "pl_PL" : "en_US");
    if (ogLocaleAlternate) ogLocaleAlternate.setAttribute("content", usePolish ? "en_US" : "pl_PL");

    doc.lang = currentLanguage;
    doc.dataset.language = currentLanguage;
    updateLanguageControls();
    updateMenuLabel();

    try {
      localStorage.setItem("portfolio-language", currentLanguage);
    } catch (error) {
      // Storage may be blocked in private browsing; language switching still works.
    }

    if (shouldResplit && splitTextReady) {
      document.querySelectorAll("[data-split]").forEach((element) => {
        splitText(element);
        element.classList.add("is-visible");
      });
    }
  }

  // Dynamic year
  const year = document.getElementById("current-year");
  if (year) year.textContent = String(new Date().getFullYear());

  // Use the existing local portrait and gracefully fall back to the public GitHub avatar.
  const portraitImage = document.querySelector(".profile-portrait img");
  portraitImage?.addEventListener("error", () => {
    if (portraitImage.dataset.fallbackApplied === "true") return;
    portraitImage.dataset.fallbackApplied = "true";
    portraitImage.src = "https://avatars.githubusercontent.com/u/43744269?v=4";
  });

  // Header, progress and parallax are updated in one animation frame.
  const header = document.querySelector("[data-header]");
  const progress = document.querySelector(".page-progress span");
  const parallaxItems = [...document.querySelectorAll("[data-parallax]")];
  let scrollY = window.scrollY;
  let ticking = false;

  function updateScrollUI() {
    const maxScroll = Math.max(doc.scrollHeight - window.innerHeight, 1);
    const ratio = clamp(scrollY / maxScroll, 0, 1);
    if (progress) progress.style.transform = `scaleX(${ratio})`;
    if (header) header.classList.toggle("is-scrolled", scrollY > 24);

    if (!prefersReducedMotion.matches) {
      parallaxItems.forEach((item) => {
        const speed = Number(item.dataset.parallax || 0);
        item.style.transform = `translate3d(0, ${scrollY * speed}px, 0)`;
      });
    }
    ticking = false;
  }

  window.addEventListener("scroll", () => {
    scrollY = window.scrollY;
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateScrollUI);
    }
  }, { passive: true });
  updateScrollUI();

  // Accessible mobile menu.
  const menuButton = document.querySelector(".menu-toggle");
  const mobileMenu = document.getElementById("mobile-menu");

  function setMenu(open) {
    if (!menuButton || !mobileMenu) return;
    menuButton.setAttribute("aria-expanded", String(open));
    mobileMenu.setAttribute("aria-hidden", String(!open));
    mobileMenu.classList.toggle("is-open", open);
    body.classList.toggle("menu-open", open);
    updateMenuLabel(open);
  }

  menuButton?.addEventListener("click", () => {
    setMenu(menuButton.getAttribute("aria-expanded") !== "true");
  });
  mobileMenu?.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenu(false);
  });

  // Split display text into individually animated words while preserving markup.
  function splitText(element) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
    });
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    let index = 0;
    textNodes.forEach((node) => {
      const fragment = document.createDocumentFragment();
      const parts = node.textContent.split(/(\s+)/);
      parts.forEach((part) => {
        if (!part.trim()) {
          fragment.appendChild(document.createTextNode(part));
          return;
        }
        const outer = document.createElement("span");
        outer.className = "word";
        outer.style.setProperty("--word-index", index++);
        const inner = document.createElement("span");
        inner.textContent = part;
        outer.appendChild(inner);
        fragment.appendChild(outer);
      });
      node.parentNode.replaceChild(fragment, node);
    });
  }


let initialLanguage = "en";
try {
  const savedLanguage = localStorage.getItem("portfolio-language");
  initialLanguage = savedLanguage === "pl" || savedLanguage === "en" ? savedLanguage : "en";
} catch (error) {
  initialLanguage = "en";
}

applyLanguage(initialLanguage);
  document.querySelectorAll("[data-split]").forEach(splitText);
  splitTextReady = true;

  languageToggles.forEach((button) => {
    button.addEventListener("click", () => {
      applyLanguage(currentLanguage === "pl" ? "en" : "pl", true);
    });
  });

  // Intersection-based reveal animations.
  const revealItems = [...document.querySelectorAll("[data-reveal], [data-split]")];
  if (prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8%" });
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  // Pointer-reactive background and custom cursor.
  const cursorDot = document.querySelector(".cursor-dot");
  const cursorRing = document.querySelector(".cursor-ring");
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;

  if (finePointer && !prefersReducedMotion.matches && cursorDot && cursorRing) {
    body.classList.add("has-cursor");
    window.addEventListener("pointermove", (event) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
      doc.style.setProperty("--mouse-x", `${(mouseX / window.innerWidth) * 100}%`);
      doc.style.setProperty("--mouse-y", `${(mouseY / window.innerHeight) * 100}%`);
      cursorDot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
    }, { passive: true });

    const cursorLoop = () => {
      ringX += (mouseX - ringX) * 0.14;
      ringY += (mouseY - ringY) * 0.14;
      cursorRing.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      requestAnimationFrame(cursorLoop);
    };
    cursorLoop();

    document.querySelectorAll("a, button, [data-tilt], [data-project]").forEach((element) => {
      element.addEventListener("pointerenter", () => body.classList.add("cursor-active"));
      element.addEventListener("pointerleave", () => body.classList.remove("cursor-active"));
    });
  }

  // Magnetic interaction remains subtle and is disabled for touch/reduced motion.
  if (finePointer && !prefersReducedMotion.matches) {
    document.querySelectorAll(".magnetic").forEach((element) => {
      element.addEventListener("pointermove", (event) => {
        const rect = element.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;
        element.style.transform = `translate3d(${x * 0.12}px, ${y * 0.12}px, 0)`;
      });
      element.addEventListener("pointerleave", () => {
        element.style.transform = "translate3d(0, 0, 0)";
      });
    });

    document.querySelectorAll("[data-tilt]").forEach((element) => {
      element.addEventListener("pointermove", (event) => {
        const rect = element.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        element.style.transform = `rotateX(${py * -2.6}deg) rotateY(${px * 3.8}deg)`;
      });
      element.addEventListener("pointerleave", () => {
        element.style.transform = "rotateX(0) rotateY(0)";
      });
    });

    document.querySelectorAll("[data-project]").forEach((card) => {
      const visual = card.querySelector(".project-visual");
      card.addEventListener("pointermove", (event) => {
        if (!visual) return;
        const rect = visual.getBoundingClientRect();
        visual.style.setProperty("--px", `${clamp(event.clientX - rect.left, 0, rect.width)}px`);
        visual.style.setProperty("--py", `${clamp(event.clientY - rect.top, 0, rect.height)}px`);
      });
    });
  }

  // Lightweight generative network canvas. No external animation library required.
  const canvas = document.getElementById("network-canvas");
  const context = canvas?.getContext("2d", { alpha: true });
  let nodes = [];
  let canvasWidth = 0;
  let canvasHeight = 0;
  let canvasFrame = 0;
  let canvasVisible = true;
  let dpr = 1;

  function nodeCount() {
    const area = canvasWidth * canvasHeight;
    return clamp(Math.round(area / 26000), 34, 78);
  }

  function createNodes() {
    nodes = Array.from({ length: nodeCount() }, (_, index) => ({
      x: Math.random() * canvasWidth,
      y: Math.random() * canvasHeight,
      vx: (Math.random() - 0.5) * 0.17,
      vy: (Math.random() - 0.5) * 0.17,
      radius: index % 11 === 0 ? 2.2 : 1.1,
      phase: Math.random() * Math.PI * 2
    }));
  }

  function resizeCanvas() {
    if (!canvas || !context) return;
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 1.7);
    canvasWidth = Math.max(rect.width, 1);
    canvasHeight = Math.max(rect.height, 1);
    canvas.width = Math.round(canvasWidth * dpr);
    canvas.height = Math.round(canvasHeight * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    createNodes();
  }

  function drawNetwork(time = 0) {
    if (!context || !canvas || !canvasVisible) return;
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    const connectionDistance = Math.min(150, canvasWidth * 0.12);

    nodes.forEach((node, index) => {
      if (!prefersReducedMotion.matches) {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < -10 || node.x > canvasWidth + 10) node.vx *= -1;
        if (node.y < -10 || node.y > canvasHeight + 10) node.vy *= -1;
      }

      if (finePointer) {
        const dx = mouseX - node.x;
        const dy = mouseY - node.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 190 && distance > 1) {
          const force = (190 - distance) / 190;
          node.x -= (dx / distance) * force * 0.35;
          node.y -= (dy / distance) * force * 0.35;
        }
      }

      for (let j = index + 1; j < nodes.length; j++) {
        const other = nodes[j];
        const dx = node.x - other.x;
        const dy = node.y - other.y;
        const distance = Math.hypot(dx, dy);
        if (distance > connectionDistance) continue;
        const opacity = (1 - distance / connectionDistance) * 0.17;
        context.beginPath();
        context.moveTo(node.x, node.y);
        context.lineTo(other.x, other.y);
        context.strokeStyle = `rgba(112, 231, 255, ${opacity})`;
        context.lineWidth = 0.65;
        context.stroke();
      }

      const pulse = prefersReducedMotion.matches ? 1 : 0.76 + Math.sin(time * 0.001 + node.phase) * 0.24;
      context.beginPath();
      context.arc(node.x, node.y, node.radius * pulse, 0, Math.PI * 2);
      context.fillStyle = index % 11 === 0 ? "rgba(184,255,92,.8)" : "rgba(112,231,255,.52)";
      context.fill();
    });

    if (!prefersReducedMotion.matches) canvasFrame = requestAnimationFrame(drawNetwork);
  }

  if (canvas && context) {
    resizeCanvas();
    drawNetwork();
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      canvasVisible = entry.isIntersecting;
      if (canvasVisible && !prefersReducedMotion.matches && !canvasFrame) canvasFrame = requestAnimationFrame(drawNetwork);
      if (!canvasVisible && canvasFrame) {
        cancelAnimationFrame(canvasFrame);
        canvasFrame = 0;
      }
    });
    visibilityObserver.observe(canvas);
  }

  // Keep behavior correct if reduced-motion preference changes while the page is open.
  prefersReducedMotion.addEventListener?.("change", () => window.location.reload());
})();

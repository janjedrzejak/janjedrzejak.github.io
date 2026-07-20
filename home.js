(() => {
  "use strict";

  const doc = document.documentElement;
  const body = document.body;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  // Dynamic year
  const year = document.getElementById("current-year");
  if (year) year.textContent = String(new Date().getFullYear());

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
    const label = menuButton.querySelector(".sr-only");
    if (label) label.textContent = open ? "Close menu" : "Open menu";
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

  document.querySelectorAll("[data-split]").forEach(splitText);

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

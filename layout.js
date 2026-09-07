(() => {
  "use strict";

  // All overlays share one lock so closing one cannot unlock another.
  const owners = new Set();
  const html = document.documentElement;
  let savedScroll = null;

  window.portfolioScroll = Object.freeze({
    lock(owner) {
      if (owners.has(owner)) return;
      owners.add(owner);
      if (owners.size > 1) return;

      savedScroll = {
        x: window.scrollX,
        y: window.scrollY,
        behavior: html.style.getPropertyValue("scroll-behavior"),
        priority: html.style.getPropertyPriority("scroll-behavior")
      };
      html.style.setProperty("scroll-behavior", "auto", "important");
      html.style.setProperty("--locked-scroll-y", `${-savedScroll.y}px`);
      html.classList.add("page-scroll-locked");
    },
    unlock(owner) {
      if (!owners.delete(owner) || owners.size || !savedScroll) return;
      const previous = savedScroll;
      savedScroll = null;
      html.classList.remove("page-scroll-locked");
      html.style.removeProperty("--locked-scroll-y");
      // Restore after removing the fixed body, with no smooth-scroll animation.
      window.scrollTo({ left: previous.x, top: previous.y, behavior: "instant" });
      if (previous.behavior) {
        html.style.setProperty("scroll-behavior", previous.behavior, previous.priority);
      } else {
        html.style.removeProperty("scroll-behavior");
      }
    }
  });
})();

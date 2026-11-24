import type { ShelfController } from "../animation/ShelfController";

export function bindInputs(root: HTMLElement, controller: ShelfController) {
  const track = root.querySelector<HTMLElement>(".track")!;
  const abort = new AbortController(),
    options = { signal: abort.signal };
  let down: {
    id: number;
    x: number;
    y: number;
    start: number;
    axis: "" | "x" | "y";
  } | null = null;
  let suppressClick = false,
    snapTimer = 0;
  const slotAt = (element: EventTarget | null) => {
    const book =
      element instanceof Element
        ? element.closest<HTMLElement>("[data-slot]")
        : null;
    return book ? Number(book.dataset.slot) : -1;
  };
  const end = (e: PointerEvent, cancelled: boolean) => {
    if (!down || e.pointerId !== down.id) return;
    suppressClick = cancelled || down.axis !== "";
    if (down.axis === "x") {
      controller.drag = false;
      controller.go(Math.round(controller.target));
    }
    if (track.hasPointerCapture(e.pointerId))
      track.releasePointerCapture(e.pointerId);
    down = null;
  };
  track.addEventListener(
    "pointerdown",
    (e) => {
      if (!controller.onShelf || !e.isPrimary || e.button !== 0) return;
      clearTimeout(snapTimer);
      suppressClick = false;
      down = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        start: controller.target,
        axis: "",
      };
    },
    options,
  );
  window.addEventListener(
    "pointermove",
    (e) => {
      if (!controller.onShelf) return;
      if (down && down.id === e.pointerId) {
        const dx = e.clientX - down.x,
          dy = e.clientY - down.y;
        if (
          !down.axis &&
          Math.max(Math.abs(dx), Math.abs(dy)) >
            (e.pointerType === "mouse" ? 5 : 8)
        ) {
          down.axis = Math.abs(dx) > Math.abs(dy) * 1.12 ? "x" : "y";
          if (down.axis === "x") {
            controller.drag = true;
            track.setPointerCapture(e.pointerId);
          }
        }
        if (down.axis === "x")
          controller.go(down.start - dx / controller.pitchWidth);
      }
      if (e.pointerType === "mouse" && track.contains(e.target as Node))
        controller.hover(e.clientX, e.clientY, slotAt(e.target));
    },
    options,
  );
  window.addEventListener("pointerup", (e) => end(e, false), options);
  window.addEventListener("pointercancel", (e) => end(e, true), options);
  track.addEventListener("pointerleave", () => controller.leave(), options);
  track.addEventListener(
    "click",
    (e) => {
      if (suppressClick) {
        suppressClick = false;
        return;
      }
      const slot = slotAt(e.target);
      if (slot >= 0) controller.clickSlot(slot);
    },
    options,
  );
  track.addEventListener(
    "wheel",
    (e) => {
      if (!controller.onShelf || e.ctrlKey) return;
      const delta =
        Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      e.preventDefault();
      clearTimeout(snapTimer);
      const pixels =
        delta *
        (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? track.clientWidth : 1);
      controller.go(controller.target + pixels / (2 * controller.pitchWidth));
      snapTimer = window.setTimeout(
        () => controller.go(Math.round(controller.target)),
        160,
      );
    },
    { ...options, passive: false },
  );
  window.addEventListener(
    "keydown",
    (e) => {
      if (
        e.altKey ||
        e.metaKey ||
        e.ctrlKey ||
        e.isComposing ||
        document.body.classList.contains("menu-open") ||
        (e.target instanceof Element && e.target.closest("[data-books-chrome]"))
      )
        return;
      if (!controller.onShelf) {
        if (e.key === "Escape") {
          e.preventDefault();
          controller.close();
        }
        if (e.key === "Tab") {
          const items = Array.from(
            root.querySelectorAll<HTMLElement>(
              "#book-details button,#book-details a[href]",
            ),
          );
          const boundary = e.shiftKey ? items[0] : items.at(-1);
          if (document.activeElement === boundary) {
            e.preventDefault();
            (e.shiftKey ? items.at(-1) : items[0])?.focus();
          }
        }
        return;
      }
      if (
        (e.target as Element)?.closest(
          'input,select,textarea,[contenteditable="true"]',
        )
      )
        return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        controller.relative(e.key === "ArrowRight" ? 1 : -1);
      }
      if (
        e.key === "Enter" &&
        (document.activeElement === document.body ||
          document.activeElement === root)
      ) {
        e.preventDefault();
        controller.openCurrent();
      }
    },
    options,
  );
  return () => {
    clearTimeout(snapTimer);
    abort.abort();
  };
}

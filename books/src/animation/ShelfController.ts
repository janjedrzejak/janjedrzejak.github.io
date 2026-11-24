import { books, pageTitle, shelfTitle, wraps } from "../data/catalog";
import { approach, clamp, signedOffset, wrap } from "../geometry/pose";
import { ShelfScene } from "../geometry/ShelfScene";
import { DetailMotion } from "./DetailMotion";
import { bindInputs } from "../interaction/bindInputs";

export type Phase = "idle" | "browsing" | "opening" | "details" | "closing";
export class ShelfController {
  phase: Phase = "idle";
  active = -1;
  position = wraps ? books.length : 0;
  target = this.position;
  drag = false;
  private scene: ShelfScene;
  private running = 0;
  private previous = 0;
  private disposed = false;
  private dirty = true;
  private pendingOpen: number | null = null;
  private detail: DetailMotion | null = null;
  private detailIndex = -1;
  private observer: ResizeObserver;
  private reduced = matchMedia("(prefers-reduced-motion: reduce)");
  private unbind: () => void;
  private cursor: HTMLElement;
  private background: HTMLElement[];
  private pointer = {
    x: 0,
    y: 0,
    inside: false,
    hover: -1,
    drawX: 0,
    drawY: 0,
    initialized: false,
  };
  private pitch = 0;
  private yaw = 0;
  private returnFocus: HTMLElement | null = null;
  private localEntry = false;
  private pendingRoute = false;
  constructor(
    private root: HTMLElement,
    private renderDetail: (index: number | null) => void,
    private notify: (index: number) => void,
  ) {
    this.scene = new ShelfScene(
      root.querySelector(".fit")!,
      root.querySelector(".stage")!,
    );
    this.cursor = root.querySelector(".shelf-cursor")!;
    this.background = [
      root.querySelector<HTMLElement>(".library-shell")!,
      ...document.querySelectorAll<HTMLElement>("[data-books-chrome]"),
    ];
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(this.scene.fit);
    this.reduced.addEventListener("change", this.motionPreference);
    this.unbind = bindInputs(root, this);
    window.addEventListener("popstate", this.readRoute);
    window.addEventListener("hashchange", this.readRoute);
    this.root.dataset.phase = "idle";
    this.scene.draw(this.position, -1, 0, 0, 0, true);
    this.updateActive();
    queueMicrotask(() => {
      if (!this.disposed) this.readRoute(true);
    });
  }
  get onShelf() {
    return this.phase === "idle" || this.phase === "browsing";
  }
  get pitchWidth() {
    return this.scene.height * 0.18;
  }
  private phaseTo(phase: Phase) {
    this.phase = phase;
    this.root.dataset.phase = phase;
  }
  private resize = () => {
    this.scene.measure();
    this.dirty = true;
    this.wake();
  };
  private motionPreference = () => {
    if (this.reduced.matches && this.detail)
      this.detail.animateTo(
        this.phase === "closing" ? 0 : 1,
        performance.now(),
        true,
      );
    this.dirty = true;
    this.wake();
  };
  private updateActive() {
    const next = wrap(Math.round(this.position), books.length);
    if (next !== this.active) {
      this.active = next;
      this.root.dataset.active = books[next].id;
      this.notify(next);
    }
  }
  private wake() {
    if (!this.running && !this.disposed) {
      this.previous = performance.now();
      this.running = requestAnimationFrame(this.tick);
    }
  }
  go(value: number) {
    if (!this.onShelf) return;
    this.pendingOpen = null;
    this.target = wraps ? value : clamp(value, 0, books.length - 1);
    this.phaseTo("browsing");
    this.wake();
  }
  relative(n: number) {
    this.go(Math.round(this.target) + n);
  }
  category(name: string) {
    const i = name === "All" ? 0 : books.findIndex((b) => b.category === name);
    if (i >= 0)
      this.go(
        Math.round(this.target) +
          signedOffset(i, Math.round(this.target), books.length),
      );
  }
  hover(x: number, y: number, slot: number) {
    const p = this.pointer;
    if (!p.initialized) {
      p.drawX = x;
      p.drawY = y;
      p.initialized = true;
    }
    p.inside = true;
    p.x = x;
    p.y = y;
    p.hover = slot;
    this.dirty = true;
    this.wake();
  }
  leave() {
    if (!this.pointer.inside && this.pointer.hover === -1) return;
    this.pointer.inside = false;
    this.pointer.hover = -1;
    this.dirty = true;
    this.wake();
  }
  clickSlot(slot: number) {
    if (!this.onShelf) return;
    const distance = this.scene.distanceTo(slot, this.position);
    if (Math.abs(distance) < 0.5) this.openCurrent();
    else this.go(this.position + distance);
  }
  openCurrent() {
    if (!this.onShelf) return;
    const dest = Math.round(this.position);
    this.target = dest;
    if (Math.abs(this.position - dest) > 0.012) {
      this.pendingOpen = dest;
      this.wake();
      return;
    }
    this.position = dest;
    this.updateActive();
    this.show(this.active, true, false);
  }
  private show(index: number, push: boolean, immediate: boolean) {
    this.pendingOpen = null;
    this.pendingRoute = false;
    this.returnFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    this.detailIndex = index;
    this.pointer.inside = false;
    this.pointer.hover = -1;
    this.scene.draw(this.position, -1, this.pitch, this.yaw, 0, true);
    this.renderDetail(index);
    const panel = this.root.querySelector<HTMLElement>("#book-details")!;
    this.background.forEach((element) => (element.inert = true));
    this.cursor.dataset.mode = "";
    this.detail = new DetailMotion(panel, books[index].aspect);
    const now = performance.now();
    const skipMotion = immediate || this.reduced.matches;
    this.detail.open(now, this.reduced.matches, immediate);
    if (skipMotion) this.detail.step(now, this.scene.coverRect(), true);
    this.phaseTo(skipMotion ? "details" : "opening");
    document.title = books[index].title + " · " + shelfTitle;
    if (push) {
      history.pushState({ shelfDetail: true }, "", "#book/" + books[index].id);
      this.localEntry = true;
    }
    panel
      .querySelector<HTMLElement>(".close-detail")
      ?.focus({ preventScroll: true });
    this.wake();
  }
  close() {
    if (!this.detail || this.phase === "closing") return;
    if (this.localEntry || history.state?.shelfDetail) {
      this.localEntry = false;
      history.back();
    } else history.replaceState(null, "", location.pathname + location.search);
    this.beginClose();
  }
  private beginClose() {
    if (!this.detail || this.phase === "closing") return;
    this.detail.animateTo(0, performance.now(), this.reduced.matches);
    this.phaseTo("closing");
    this.wake();
  }
  private readRoute = (initial: Event | boolean = false) => {
    const id = location.hash.startsWith("#book/") ? location.hash.slice(6) : "";
    const i = books.findIndex((b) => b.id === id);
    if (i < 0) {
      this.pendingRoute = false;
      this.localEntry = false;
      this.beginClose();
      return;
    }
    if (this.detail) {
      if (i === this.detailIndex && this.phase !== "closing") return;
      this.pendingRoute = true;
      this.beginClose();
      return;
    }
    this.localEntry = !!history.state?.shelfDetail;
    this.target = this.position = wraps
      ? Math.round(this.position) +
        signedOffset(i, Math.round(this.position), books.length)
      : i;
    this.updateActive();
    this.show(i, false, initial === true);
  };
  private endDetail() {
    this.detail?.dispose();
    this.detail = null;
    this.detailIndex = -1;
    this.renderDetail(null);
    this.background.forEach((element) => (element.inert = false));
    this.phaseTo("idle");
    document.title = pageTitle;
    const nextFocus =
      this.returnFocus?.isConnected && this.returnFocus !== document.body
        ? this.returnFocus
        : this.root.querySelector<HTMLElement>(".open-current");
    nextFocus?.focus({ preventScroll: true });
    if (this.pendingRoute) {
      this.pendingRoute = false;
      this.readRoute();
    }
    this.dirty = true;
  }
  private tick = (now: number) => {
    const dt = clamp((now - this.previous) / 1000, 0, 0.05);
    this.previous = now;
    const reduced = this.reduced.matches;
    let working = false;
    if (this.onShelf) {
      const last = this.position;
      this.position = reduced
        ? this.target
        : approach(last, this.target, this.drag ? 18 : 5.2, dt, 0.00012);
      this.updateActive();
      const p = this.pointer,
        box = this.scene.rect,
        dx = p.x - (box.left + box.width / 2),
        dy = p.y - (box.top + box.height / 2);
      const radius = this.scene.height * books[this.active].aspect * 0.55;
      const over =
        p.inside &&
        !this.drag &&
        Math.abs(dx) < radius &&
        Math.abs(dy) < this.scene.height * 0.55 &&
        Math.abs(this.target - this.position) < 0.3;
      const yaw = reduced
        ? 0
        : over
          ? (dx / radius) * 9
          : p.inside
            ? (dx / box.width) * 5
            : 0;
      const pitch = reduced
        ? 0
        : over
          ? (-dy / (this.scene.height * 0.5)) * 6
          : 0;
      const oldPitch = this.pitch,
        oldYaw = this.yaw;
      this.pitch = approach(this.pitch, pitch, 7, dt, 0.001);
      this.yaw = approach(this.yaw, yaw, 7, dt, 0.001);
      const lift = this.scene.draw(
        this.position,
        p.inside ? p.hover : -1,
        this.pitch,
        this.yaw,
        dt,
        reduced,
      );
      p.drawX = reduced ? p.x : approach(p.drawX, p.x, 16, dt, 0.05);
      p.drawY = reduced ? p.y : approach(p.drawY, p.y, 16, dt, 0.05);
      this.cursor.style.transform =
        "translate3d(" + p.drawX + "px," + p.drawY + "px,0)";
      this.cursor.dataset.mode = p.inside
        ? over
          ? "open"
          : p.hover >= 0
            ? "spine"
            : "track"
        : "";
      working =
        lift ||
        this.position !== this.target ||
        this.pitch !== pitch ||
        this.yaw !== yaw ||
        oldPitch !== this.pitch ||
        oldYaw !== this.yaw ||
        p.drawX !== p.x ||
        p.drawY !== p.y;
      if (
        this.pendingOpen !== null &&
        Math.abs(this.position - this.pendingOpen) < 0.012
      ) {
        this.position = this.target = this.pendingOpen;
        this.updateActive();
        this.show(this.active, true, false);
        working = true;
      } else if (
        this.phase === "browsing" &&
        this.position === this.target &&
        !this.drag
      )
        this.phaseTo("idle");
    }
    if (this.detail) {
      if (this.dirty)
        this.scene.draw(this.position, -1, this.pitch, this.yaw, dt, true);
      const result = this.detail.step(now, this.scene.coverRect(), reduced);
      if (result.arrived && this.phase === "closing") {
        this.endDetail();
        working = true;
      } else if (result.arrived && this.phase === "opening")
        this.phaseTo("details");
      working = working || result.running;
    }
    this.dirty = false;
    this.running = working ? requestAnimationFrame(this.tick) : 0;
  };
  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.running);
    this.observer.disconnect();
    this.unbind();
    window.removeEventListener("popstate", this.readRoute);
    window.removeEventListener("hashchange", this.readRoute);
    this.reduced.removeEventListener("change", this.motionPreference);
    this.detail?.dispose();
    this.background.forEach((element) => (element.inert = false));
  }
}

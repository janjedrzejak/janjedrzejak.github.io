import { books } from "../data/catalog";
import { loadCover } from "../components/Cover";
import { approach, bookPose, signedOffset, wrap } from "./pose";

export class ShelfScene {
  readonly slots;
  height = 0;
  rect: DOMRect;
  private maxWidth = Math.max(...books.map((b) => b.aspect));
  private selectedElement: HTMLElement | null = null;
  constructor(
    readonly fit: HTMLElement,
    readonly stage: HTMLElement,
  ) {
    this.rect = fit.getBoundingClientRect();
    this.slots = Array.from(
      stage.querySelectorAll<HTMLElement>(".book-solid"),
      (el, slot) => ({
        el,
        slot,
        index: slot % books.length,
        spine: el.querySelector<HTMLElement>(".spine")!,
        front: el.querySelector<HTMLElement>(".cover-front")!,
        img: el.querySelector<HTMLImageElement>("img")!,
        lift: 0,
        transform: "",
        seen: false,
      }),
    );
    this.measure();
  }
  measure() {
    this.rect = this.fit.getBoundingClientRect();
    this.height = Math.max(
      120,
      Math.min(
        this.rect.height - 80,
        innerWidth * (innerWidth < 768 ? 0.72 : 0.31),
      ),
    );
    this.fit.style.setProperty("--h", this.height + "px");
    this.stage.parentElement!.style.setProperty("--h", this.height + "px");
  }
  coverRect() {
    return this.selectedElement!.getBoundingClientRect();
  }
  draw(
    position: number,
    hover: number,
    pitch: number,
    yaw: number,
    dt: number,
    reduced: boolean,
  ) {
    let lifting = false;
    const leftIndex = Math.floor(position),
      fraction = position - leftIndex;
    const a = books[wrap(leftIndex, books.length)].aspect,
      b = books[wrap(leftIndex + 1, books.length)].aspect;
    const width = this.height * (a + (b - a) * fraction);
    const visible = this.rect.width * 0.5 + this.height * this.maxWidth * 1.5;
    let closest = Infinity;
    for (const s of this.slots) {
      const distance = signedOffset(s.slot, position, this.slots.length);
      const goal = hover === s.slot && Math.abs(distance) > 0.5 ? 1 : 0;
      s.lift = reduced ? goal : approach(s.lift, goal, 12, dt, 0.001);
      if (s.lift !== goal) lifting = true;
      const pose = bookPose(distance, this.height, width, s.lift, pitch, yaw);
      if (Math.abs(pose.x) > visible) {
        if (s.seen) {
          s.el.style.visibility = "hidden";
          s.seen = false;
        }
        continue;
      }
      if (!s.seen) {
        s.el.style.visibility = "visible";
        s.seen = true;
        loadCover(s.img);
      }
      if (Math.abs(distance) < closest) {
        closest = Math.abs(distance);
        this.selectedElement = s.front;
      }
      const value =
        "perspective(2200px) translate3d(" +
        pose.x.toFixed(3) +
        "px," +
        pose.y.toFixed(3) +
        "px," +
        pose.z.toFixed(3) +
        "px) rotateZ(" +
        pose.roll.toFixed(3) +
        "deg) rotateX(" +
        pose.pitch.toFixed(3) +
        "deg) rotateY(" +
        pose.yaw.toFixed(3) +
        "deg)";
      if (value !== s.transform) {
        s.transform = value;
        s.el.style.transform = value;
        s.el.style.zIndex = String(pose.order);
        s.spine.style.setProperty("--shade", pose.spineShade.toFixed(3));
        s.front.style.setProperty("--shade", pose.coverShade.toFixed(3));
      }
    }
    this.stage.dataset.ready = "true";
    return lifting;
  }
}

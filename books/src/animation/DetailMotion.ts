import { clamp } from "../geometry/pose";
import { Ink } from "./Ink";

function bezier(t: number, x1: number, y1: number, x2: number, y2: number) {
  if (t <= 0 || t >= 1) return clamp(t);
  const point = (u: number, a: number, b: number) =>
    3 * (1 - u) * (1 - u) * u * a + 3 * (1 - u) * u * u * b + u * u * u;
  let low = 0,
    high = 1;
  for (let n = 0; n < 13; n++) {
    const u = (low + high) / 2;
    if (point(u, x1, x2) < t) low = u;
    else high = u;
  }
  return point((low + high) / 2, y1, y2);
}
export class DetailMotion {
  private ink: Ink;
  private text: Animation[] = [];
  private value = 0;
  private opacity = 0;
  private from = 0;
  private alphaFrom = 0;
  private began = 0;
  private originTime = 0;
  private duration = 0;
  private target = 1;
  private reduced = false;
  constructor(
    private panel: HTMLElement,
    aspect: number,
  ) {
    this.ink = new Ink(panel.querySelector("canvas")!, aspect);
  }
  open(now: number, reduced: boolean, immediate = false) {
    this.originTime = now;
    this.reduced = reduced || immediate;
    this.animateTo(1, now, this.reduced);
    if (this.reduced) return;
    this.ink.prepare();
    this.panel.querySelectorAll<HTMLElement>("[data-rise]").forEach((el, i) => {
      this.text.push(
        el.animate(
          [{ transform: "translateY(110%)" }, { transform: "translateY(0)" }],
          {
            duration: 900,
            delay: 620 + Math.min(i, 4) * 75 + Math.max(0, i - 4) * 30,
            easing: "cubic-bezier(.2,.8,.2,1)",
            fill: "both",
          },
        ),
      );
    });
  }
  animateTo(target: number, now: number, reduced: boolean) {
    this.target = target;
    this.began = now;
    this.from = this.value;
    this.alphaFrom = this.opacity;
    this.duration = reduced
      ? 0
      : (target ? 1050 : 800) * Math.sqrt(Math.abs(target - this.from));
    if (!target) this.text.forEach((a) => a.pause());
    else this.text.forEach((a) => a.play());
  }
  step(now: number, anchor: DOMRect, reduced: boolean) {
    const time =
      this.duration && !reduced ? clamp((now - this.began) / this.duration) : 1;
    const mix = this.target
      ? bezier(time, 0.76, 0, 0.18, 1)
      : bezier(time, 0.22, 1, 0.36, 1);
    this.value = this.from + (this.target - this.from) * mix;
    const remaining = 1 - this.value;
    const w = document.documentElement.clientWidth,
      h = this.panel.offsetHeight;
    if (this.target)
      this.opacity =
        this.reduced || reduced
          ? 1
          : Math.min(1, this.alphaFrom + (now - this.began) / 80);
    else this.opacity = this.alphaFrom * (1 - clamp((mix - 0.6) / 0.4));
    this.panel.style.transformOrigin =
      anchor.left +
      anchor.width / 2 +
      "px " +
      (anchor.top + anchor.height / 2) +
      "px";
    this.panel.style.clipPath =
      time === 1 && this.target
        ? "none"
        : "inset(" +
          [anchor.top, w - anchor.right, h - anchor.bottom, anchor.left]
            .map((s) => (s * remaining).toFixed(2) + "px")
            .join(" ") +
          " round " +
          3 * remaining +
          "px)";
    this.panel.style.transform = remaining
      ? "rotate(" + -4.5 * remaining + "deg)"
      : "none";
    this.panel.style.opacity = String(this.opacity);
    if (this.target)
      this.ink.draw(
        this.reduced || reduced ? 3000 : now - this.originTime - 520,
      );
    const maskRunning =
      !!this.target &&
      !this.reduced &&
      !reduced &&
      now < this.originTime + 2220;
    return { arrived: time >= 1, running: time < 1 || maskRunning };
  }
  dispose() {
    this.text.forEach((a) => a.cancel());
    this.ink.dispose();
  }
}

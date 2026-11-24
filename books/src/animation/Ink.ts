import { makeInkField } from "./inkField";

// Keep the last two normalized fields. A closed panel releases its canvas and worker.
const recent = new Map<string, Uint16Array>();
export class Ink {
  private context: CanvasRenderingContext2D | null;
  private pixels?: ImageData;
  private arrival?: Uint16Array;
  private worker: Worker | null = null;
  private disposed = false;
  private previous = -1;
  constructor(
    private canvas: HTMLCanvasElement,
    private aspect: number,
  ) {
    this.context = canvas.getContext("2d");
  }
  prepare() {
    if (!this.context) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.min(
      320,
      Math.max(80, Math.round(this.canvas.clientWidth * dpr * 0.6)),
    );
    const height = Math.round(width / this.aspect),
      key = width + "x" + height;
    this.canvas.width = width;
    this.canvas.height = height;
    const pixels = this.context.createImageData(width, height);
    const [r, g, b] = getComputedStyle(this.canvas)
      .color.match(/[\d.]+/g)
      ?.map(Number) ?? [255, 255, 255];
    for (let i = 0; i < pixels.data.length; i += 4) {
      pixels.data[i] = r;
      pixels.data[i + 1] = g;
      pixels.data[i + 2] = b;
      pixels.data[i + 3] = 255;
    }
    this.pixels = pixels;
    const install = (times: Uint16Array) => {
      if (this.disposed) return;
      this.arrival = times;
      if (!recent.has(key) && recent.size >= 2)
        recent.delete(recent.keys().next().value!);
      recent.set(key, times);
      this.worker?.terminate();
      this.worker = null;
    };
    const cached = recent.get(key);
    if (cached) {
      this.arrival = cached;
      return;
    }
    try {
      this.worker = new Worker(new URL("./ink.worker.ts", import.meta.url), {
        type: "module",
      });
      this.worker.onmessage = (e) => install(e.data as Uint16Array);
      this.worker.onerror = () => {
        if (!this.disposed) install(makeInkField(width, height));
      };
      this.worker.postMessage({ width, height });
    } catch {
      install(makeInkField(width, height));
    }
  }
  draw(elapsed: number) {
    if (!this.context || elapsed > 1700) {
      this.canvas.hidden = true;
      return;
    }
    this.canvas.hidden = false;
    if (elapsed < 0 || !this.arrival || !this.pixels) return;
    const tick = Math.floor(elapsed);
    if (tick === this.previous) return;
    this.previous = tick;
    this.canvas.style.background = "transparent";
    const rgba = this.pixels.data;
    for (let i = 0; i < this.arrival.length; i++)
      rgba[i * 4 + 3] = Math.max(
        0,
        Math.min(255, (this.arrival[i] - tick) * 18 + 128),
      );
    this.context.putImageData(this.pixels, 0, 0);
  }
  dispose() {
    this.disposed = true;
    this.worker?.terminate();
    this.worker = null;
    this.canvas.width = this.canvas.height = 1;
    this.arrival = undefined;
    this.pixels = undefined;
  }
}

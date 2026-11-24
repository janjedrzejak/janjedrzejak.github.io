// The normalized poster is 474 units wide. Each pool starts at its own time.
const pools = [
  [150, 330, 0],
  [340, 600, 120],
  [250, 120, 220],
  [90, 760, 300],
  [400, 250, 360],
  [260, 860, 420],
  [230, 470, 180],
];
const noiseGrid = new Float32Array(128 * 128);
let seed = 7;
for (let i = 0; i < noiseGrid.length; i++) {
  seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
  noiseGrid[i] = seed / 4294967296;
}
function noise(x: number, y: number) {
  const a = Math.floor(x),
    b = Math.floor(y),
    dx = x - a,
    dy = y - b;
  const fx = dx * dx * (3 - 2 * dx),
    fy = dy * dy * (3 - 2 * dy);
  const top = (b & 127) << 7,
    bottom = ((b + 1) & 127) << 7,
    left = a & 127,
    right = (a + 1) & 127;
  const u = noiseGrid[top + left] * (1 - fx) + noiseGrid[top + right] * fx;
  const v =
    noiseGrid[bottom + left] * (1 - fx) + noiseGrid[bottom + right] * fx;
  return u + (v - u) * fy;
}
function offset(x: number, y: number) {
  return (
    110 *
    (0.65 * noise(x * 0.011, y * 0.011) +
      0.25 * noise(x * 0.022, y * 0.022) +
      0.1 * noise(x * 0.044, y * 0.044) -
      0.5)
  );
}
export function makeInkField(width: number, height: number) {
  const times = new Uint16Array(width * height),
    scale = 474 / width;
  for (let row = 0, i = 0; row < height; row++) {
    const y = row * scale;
    for (let col = 0; col < width; col++, i++) {
      const x = col * scale,
        px = x + offset(x, y),
        py = y + offset(x + 521, y + 217);
      let earliest = 2200;
      for (const [cx, cy, delay] of pools) {
        const dx = px - cx,
          dy = py - cy,
          r = Math.min(1, Math.sqrt(dx * dx + dy * dy) / 720);
        earliest = Math.min(earliest, delay + 1250 * (1 - Math.cbrt(1 - r)));
      }
      times[i] = Math.round(earliest);
    }
  }
  return times;
}

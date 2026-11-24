/** Distances are in CSS pixels; rotations are around the book's volume centre. */
export const wrap = (i: number, length: number) =>
  ((i % length) + length) % length;
export const clamp = (n: number, low = 0, high = 1) =>
  Math.max(low, Math.min(high, n));
export const signedOffset = (index: number, position: number, length: number) =>
  wrap(index - position + length / 2, length) - length / 2;
export function approach(
  current: number,
  target: number,
  rate: number,
  seconds: number,
  epsilon: number,
) {
  const remaining = (current - target) * Math.exp(-rate * seconds);
  return Math.abs(remaining) < epsilon ? target : target + remaining;
}
export function bookPose(
  distance: number,
  height: number,
  coverWidth: number,
  lift: number,
  pitch: number,
  yaw: number,
) {
  const closeness = clamp(1 - Math.abs(distance));
  const f = closeness * closeness * (3 - 2 * closeness);
  const thickness = height * 0.15,
    gap = height * 0.03;
  // Integrating the slope gives a continuous opening for the nearest front cover.
  const spread =
    Math.abs(distance) >= 1
      ? Math.sign(distance) / 2
      : (distance + Math.sin(Math.PI * distance) / Math.PI) / 2;
  const x =
    distance * (thickness + gap) +
    spread * (coverWidth - thickness + 1.6 * gap);
  const y = -height * (0.025 * f + 0.045 * lift),
    z = 0.2 * height * f;
  return {
    x,
    y,
    z,
    roll: -4.5 * f,
    pitch: pitch * f,
    yaw: (yaw - 90) * f,
    spineShade: 0.55 * f,
    coverShade: 0.5 * (1 - f),
    order: Math.round(100 - 4 * Math.abs(distance)),
  };
}

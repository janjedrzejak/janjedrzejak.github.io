import { shelfPose } from "../../../shelf-pose.js";

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
  return shelfPose(distance, height, coverWidth, lift, pitch, yaw);
}

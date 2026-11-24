/** Compute the pose of an item relative to the current shelf position, in CSS pixels.
 * @param {number} distance
 * @param {number} height
 * @param {number} coverWidth
 * @param {number} lift
 * @param {number} pitch
 * @param {number} yaw
 * @param {number} [thicknessRatio]
 */
export function shelfPose(distance, height, coverWidth, lift, pitch, yaw, thicknessRatio = 0.15) {
  const closeness = Math.max(0, 1 - Math.abs(distance));
  const f = closeness * closeness * (3 - 2 * closeness);
  const thickness = height * thicknessRatio,
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

import type { NormalizedLandmark } from '@mediapipe/tasks-vision'

/**
 * Calculate the angle (in degrees) at vertex point B, formed by rays BA and BC.
 * Uses atan2 for robust, quadrant-aware angle computation.
 *
 * @param a - First endpoint (e.g., hip)
 * @param b - Vertex point where angle is measured (e.g., knee)
 * @param c - Second endpoint (e.g., ankle)
 * @returns Angle in degrees [0, 180]
 */
export function calculateAngle(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x)
  let angle = Math.abs(radians * (180 / Math.PI))
  if (angle > 180) {
    angle = 360 - angle
  }
  return angle
}

/**
 * Check whether all landmarks at the given indices have visibility
 * at or above the minimum threshold.
 *
 * @param landmarks - Full array of 33 NormalizedLandmark objects
 * @param indices - Landmark indices that must be visible
 * @param minVisibility - Minimum visibility score (0-1)
 * @returns true if every specified landmark meets the visibility requirement
 */
export function areLandmarksVisible(
  landmarks: NormalizedLandmark[],
  indices: number[],
  minVisibility: number,
): boolean {
  for (const idx of indices) {
    const lm = landmarks[idx]
    if (!lm) return false
    if (lm.visibility !== undefined && lm.visibility < minVisibility) {
      return false
    }
  }
  return true
}

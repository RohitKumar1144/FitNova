/**
 * Exponential Moving Average (EMA) smoother for reducing noise
 * in high-frequency tracked values (e.g., joint angles from MediaPipe).
 *
 * EMA formula: smoothed = alpha * raw + (1 - alpha) * previousSmoothed
 *
 * A lower alpha produces smoother output but introduces more lag.
 * A higher alpha tracks the raw signal more closely but preserves more noise.
 */
export class EMASmoother {
  private value: number | null = null
  private readonly alpha: number

  /**
   * @param alpha Smoothing factor in range (0, 1].
   *   - 0.2 = very smooth, noticeable lag
   *   - 0.35 = balanced (default for joint angles)
   *   - 0.6 = responsive, moderate smoothing
   *   - 1.0 = no smoothing (pass-through)
   */
  constructor(alpha: number = 0.35) {
    this.alpha = Math.max(0.01, Math.min(1, alpha))
  }

  /**
   * Feed a new raw sample and return the smoothed value.
   */
  next(rawValue: number): number {
    if (this.value === null) {
      this.value = rawValue
    } else {
      this.value = this.alpha * rawValue + (1 - this.alpha) * this.value
    }
    return this.value
  }

  /**
   * Get the current smoothed value, or null if no samples have been fed.
   */
  current(): number | null {
    return this.value
  }

  /**
   * Reset the smoother to its initial empty state.
   */
  reset(): void {
    this.value = null
  }
}

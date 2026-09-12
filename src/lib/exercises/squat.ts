/**
 * Squat Analyzer — State-machine–based rep counter with form analysis.
 *
 * State machine:  STANDING → DESCENDING → BOTTOM → ASCENDING → STANDING (rep!)
 *
 * A rep is counted ONLY when the user completes the full cycle and
 * the elapsed time exceeds the minimum rep duration. This prevents
 * ghost reps from noise, partial movements, or rapid threshold crossings.
 *
 * All thresholds are centralized in DEFAULT_THRESHOLDS — no magic numbers
 * are scattered through the logic.
 *
 * The module is pure logic with no React dependency, making it testable
 * in isolation.
 */

import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { POSE_LANDMARKS } from '../mediapipe/landmarks'
import { calculateAngle, areLandmarksVisible } from '../utils/angles'
import { EMASmoother } from '../utils/smoothing'
import type {
  SquatPhase,
  FormRating,
  FormCue,
  FrameAnalysis,
  SquatThresholds,
} from './types'

// ---------------------------------------------------------------------------
// Default Thresholds (centralized, configurable via resetSquatAnalyzer)
// ---------------------------------------------------------------------------

const DEFAULT_THRESHOLDS: SquatThresholds = {
  standingAngle: 160,
  descentAngle: 150,
  bottomAngle: 100,
  goodDepthAngle: 110,
  bottomHysteresis: 10,
  minVisibility: 0.15,
  minRepDurationMs: 800,
  smoothingAlpha: 0.35,
  maxTorsoLeanAngle: 45,
  kneeAlignmentRatio: 0.7,
}

// ---------------------------------------------------------------------------
// Landmark indices required for squat analysis
// ---------------------------------------------------------------------------

const SQUAT_LANDMARK_INDICES: number[] = [
  POSE_LANDMARKS.LEFT_HIP,
  POSE_LANDMARKS.LEFT_KNEE,
  POSE_LANDMARKS.LEFT_ANKLE,
  POSE_LANDMARKS.RIGHT_HIP,
  POSE_LANDMARKS.RIGHT_KNEE,
  POSE_LANDMARKS.RIGHT_ANKLE,
  POSE_LANDMARKS.LEFT_SHOULDER,
  POSE_LANDMARKS.RIGHT_SHOULDER,
]

// ---------------------------------------------------------------------------
// Internal State
// ---------------------------------------------------------------------------

interface SquatAnalyzerState {
  phase: SquatPhase
  repCount: number
  /** Timestamp (ms) when the current rep's descent began. */
  repStartTimestamp: number | null
  /** Deepest (smallest) knee angle recorded during the current rep. */
  deepestAngle: number
  lastRepRating: FormRating | null
  currentFormCues: FormCue[]
  leftKneeSmoother: EMASmoother
  rightKneeSmoother: EMASmoother
}

function createInitialState(config: SquatThresholds): SquatAnalyzerState {
  return {
    phase: 'STANDING',
    repCount: 0,
    repStartTimestamp: null,
    deepestAngle: 180,
    lastRepRating: null,
    currentFormCues: [],
    leftKneeSmoother: new EMASmoother(config.smoothingAlpha),
    rightKneeSmoother: new EMASmoother(config.smoothingAlpha),
  }
}

/** Module-level mutable state — reset via resetSquatAnalyzer(). */
let state: SquatAnalyzerState = createInitialState(DEFAULT_THRESHOLDS)
let thresholds: SquatThresholds = { ...DEFAULT_THRESHOLDS }

// ---------------------------------------------------------------------------
// Geometry Helpers
// ---------------------------------------------------------------------------

/**
 * Compute the smoothed average knee angle from both legs.
 * HIP → KNEE → ANKLE on each side, then averaged.
 */
function computeKneeAngle(landmarks: NormalizedLandmark[]): number {
  const leftAngle = calculateAngle(
    landmarks[POSE_LANDMARKS.LEFT_HIP],
    landmarks[POSE_LANDMARKS.LEFT_KNEE],
    landmarks[POSE_LANDMARKS.LEFT_ANKLE],
  )
  const rightAngle = calculateAngle(
    landmarks[POSE_LANDMARKS.RIGHT_HIP],
    landmarks[POSE_LANDMARKS.RIGHT_KNEE],
    landmarks[POSE_LANDMARKS.RIGHT_ANKLE],
  )

  const smoothedLeft = state.leftKneeSmoother.next(leftAngle)
  const smoothedRight = state.rightKneeSmoother.next(rightAngle)

  return (smoothedLeft + smoothedRight) / 2
}

/**
 * Compute the torso lean angle from vertical.
 * Measures the angle between the mid-shoulder→mid-hip vector and the vertical axis.
 * 0° = perfectly upright.
 */
function computeTorsoLeanAngle(landmarks: NormalizedLandmark[]): number {
  const midShoulderX =
    (landmarks[POSE_LANDMARKS.LEFT_SHOULDER].x + landmarks[POSE_LANDMARKS.RIGHT_SHOULDER].x) / 2
  const midShoulderY =
    (landmarks[POSE_LANDMARKS.LEFT_SHOULDER].y + landmarks[POSE_LANDMARKS.RIGHT_SHOULDER].y) / 2
  const midHipX =
    (landmarks[POSE_LANDMARKS.LEFT_HIP].x + landmarks[POSE_LANDMARKS.RIGHT_HIP].x) / 2
  const midHipY =
    (landmarks[POSE_LANDMARKS.LEFT_HIP].y + landmarks[POSE_LANDMARKS.RIGHT_HIP].y) / 2

  // dx = horizontal displacement, dy = vertical displacement (y increases downward in image)
  const dx = midShoulderX - midHipX
  const dy = midHipY - midShoulderY // flip so "up" is positive

  return Math.abs(Math.atan2(dx, dy) * (180 / Math.PI))
}

/**
 * Check whether knees are caving inward.
 * Compares the horizontal spread between knees to the spread between ankles.
 */
function isKneeAlignmentGood(landmarks: NormalizedLandmark[]): boolean {
  const kneeSpread = Math.abs(
    landmarks[POSE_LANDMARKS.LEFT_KNEE].x - landmarks[POSE_LANDMARKS.RIGHT_KNEE].x,
  )
  const ankleSpread = Math.abs(
    landmarks[POSE_LANDMARKS.LEFT_ANKLE].x - landmarks[POSE_LANDMARKS.RIGHT_ANKLE].x,
  )

  // Avoid division-by-zero when ankles are very close together
  if (ankleSpread < 0.01) return true

  return kneeSpread >= ankleSpread * thresholds.kneeAlignmentRatio
}

// ---------------------------------------------------------------------------
// Form Analysis
// ---------------------------------------------------------------------------

/**
 * Generate real-time form cues for the current frame.
 * Only generates cues in phases where the user is actively squatting.
 */
function generateFormCues(
  kneeAngle: number,
  landmarks: NormalizedLandmark[],
  phase: SquatPhase,
): FormCue[] {
  const cues: FormCue[] = []

  // Only provide actionable cues during the active squat portion
  if (phase !== 'BOTTOM' && phase !== 'ASCENDING' && phase !== 'DESCENDING') {
    return cues
  }

  // Depth feedback (most relevant at bottom)
  if (phase === 'BOTTOM' || phase === 'ASCENDING') {
    if (state.deepestAngle <= thresholds.goodDepthAngle) {
      cues.push({ message: 'Great depth!', type: 'success' })
    } else if (state.deepestAngle <= thresholds.goodDepthAngle + 15) {
      cues.push({ message: 'Try going a little deeper', type: 'warning' })
    }
  }

  // Knee alignment check
  if (!isKneeAlignmentGood(landmarks)) {
    cues.push({ message: 'Keep knees over toes', type: 'warning' })
  }

  // Torso lean check
  const torsoLean = computeTorsoLeanAngle(landmarks)
  if (torsoLean > thresholds.maxTorsoLeanAngle) {
    cues.push({ message: 'Keep your chest up', type: 'warning' })
  }

  // Phase-specific encouragement
  if (phase === 'DESCENDING' && kneeAngle > thresholds.bottomAngle + 20) {
    cues.push({ message: 'Keep going down', type: 'warning' })
  }

  return cues
}

/**
 * Rate the overall quality of a completed rep based on the metrics
 * collected during the rep's lifecycle.
 */
function rateRep(deepestAngle: number, landmarks: NormalizedLandmark[]): FormRating {
  let score = 0
  const maxScore = 4

  // Depth (0-2 points)
  if (deepestAngle <= thresholds.goodDepthAngle) {
    score += 2
  } else if (deepestAngle <= thresholds.goodDepthAngle + 15) {
    score += 1
  }

  // Knee alignment (0-1 point)
  if (isKneeAlignmentGood(landmarks)) {
    score += 1
  }

  // Torso posture (0-1 point)
  const torsoLean = computeTorsoLeanAngle(landmarks)
  if (torsoLean <= thresholds.maxTorsoLeanAngle) {
    score += 1
  }

  const ratio = score / maxScore
  if (ratio >= 0.75) return 'good'
  if (ratio >= 0.5) return 'fair'
  return 'poor'
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Process a single frame of pose landmarks through the squat state machine.
 *
 * Call this once per animation frame. The function is pure computation
 * (no React, no DOM) and mutates only module-level state.
 *
 * @param landmarks - Array of 33 NormalizedLandmark from MediaPipe
 * @param timestampMs - Monotonically increasing timestamp (performance.now())
 * @returns FrameAnalysis snapshot for the UI to consume
 */
export function analyzeSquatFrame(
  landmarks: NormalizedLandmark[],
  timestampMs: number,
): FrameAnalysis {
  // ------------------------------------------------------------------
  // 1. Landmark visibility gate
  // ------------------------------------------------------------------
  if (!areLandmarksVisible(landmarks, SQUAT_LANDMARK_INDICES, thresholds.minVisibility)) {
    return {
      phase: state.phase,
      kneeAngle: null,
      repCount: state.repCount,
      currentFormCues: [{ message: 'Position your full body in frame', type: 'warning' }],
      lastRepRating: state.lastRepRating,
    }
  }

  // ------------------------------------------------------------------
  // 2. Compute smoothed knee angle
  // ------------------------------------------------------------------
  const kneeAngle = computeKneeAngle(landmarks)

  // Track the deepest angle reached during the current rep
  if (kneeAngle < state.deepestAngle) {
    state.deepestAngle = kneeAngle
  }

  // ------------------------------------------------------------------
  // 3. State machine transitions
  // ------------------------------------------------------------------
  switch (state.phase) {
    case 'STANDING':
      if (kneeAngle < thresholds.descentAngle) {
        state.phase = 'DESCENDING'
        state.repStartTimestamp = timestampMs
        state.deepestAngle = kneeAngle
      }
      break

    case 'DESCENDING':
      if (kneeAngle <= thresholds.bottomAngle) {
        state.phase = 'BOTTOM'
      } else if (kneeAngle > thresholds.standingAngle) {
        // Returned to standing without reaching bottom — abort this rep attempt
        state.phase = 'STANDING'
        state.repStartTimestamp = null
        state.deepestAngle = 180
      }
      break

    case 'BOTTOM':
      if (kneeAngle > thresholds.bottomAngle + thresholds.bottomHysteresis) {
        // Hysteresis prevents flicker at the boundary
        state.phase = 'ASCENDING'
      }
      break

    case 'ASCENDING':
      if (kneeAngle >= thresholds.standingAngle) {
        // Full cycle complete — validate rep duration
        const repDuration = state.repStartTimestamp
          ? timestampMs - state.repStartTimestamp
          : 0

        if (repDuration >= thresholds.minRepDurationMs) {
          // ✓ VALID REP
          state.repCount += 1
          state.lastRepRating = rateRep(state.deepestAngle, landmarks)
        }

        // Reset for next rep regardless of validity
        state.phase = 'STANDING'
        state.repStartTimestamp = null
        state.deepestAngle = 180
      } else if (kneeAngle <= thresholds.bottomAngle) {
        // Went back down into bottom position (double-bounce)
        state.phase = 'BOTTOM'
      }
      break
  }

  // ------------------------------------------------------------------
  // 4. Generate real-time form cues
  // ------------------------------------------------------------------
  const formCues = generateFormCues(kneeAngle, landmarks, state.phase)
  state.currentFormCues = formCues

  return {
    phase: state.phase,
    kneeAngle,
    repCount: state.repCount,
    currentFormCues: formCues,
    lastRepRating: state.lastRepRating,
  }
}

/**
 * Reset the squat analyzer to its initial state.
 * Optionally accepts partial threshold overrides.
 */
export function resetSquatAnalyzer(customThresholds?: Partial<SquatThresholds>): void {
  thresholds = { ...DEFAULT_THRESHOLDS, ...customThresholds }
  state = createInitialState(thresholds)
}

/**
 * Get a read-only snapshot of the current squat analyzer state.
 * Useful for external components that need to read without processing a frame.
 */
export function getSquatState(): Readonly<{
  phase: SquatPhase
  repCount: number
  lastRepRating: FormRating | null
}> {
  return {
    phase: state.phase,
    repCount: state.repCount,
    lastRepRating: state.lastRepRating,
  }
}

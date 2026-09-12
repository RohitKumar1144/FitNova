/**
 * Push-up Analyzer — State-machine-based rep counter with form analysis and Plank Body Gate.
 *
 * State machine: TOP → DESCENDING → BOTTOM → ASCENDING → TOP (rep!)
 *
 * BODY/POSITION GATE:
 * A rep can ONLY begin when the user is already established in a valid horizontal
 * plank position (stabilized for minPlankStableFrames).
 *
 * Movements such as standing up, bending down from standing to the floor,
 * or bicep curls/arm waving while upright are completely rejected by:
 * 1. Horizontal torso/body inclination check (standing is vertical > 70°, plank is <= 45°)
 * 2. Straight-body plank alignment check (shoulder-hip-ankle >= 135°)
 * 3. Wrists below shoulders (ground level)
 * 4. Temporal stability requirement in plank before descent can trigger
 * 5. Mid-rep invalidation: If plank is broken or user stands up during any phase,
 *    the active rep is cancelled and resets to neutral TOP.
 * 6. Rep completion gate: Returning to TOP requires being in a valid plank.
 *
 * All thresholds are centralized in DEFAULT_PUSHUP_THRESHOLDS.
 * Pure logic with no React/DOM dependency.
 */

import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { POSE_LANDMARKS } from '../mediapipe/landmarks'
import { calculateAngle } from '../utils/angles'
import { EMASmoother } from '../utils/smoothing'
import type {
  PushupPhase,
  FormRating,
  FormCue,
  PushupFrameAnalysis,
  PushupThresholds,
} from './types'

// ---------------------------------------------------------------------------
// Default Thresholds (centralized, configurable via resetPushupAnalyzer)
// ---------------------------------------------------------------------------

export const DEFAULT_PUSHUP_THRESHOLDS: PushupThresholds = {
  topAngle: 148,
  descentAngle: 138,
  bottomAngle: 100,
  goodDepthAngle: 95,
  bottomHysteresis: 10,
  minVisibility: 0.15,
  minRepDurationMs: 700,
  smoothingAlpha: 0.35,
  minBodyAlignmentAngle: 135,
  maxBodyAngleFromHorizontal: 45,
  minPlankStableFrames: 4,
}

// ---------------------------------------------------------------------------
// Internal State
// ---------------------------------------------------------------------------

interface PushupAnalyzerState {
  phase: PushupPhase
  repCount: number
  /** Timestamp (ms) when the current rep's descent began. */
  repStartTimestamp: number | null
  /** Deepest (smallest) elbow angle recorded during the current rep. */
  deepestAngle: number
  /** Minimum body alignment angle recorded during the current rep. */
  worstBodyAngle: number
  lastRepRating: FormRating | null
  currentFormCues: FormCue[]
  leftElbowSmoother: EMASmoother
  rightElbowSmoother: EMASmoother
  /** Number of consecutive frames the user has been in a valid horizontal plank. */
  consecutivePlankFrames: number
  /** Whether the user is currently stabilized in plank position. */
  isPlankStable: boolean
}

function createInitialPushupState(config: PushupThresholds): PushupAnalyzerState {
  return {
    phase: 'TOP',
    repCount: 0,
    repStartTimestamp: null,
    deepestAngle: 180,
    worstBodyAngle: 180,
    lastRepRating: null,
    currentFormCues: [],
    leftElbowSmoother: new EMASmoother(config.smoothingAlpha),
    rightElbowSmoother: new EMASmoother(config.smoothingAlpha),
    consecutivePlankFrames: 0,
    isPlankStable: false,
  }
}

/** Module-level mutable state — reset via resetPushupAnalyzer(). */
let state: PushupAnalyzerState = createInitialPushupState(DEFAULT_PUSHUP_THRESHOLDS)
let thresholds: PushupThresholds = { ...DEFAULT_PUSHUP_THRESHOLDS }

// ---------------------------------------------------------------------------
// Landmark Visibility & Geometry Helpers
// ---------------------------------------------------------------------------

function isLandmarkVisible(lm: NormalizedLandmark | undefined, minVisibility: number): boolean {
  return lm !== undefined && (lm.visibility === undefined || lm.visibility >= minVisibility)
}

/**
 * Compute the smoothed elbow angle.
 * Supports side-profile view (where only one arm is clearly visible)
 * as well as full-view (where both arms are visible and averaged).
 */
function computeElbowAngle(landmarks: NormalizedLandmark[]): number | null {
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER]
  const leftElbow = landmarks[POSE_LANDMARKS.LEFT_ELBOW]
  const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST]

  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]
  const rightElbow = landmarks[POSE_LANDMARKS.RIGHT_ELBOW]
  const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST]

  const leftVisible =
    isLandmarkVisible(leftShoulder, thresholds.minVisibility) &&
    isLandmarkVisible(leftElbow, thresholds.minVisibility) &&
    isLandmarkVisible(leftWrist, thresholds.minVisibility)

  const rightVisible =
    isLandmarkVisible(rightShoulder, thresholds.minVisibility) &&
    isLandmarkVisible(rightElbow, thresholds.minVisibility) &&
    isLandmarkVisible(rightWrist, thresholds.minVisibility)

  if (!leftVisible && !rightVisible) {
    return null
  }

  if (leftVisible && rightVisible) {
    const leftAngle = calculateAngle(leftShoulder, leftElbow, leftWrist)
    const rightAngle = calculateAngle(rightShoulder, rightElbow, rightWrist)
    const smoothedLeft = state.leftElbowSmoother.next(leftAngle)
    const smoothedRight = state.rightElbowSmoother.next(rightAngle)
    return (smoothedLeft + smoothedRight) / 2
  }

  if (leftVisible) {
    const leftAngle = calculateAngle(leftShoulder, leftElbow, leftWrist)
    return state.leftElbowSmoother.next(leftAngle)
  }

  // rightVisible only
  const rightAngle = calculateAngle(rightShoulder!, rightElbow!, rightWrist!)
  return state.rightElbowSmoother.next(rightAngle)
}

/**
 * Compute the angle of a 2D vector from the horizontal plane (0° to 90°).
 * 0° = perfectly horizontal (lying flat on ground).
 * 90° = perfectly vertical (standing upright).
 */
export function computeAngleFromHorizontal(
  p1: NormalizedLandmark,
  p2: NormalizedLandmark,
): number {
  const dx = Math.abs(p1.x - p2.x)
  const dy = Math.abs(p1.y - p2.y)
  const rad = Math.atan2(dy, Math.max(dx, 0.0001))
  return rad * (180 / Math.PI)
}

/**
 * Determine whether the user's pose corresponds to a valid horizontal plank/push-up position.
 * Rejects standing poses, standing-to-floor transitions, and upright arm movements.
 */
export function isPlankPosition(landmarks: NormalizedLandmark[]): boolean {
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER]
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP]
  const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE]
  const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST]

  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP]
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE]
  const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST]

  const leftSideVisible =
    isLandmarkVisible(leftShoulder, thresholds.minVisibility) &&
    isLandmarkVisible(leftHip, thresholds.minVisibility)

  const rightSideVisible =
    isLandmarkVisible(rightShoulder, thresholds.minVisibility) &&
    isLandmarkVisible(rightHip, thresholds.minVisibility)

  if (!leftSideVisible && !rightSideVisible) {
    return false
  }

  // Select primary visible side (or average if both)
  let shoulder: NormalizedLandmark
  let hip: NormalizedLandmark
  let ankle: NormalizedLandmark | undefined
  let wrist: NormalizedLandmark | undefined

  if (leftSideVisible && rightSideVisible) {
    // Choose side with higher visibility score if available
    const leftVis = (leftShoulder?.visibility ?? 0) + (leftHip?.visibility ?? 0)
    const rightVis = (rightShoulder?.visibility ?? 0) + (rightHip?.visibility ?? 0)
    if (leftVis >= rightVis) {
      shoulder = leftShoulder
      hip = leftHip
      ankle = isLandmarkVisible(leftAnkle, thresholds.minVisibility) ? leftAnkle : undefined
      wrist = isLandmarkVisible(leftWrist, thresholds.minVisibility) ? leftWrist : undefined
    } else {
      shoulder = rightShoulder
      hip = rightHip
      ankle = isLandmarkVisible(rightAnkle, thresholds.minVisibility) ? rightAnkle : undefined
      wrist = isLandmarkVisible(rightWrist, thresholds.minVisibility) ? rightWrist : undefined
    }
  } else if (leftSideVisible) {
    shoulder = leftShoulder
    hip = leftHip
    ankle = isLandmarkVisible(leftAnkle, thresholds.minVisibility) ? leftAnkle : undefined
    wrist = isLandmarkVisible(leftWrist, thresholds.minVisibility) ? leftWrist : undefined
  } else {
    shoulder = rightShoulder
    hip = rightHip
    ankle = isLandmarkVisible(rightAnkle, thresholds.minVisibility) ? rightAnkle : undefined
    wrist = isLandmarkVisible(rightWrist, thresholds.minVisibility) ? rightWrist : undefined
  }

  // 1. Torso horizontal orientation check:
  // In standing: shoulder is directly above hip (angle > 70°).
  // In plank: torso is roughly horizontal (angle <= maxBodyAngleFromHorizontal, e.g. 45°).
  const torsoAngle = computeAngleFromHorizontal(shoulder, hip)
  if (torsoAngle > thresholds.maxBodyAngleFromHorizontal) {
    return false
  }

  // 2. Full-body horizontal check (if ankle is visible):
  if (ankle) {
    const bodyAngleFromHoriz = computeAngleFromHorizontal(shoulder, ankle)
    if (bodyAngleFromHoriz > thresholds.maxBodyAngleFromHorizontal) {
      return false
    }

    // 3. Plank straightness check (Shoulder -> Hip -> Ankle):
    // In standing-to-floor transitions (bending over), hip hinges deeply (< 120°).
    const alignmentAngle = calculateAngle(shoulder, hip, ankle)
    if (alignmentAngle < thresholds.minBodyAlignmentAngle) {
      return false
    }
  }

  // 4. Wrist position check (ground level):
  // Wrists must not be held above shoulders (which occurs in standing bicep curls or raised arms).
  // In normalized image coordinates, Y increases downwards, so wrist.y >= shoulder.y - 0.12.
  if (wrist && wrist.y < shoulder.y - 0.12) {
    return false
  }

  return true
}

/**
 * Compute body alignment (shoulder -> hip -> ankle).
 * Ideal plank posture forms a straight line (~160°–180°).
 */
export function computePushupBodyAlignment(landmarks: NormalizedLandmark[]): {
  bodyAngle: number | null
  isAligned: boolean
  issue: 'sag' | 'pike' | null
} {
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER]
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP]
  const leftAnkle = landmarks[POSE_LANDMARKS.LEFT_ANKLE]

  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP]
  const rightAnkle = landmarks[POSE_LANDMARKS.RIGHT_ANKLE]

  const leftVisible =
    isLandmarkVisible(leftShoulder, thresholds.minVisibility) &&
    isLandmarkVisible(leftHip, thresholds.minVisibility) &&
    isLandmarkVisible(leftAnkle, thresholds.minVisibility)

  const rightVisible =
    isLandmarkVisible(rightShoulder, thresholds.minVisibility) &&
    isLandmarkVisible(rightHip, thresholds.minVisibility) &&
    isLandmarkVisible(rightAnkle, thresholds.minVisibility)

  if (!leftVisible && !rightVisible) {
    return { bodyAngle: null, isAligned: true, issue: null }
  }

  let bodyAngle: number
  let shoulderY: number
  let hipY: number
  let ankleY: number

  if (leftVisible && rightVisible) {
    const leftAngle = calculateAngle(leftShoulder, leftHip, leftAnkle)
    const rightAngle = calculateAngle(rightShoulder, rightHip, rightAnkle)
    bodyAngle = (leftAngle + rightAngle) / 2
    shoulderY = (leftShoulder.y + rightShoulder.y) / 2
    hipY = (leftHip.y + rightHip.y) / 2
    ankleY = (leftAnkle.y + rightAnkle.y) / 2
  } else if (leftVisible) {
    bodyAngle = calculateAngle(leftShoulder, leftHip, leftAnkle)
    shoulderY = leftShoulder.y
    hipY = leftHip.y
    ankleY = leftAnkle.y
  } else {
    bodyAngle = calculateAngle(rightShoulder, rightHip, rightAnkle)
    shoulderY = rightShoulder.y
    hipY = rightHip.y
    ankleY = rightAnkle.y
  }

  // 145 degrees is the cue threshold for posture feedback (hips sagging vs piking)
  const isAligned = bodyAngle >= 145
  let issue: 'sag' | 'pike' | null = null

  if (!isAligned) {
    // In image coordinates, Y increases downward.
    const expectedHipY = (shoulderY + ankleY) / 2
    if (hipY > expectedHipY + 0.03) {
      issue = 'sag'
    } else if (hipY < expectedHipY - 0.03) {
      issue = 'pike'
    } else {
      issue = 'sag'
    }
  }

  return { bodyAngle, isAligned, issue }
}

// ---------------------------------------------------------------------------
// Form Analysis & Rep Rating
// ---------------------------------------------------------------------------

function generatePushupFormCues(
  elbowAngle: number,
  bodyInfo: { isAligned: boolean; issue: 'sag' | 'pike' | null },
  phase: PushupPhase,
  isPlank: boolean,
): FormCue[] {
  const cues: FormCue[] = []

  if (phase === 'TOP') {
    if (!isPlank) {
      cues.push({ message: 'Get into push-up plank', type: 'warning' })
    }
    return cues
  }

  // Active push-up phases:
  if (!bodyInfo.isAligned) {
    if (bodyInfo.issue === 'sag') {
      cues.push({ message: "Don't let your hips sag", type: 'warning' })
    } else if (bodyInfo.issue === 'pike') {
      cues.push({ message: 'Keep your body in a straight line', type: 'warning' })
    }
  }

  if (phase === 'DESCENDING' && elbowAngle > thresholds.bottomAngle + 20) {
    cues.push({ message: 'Lower your chest more', type: 'warning' })
  }

  if (phase === 'BOTTOM' && elbowAngle <= thresholds.goodDepthAngle) {
    cues.push({ message: 'Good depth', type: 'success' })
  }

  return cues
}

function ratePushupRep(deepestAngle: number, worstBodyAngle: number): FormRating {
  let score = 0
  const maxScore = 4

  // Depth (0-2 points)
  if (deepestAngle <= thresholds.goodDepthAngle) {
    score += 2
  } else if (deepestAngle <= thresholds.bottomAngle) {
    score += 1
  }

  // Body alignment (0-2 points)
  if (worstBodyAngle >= 145) {
    score += 2
  } else if (worstBodyAngle >= thresholds.minBodyAlignmentAngle) {
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
 * Process a single frame of pose landmarks through the push-up state machine.
 *
 * Call this once per animation frame. Pure computation that mutates module-level state.
 *
 * @param landmarks - Array of 33 NormalizedLandmark from MediaPipe
 * @param timestampMs - Monotonically increasing timestamp (performance.now())
 * @returns PushupFrameAnalysis snapshot for the UI to consume
 */
export function analyzePushupFrame(
  landmarks: NormalizedLandmark[],
  timestampMs: number,
): PushupFrameAnalysis {
  // 1. Compute elbow angle
  const elbowAngle = computeElbowAngle(landmarks)

  if (elbowAngle === null) {
    // If landmarks lost, reset stability
    state.consecutivePlankFrames = 0
    state.isPlankStable = false

    return {
      phase: state.phase,
      elbowAngle: null,
      repCount: state.repCount,
      currentFormCues: [{ message: 'Move into full view', type: 'warning' }],
      lastRepRating: state.lastRepRating,
      deepestAngle: state.deepestAngle,
      bodyAngle: null,
      isPlank: false,
    }
  }

  // 2. Evaluate horizontal plank position
  const isPlank = isPlankPosition(landmarks)
  if (isPlank) {
    state.consecutivePlankFrames += 1
    if (state.consecutivePlankFrames >= thresholds.minPlankStableFrames) {
      state.isPlankStable = true
    }
  } else {
    state.consecutivePlankFrames = 0
    state.isPlankStable = false
  }

  // 3. Compute body alignment for form tracking
  const bodyInfo = computePushupBodyAlignment(landmarks)
  if (bodyInfo.bodyAngle !== null && bodyInfo.bodyAngle < state.worstBodyAngle) {
    state.worstBodyAngle = bodyInfo.bodyAngle
  }

  // Track deepest elbow angle during current rep
  if (elbowAngle < state.deepestAngle) {
    state.deepestAngle = elbowAngle
  }

  // 4. State Machine with Plank Body Gate
  switch (state.phase) {
    case 'TOP':
      // CAN ONLY START A REP IF IN A VALID STABILIZED PLANK POSITION
      if (state.isPlankStable && elbowAngle < thresholds.descentAngle) {
        state.phase = 'DESCENDING'
        state.repStartTimestamp = timestampMs
        state.deepestAngle = elbowAngle
        state.worstBodyAngle = bodyInfo.bodyAngle ?? 180
      }
      break

    case 'DESCENDING':
      // If user stands up or breaks plank posture mid-descent, cancel the rep attempt
      if (!isPlank) {
        state.phase = 'TOP'
        state.repStartTimestamp = null
        state.deepestAngle = 180
        state.worstBodyAngle = 180
        state.consecutivePlankFrames = 0
        state.isPlankStable = false
        break
      }

      if (elbowAngle <= thresholds.bottomAngle) {
        state.phase = 'BOTTOM'
      } else if (elbowAngle >= thresholds.topAngle) {
        // Aborted descent without reaching bottom
        state.phase = 'TOP'
        state.repStartTimestamp = null
        state.deepestAngle = 180
        state.worstBodyAngle = 180
      }
      break

    case 'BOTTOM':
      // If user stands up or collapses from bottom position, cancel rep
      if (!isPlank) {
        state.phase = 'TOP'
        state.repStartTimestamp = null
        state.deepestAngle = 180
        state.worstBodyAngle = 180
        state.consecutivePlankFrames = 0
        state.isPlankStable = false
        break
      }

      if (elbowAngle > thresholds.bottomAngle + thresholds.bottomHysteresis) {
        // Hysteresis margin prevents oscillation at the inflection point
        state.phase = 'ASCENDING'
      }
      break

    case 'ASCENDING':
      // If user stands up mid-ascent, cancel the rep
      if (!isPlank) {
        state.phase = 'TOP'
        state.repStartTimestamp = null
        state.deepestAngle = 180
        state.worstBodyAngle = 180
        state.consecutivePlankFrames = 0
        state.isPlankStable = false
        break
      }

      if (elbowAngle >= thresholds.topAngle) {
        // Full cycle complete — validate rep duration AND require valid plank position
        const repDuration = state.repStartTimestamp
          ? timestampMs - state.repStartTimestamp
          : 0

        if (repDuration >= thresholds.minRepDurationMs && isPlank) {
          // VALID REP COUNTED
          state.repCount += 1
          state.lastRepRating = ratePushupRep(state.deepestAngle, state.worstBodyAngle)
        }

        // Reset for next rep
        state.phase = 'TOP'
        state.repStartTimestamp = null
        state.deepestAngle = 180
        state.worstBodyAngle = 180
      } else if (elbowAngle <= thresholds.bottomAngle) {
        // Dropped back down (double-bounce)
        state.phase = 'BOTTOM'
      }
      break
  }

  // 5. Generate form cues
  const formCues = generatePushupFormCues(elbowAngle, bodyInfo, state.phase, isPlank)
  state.currentFormCues = formCues

  return {
    phase: state.phase,
    elbowAngle,
    repCount: state.repCount,
    currentFormCues: formCues,
    lastRepRating: state.lastRepRating,
    deepestAngle: state.deepestAngle,
    bodyAngle: bodyInfo.bodyAngle,
    isPlank,
  }
}

/**
 * Reset the push-up analyzer to its initial state.
 * Optionally accepts partial threshold overrides.
 */
export function resetPushupAnalyzer(customThresholds?: Partial<PushupThresholds>): void {
  thresholds = { ...DEFAULT_PUSHUP_THRESHOLDS, ...customThresholds }
  state = createInitialPushupState(thresholds)
}

/**
 * Read-only snapshot of push-up analyzer state.
 */
export function getPushupState(): Readonly<{
  phase: PushupPhase
  repCount: number
  lastRepRating: FormRating | null
  isPlankStable: boolean
}> {
  return {
    phase: state.phase,
    repCount: state.repCount,
    lastRepRating: state.lastRepRating,
    isPlankStable: state.isPlankStable,
  }
}

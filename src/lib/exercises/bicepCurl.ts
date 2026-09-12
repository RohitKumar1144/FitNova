/**
 * Bicep Curl Analyzer — State-machine-based rep counter with form analysis and false-rep prevention.
 *
 * State machine: EXTENDED → CURLING_UP → CONTRACTED → LOWERING → EXTENDED (rep!)
 *
 * Requirements:
 * 1. Full-range curl required (starts at extended angle >= 150°, reaches contracted <= 65°, returns >= 150°).
 * 2. False-rep prevention:
 *    - Validates upper arm alignment (elbow stays relatively stable and close to the side of the torso;
 *      does not allow full arm swinging/raising to count as a curl).
 *    - Rejects rigid arm movements (waving, front raises, shoulder abduction).
 *    - Upright torso validation (user must be upright, not lying horizontally).
 * 3. Supports left arm, right arm, or automatic selection of the active/curling arm.
 * 4. Temporal duration guard (minRepDurationMs >= 700ms) to reject noisy camera artifacts.
 *
 * All thresholds are centralized in DEFAULT_BICEP_CURL_THRESHOLDS.
 * Pure logic with no React/DOM dependency.
 */

import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import { POSE_LANDMARKS } from '../mediapipe/landmarks'
import { calculateAngle } from '../utils/angles'
import { EMASmoother } from '../utils/smoothing'
import type {
  BicepCurlPhase,
  FormRating,
  FormCue,
  BicepCurlFrameAnalysis,
  BicepCurlThresholds,
} from './types'

// ---------------------------------------------------------------------------
// Default Thresholds (centralized, configurable via resetBicepCurlAnalyzer)
// ---------------------------------------------------------------------------

export const DEFAULT_BICEP_CURL_THRESHOLDS: BicepCurlThresholds = {
  extendedAngle: 150,
  curlStartAngle: 135,
  contractedAngle: 65,
  goodContractionAngle: 55,
  topHysteresis: 15,
  minVisibility: 0.15,
  minRepDurationMs: 700,
  smoothingAlpha: 0.35,
  maxElbowDriftAngle: 30,
  maxUpperArmDriftAngle: 35,
  maxElbowDisplacementRatio: 0.30,
  startingMaxDriftAngle: 25,
  minStartingStableFrames: 3,
}

// ---------------------------------------------------------------------------
// Internal State
// ---------------------------------------------------------------------------

interface StartingArmGeometry {
  leftElbow?: { x: number; y: number }
  rightElbow?: { x: number; y: number }
  torsoLength: number
}

interface BicepCurlAnalyzerState {
  phase: BicepCurlPhase
  repCount: number
  repStartTimestamp: number | null
  /** Smallest elbow angle reached during the current rep cycle. */
  contractedAngle: number
  /** Maximum elbow drift angle from torso during the current rep cycle. */
  worstElbowDrift: number
  /** Maximum elbow displacement ratio observed during current rep cycle. */
  worstElbowDisplacement: number
  /** Consecutive frames in a valid, extended starting position. */
  stableStartFrames: number
  /** Geometry captured at the moment the curl begins. */
  startGeometry: StartingArmGeometry | null
  lastRepRating: FormRating | null
  currentFormCues: FormCue[]
  leftElbowSmoother: EMASmoother
  rightElbowSmoother: EMASmoother
  activeArm: 'left' | 'right' | 'both'
}

function createInitialState(config: BicepCurlThresholds): BicepCurlAnalyzerState {
  return {
    phase: 'EXTENDED',
    repCount: 0,
    repStartTimestamp: null,
    contractedAngle: 180,
    worstElbowDrift: 0,
    worstElbowDisplacement: 0,
    stableStartFrames: 0,
    startGeometry: null,
    lastRepRating: null,
    currentFormCues: [],
    leftElbowSmoother: new EMASmoother(config.smoothingAlpha),
    rightElbowSmoother: new EMASmoother(config.smoothingAlpha),
    activeArm: 'both',
  }
}

let state: BicepCurlAnalyzerState = createInitialState(DEFAULT_BICEP_CURL_THRESHOLDS)
let thresholds: BicepCurlThresholds = { ...DEFAULT_BICEP_CURL_THRESHOLDS }

// ---------------------------------------------------------------------------
// Landmark Visibility & Geometry Helpers
// ---------------------------------------------------------------------------

function isLandmarkVisible(lm: NormalizedLandmark | undefined, minVisibility: number): boolean {
  return lm !== undefined && (lm.visibility === undefined || lm.visibility >= minVisibility)
}

/**
 * Calculates the torso length (distance between shoulders and hips).
 * Provides a distance-independent reference metric for displacement normalization.
 */
export function computeTorsoLength(landmarks: NormalizedLandmark[]): number {
  const ls = landmarks[POSE_LANDMARKS.LEFT_SHOULDER]
  const lh = landmarks[POSE_LANDMARKS.LEFT_HIP]
  const rs = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]
  const rh = landmarks[POSE_LANDMARKS.RIGHT_HIP]

  const leftLen = ls && lh ? Math.hypot(ls.x - lh.x, ls.y - lh.y) : 0
  const rightLen = rs && rh ? Math.hypot(rs.x - rh.x, rs.y - rh.y) : 0
  const maxLen = Math.max(leftLen, rightLen)
  if (maxLen > 0.1) return maxLen

  // Fallback: estimate from upper arm length * 1.5
  const le = landmarks[POSE_LANDMARKS.LEFT_ELBOW]
  if (ls && le) {
    const armLen = Math.hypot(ls.x - le.x, ls.y - le.y)
    if (armLen > 0.05) return armLen * 1.5
  }
  return 0.35 // Normalized default fallback
}

/**
 * Calculates displacement of the elbow from its starting position,
 * normalized by the user's torso length.
 */
export function computeElbowDisplacementRatio(
  currentElbow: NormalizedLandmark,
  startElbow: { x: number; y: number },
  torsoLength: number,
): number {
  if (torsoLength <= 0.05) return 0
  const dist = Math.hypot(currentElbow.x - startElbow.x, currentElbow.y - startElbow.y)
  return dist / torsoLength
}

/**
 * Calculates the forward/outward drift angle of the upper arm (shoulder to elbow)
 * relative to the torso (hip to shoulder vector).
 * In a clean bicep curl, the upper arm stays close to the torso (< 30°–35°).
 */
export function computeElbowDriftAngle(
  shoulder: NormalizedLandmark,
  elbow: NormalizedLandmark,
  hip?: NormalizedLandmark,
): number {
  if (hip && isLandmarkVisible(hip, thresholds.minVisibility)) {
    // Measure angle between torso vector (hip -> shoulder) and arm vector (shoulder -> elbow)
    const torsoVec = { x: shoulder.x - hip.x, y: shoulder.y - hip.y }
    const armVec = { x: elbow.x - shoulder.x, y: elbow.y - shoulder.y }

    const magTorso = Math.hypot(torsoVec.x, torsoVec.y)
    const magArm = Math.hypot(armVec.x, armVec.y)
    if (magTorso === 0 || magArm === 0) return 0

    // When arm hangs straight down along torso, armVec is opposite to torsoVec (dot/(m1*m2) = -1, angle = 180°)
    const dot = (torsoVec.x * armVec.x + torsoVec.y * armVec.y) / (magTorso * magArm)
    const clampedDot = Math.max(-1, Math.min(1, dot))
    const angleRad = Math.acos(clampedDot)
    const angleDeg = angleRad * (180 / Math.PI)

    // Deviation from straight hanging downward (180° opposite to upward torso)
    return Math.abs(180 - angleDeg)
  }

  // Fallback: deviation from straight down {0, 1}
  const dx = elbow.x - shoulder.x
  const dy = elbow.y - shoulder.y
  const mag = Math.hypot(dx, dy)
  if (mag === 0) return 0
  const dotDown = dy / mag
  const clamped = Math.max(-1, Math.min(1, dotDown))
  return Math.acos(clamped) * (180 / Math.PI)
}

/**
 * Checks whether the user is upright (standing or seated) rather than lying down.
 */
function isUserUpright(landmarks: NormalizedLandmark[]): boolean {
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER]
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP]
  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP]

  const leftVis =
    isLandmarkVisible(leftShoulder, thresholds.minVisibility) &&
    isLandmarkVisible(leftHip, thresholds.minVisibility)
  const rightVis =
    isLandmarkVisible(rightShoulder, thresholds.minVisibility) &&
    isLandmarkVisible(rightHip, thresholds.minVisibility)

  let s = leftShoulder
  let h = leftHip
  if (rightVis && (!leftVis || (rightShoulder.visibility ?? 0) > (leftShoulder.visibility ?? 0))) {
    s = rightShoulder
    h = rightHip
  } else if (!leftVis) {
    return true // If hip is not visible, don't block
  }

  const dx = Math.abs(s.x - h.x)
  const dy = Math.abs(s.y - h.y)
  const angleFromVertical = Math.atan2(dx, dy) * (180 / Math.PI)
  return angleFromVertical <= 50 // Torso must be within 50° of vertical
}

// ---------------------------------------------------------------------------
// Form Analysis & Rep Rating
// ---------------------------------------------------------------------------

function generateBicepCurlFormCues(
  elbowAngle: number,
  elbowDrift: number,
  elbowDisplacement: number,
  phase: BicepCurlPhase,
): FormCue[] {
  const cues: FormCue[] = []

  if (
    elbowDrift > thresholds.maxElbowDriftAngle ||
    elbowDisplacement > thresholds.maxElbowDisplacementRatio * 0.7
  ) {
    cues.push({ message: 'Keep your elbow close to your side', type: 'warning' })
  }

  if (phase === 'CURLING_UP' && elbowAngle > thresholds.contractedAngle + 25) {
    cues.push({ message: 'Curl all the way up', type: 'warning' })
  }

  if (phase === 'CONTRACTED') {
    if (elbowAngle <= thresholds.goodContractionAngle) {
      cues.push({ message: 'Great squeeze!', type: 'success' })
    }
  }

  if (phase === 'LOWERING' && elbowAngle < thresholds.extendedAngle - 20) {
    cues.push({ message: 'Extend your arm fully', type: 'warning' })
  }

  return cues
}

function rateBicepCurlRep(
  contractedAngle: number,
  worstElbowDrift: number,
  worstElbowDisplacement: number,
): FormRating {
  let score = 0
  const maxScore = 4

  // Contraction Range (0-2 pts)
  if (contractedAngle <= thresholds.goodContractionAngle) {
    score += 2
  } else if (contractedAngle <= thresholds.contractedAngle) {
    score += 1
  }

  // Elbow Stability / Upper Arm Stillness (0-2 pts)
  if (
    worstElbowDrift <= thresholds.maxElbowDriftAngle &&
    worstElbowDisplacement <= thresholds.maxElbowDisplacementRatio * 0.6
  ) {
    score += 2
  } else if (
    worstElbowDrift <= thresholds.maxUpperArmDriftAngle &&
    worstElbowDisplacement <= thresholds.maxElbowDisplacementRatio
  ) {
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
 * Process a single frame of pose landmarks through the bicep curl state machine.
 */
export function analyzeBicepCurlFrame(
  landmarks: NormalizedLandmark[],
  timestampMs: number,
): BicepCurlFrameAnalysis {
  const leftShoulder = landmarks[POSE_LANDMARKS.LEFT_SHOULDER]
  const leftElbow = landmarks[POSE_LANDMARKS.LEFT_ELBOW]
  const leftWrist = landmarks[POSE_LANDMARKS.LEFT_WRIST]
  const leftHip = landmarks[POSE_LANDMARKS.LEFT_HIP]

  const rightShoulder = landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]
  const rightElbow = landmarks[POSE_LANDMARKS.RIGHT_ELBOW]
  const rightWrist = landmarks[POSE_LANDMARKS.RIGHT_WRIST]
  const rightHip = landmarks[POSE_LANDMARKS.RIGHT_HIP]

  const leftVisible =
    isLandmarkVisible(leftShoulder, thresholds.minVisibility) &&
    isLandmarkVisible(leftElbow, thresholds.minVisibility) &&
    isLandmarkVisible(leftWrist, thresholds.minVisibility)

  const rightVisible =
    isLandmarkVisible(rightShoulder, thresholds.minVisibility) &&
    isLandmarkVisible(rightElbow, thresholds.minVisibility) &&
    isLandmarkVisible(rightWrist, thresholds.minVisibility)

  // 1. Visibility gate
  if (!leftVisible && !rightVisible) {
    return {
      phase: state.phase,
      elbowAngle: null,
      repCount: state.repCount,
      currentFormCues: [{ message: 'Move into full view', type: 'warning' }],
      lastRepRating: state.lastRepRating,
      contractedAngle: state.contractedAngle,
      activeArm: state.activeArm,
    }
  }

  // 2. Upright posture validation (cannot curl while lying down)
  if (!isUserUpright(landmarks)) {
    if (state.phase !== 'EXTENDED') {
      state.phase = 'EXTENDED'
      state.repStartTimestamp = null
      state.contractedAngle = 180
      state.worstElbowDrift = 0
      state.worstElbowDisplacement = 0
      state.stableStartFrames = 0
      state.startGeometry = null
    }

    return {
      phase: state.phase,
      elbowAngle: null,
      repCount: state.repCount,
      currentFormCues: [{ message: 'Stand or sit upright', type: 'warning' }],
      lastRepRating: state.lastRepRating,
      contractedAngle: state.contractedAngle,
      activeArm: state.activeArm,
    }
  }

  // 3. Compute elbow angles & smooth
  let leftAngle: number | null = null
  let rightAngle: number | null = null

  if (leftVisible) {
    const rawLeft = calculateAngle(leftShoulder, leftElbow, leftWrist)
    leftAngle = state.leftElbowSmoother.next(rawLeft)
  }
  if (rightVisible) {
    const rawRight = calculateAngle(rightShoulder, rightElbow, rightWrist)
    rightAngle = state.rightElbowSmoother.next(rawRight)
  }

  // 4. Select active arm (or both)
  let activeArm: 'left' | 'right' | 'both' = 'both'
  let primaryElbowAngle: number
  let primaryElbowDrift: number

  if (leftAngle !== null && rightAngle !== null) {
    const leftDrift = computeElbowDriftAngle(leftShoulder, leftElbow, leftHip)
    const rightDrift = computeElbowDriftAngle(rightShoulder, rightElbow, rightHip)

    // Check if both arms are curling simultaneously
    const bothCurling = leftAngle < thresholds.curlStartAngle && rightAngle < thresholds.curlStartAngle
    if (bothCurling) {
      activeArm = 'both'
      primaryElbowAngle = (leftAngle + rightAngle) / 2
      primaryElbowDrift = Math.max(leftDrift, rightDrift)
    } else if (leftAngle < rightAngle - 10) {
      activeArm = 'left'
      primaryElbowAngle = leftAngle
      primaryElbowDrift = leftDrift
    } else if (rightAngle < leftAngle - 10) {
      activeArm = 'right'
      primaryElbowAngle = rightAngle
      primaryElbowDrift = rightDrift
    } else {
      // Both similar / extended: choose arm with higher landmark visibility
      const leftVis = (leftShoulder.visibility ?? 0) + (leftElbow.visibility ?? 0) + (leftWrist.visibility ?? 0)
      const rightVis = (rightShoulder.visibility ?? 0) + (rightElbow.visibility ?? 0) + (rightWrist.visibility ?? 0)
      if (leftVis >= rightVis) {
        activeArm = 'left'
        primaryElbowAngle = leftAngle
        primaryElbowDrift = leftDrift
      } else {
        activeArm = 'right'
        primaryElbowAngle = rightAngle
        primaryElbowDrift = rightDrift
      }
    }
  } else if (leftAngle !== null) {
    activeArm = 'left'
    primaryElbowAngle = leftAngle
    primaryElbowDrift = computeElbowDriftAngle(leftShoulder, leftElbow, leftHip)
  } else {
    activeArm = 'right'
    primaryElbowAngle = rightAngle!
    primaryElbowDrift = computeElbowDriftAngle(rightShoulder, rightElbow, rightHip)
  }

  state.activeArm = activeArm

  // 5. Calculate body-relative elbow displacement if rep is active
  let currentDisplacementRatio = 0
  if (state.startGeometry) {
    const torsoLength = state.startGeometry.torsoLength
    if (activeArm === 'left' && state.startGeometry.leftElbow && leftVisible) {
      currentDisplacementRatio = computeElbowDisplacementRatio(
        leftElbow,
        state.startGeometry.leftElbow,
        torsoLength,
      )
    } else if (activeArm === 'right' && state.startGeometry.rightElbow && rightVisible) {
      currentDisplacementRatio = computeElbowDisplacementRatio(
        rightElbow,
        state.startGeometry.rightElbow,
        torsoLength,
      )
    } else if (activeArm === 'both') {
      const leftDisp =
        state.startGeometry.leftElbow && leftVisible
          ? computeElbowDisplacementRatio(leftElbow, state.startGeometry.leftElbow, torsoLength)
          : 0
      const rightDisp =
        state.startGeometry.rightElbow && rightVisible
          ? computeElbowDisplacementRatio(rightElbow, state.startGeometry.rightElbow, torsoLength)
          : 0
      currentDisplacementRatio = Math.max(leftDisp, rightDisp)
    }
  }

  // 6. State Machine Transitions with Strict Stability & Starting Validation
  switch (state.phase) {
    case 'EXTENDED': {
      // Valid starting posture check:
      // - Arm is reasonably extended
      // - Upper arm is hanging down near the torso
      const isArmExtended = primaryElbowAngle >= thresholds.extendedAngle - 10
      const isElbowNearTorso = primaryElbowDrift <= thresholds.startingMaxDriftAngle

      if (isArmExtended && isElbowNearTorso) {
        state.stableStartFrames += 1
      } else if (!isElbowNearTorso) {
        // If elbow drifted away from torso (e.g. arm raised), immediately cancel ready state
        state.stableStartFrames = 0
      }

      const isReadyToCurl = state.stableStartFrames >= thresholds.minStartingStableFrames

      // Only initiate rep if user was stable in starting posture and now begins flexing elbow
      if (
        isReadyToCurl &&
        primaryElbowAngle < thresholds.curlStartAngle &&
        primaryElbowDrift <= thresholds.startingMaxDriftAngle + 10
      ) {
        const torsoLength = computeTorsoLength(landmarks)
        state.phase = 'CURLING_UP'
        state.repStartTimestamp = timestampMs
        state.contractedAngle = primaryElbowAngle
        state.worstElbowDrift = primaryElbowDrift
        state.worstElbowDisplacement = 0
        state.startGeometry = {
          leftElbow: leftVisible ? { x: leftElbow.x, y: leftElbow.y } : undefined,
          rightElbow: rightVisible ? { x: rightElbow.x, y: rightElbow.y } : undefined,
          torsoLength,
        }
        state.stableStartFrames = 0
      }
      break
    }

    case 'CURLING_UP':
    case 'CONTRACTED':
    case 'LOWERING': {
      // Update worst-case tracking metrics during this rep
      state.worstElbowDrift = Math.max(state.worstElbowDrift, primaryElbowDrift)
      state.worstElbowDisplacement = Math.max(state.worstElbowDisplacement, currentDisplacementRatio)

      // STABILITY REJECTION GATE:
      // If elbow moves excessively from starting position OR upper arm raises substantially
      const elbowDisplacedTooMuch = currentDisplacementRatio > thresholds.maxElbowDisplacementRatio
      const upperArmRaisedTooMuch = primaryElbowDrift > thresholds.maxUpperArmDriftAngle

      if (elbowDisplacedTooMuch || upperArmRaisedTooMuch) {
        // INVALID MOVEMENT — ABORT REP IMMEDIATELY
        state.phase = 'EXTENDED'
        state.repStartTimestamp = null
        state.contractedAngle = 180
        state.worstElbowDrift = 0
        state.worstElbowDisplacement = 0
        state.stableStartFrames = 0
        state.startGeometry = null
        state.currentFormCues = [{ message: 'Keep your elbow close to your side', type: 'warning' }]

        return {
          phase: state.phase,
          elbowAngle: primaryElbowAngle,
          repCount: state.repCount,
          currentFormCues: state.currentFormCues,
          lastRepRating: state.lastRepRating,
          contractedAngle: state.contractedAngle,
          activeArm: state.activeArm,
        }
      }

      if (state.phase === 'CURLING_UP') {
        if (primaryElbowAngle <= thresholds.contractedAngle) {
          state.phase = 'CONTRACTED'
        } else if (primaryElbowAngle >= thresholds.extendedAngle) {
          // Aborted curl: returned to extension without completing contraction
          state.phase = 'EXTENDED'
          state.repStartTimestamp = null
          state.contractedAngle = 180
          state.worstElbowDrift = 0
          state.worstElbowDisplacement = 0
          state.stableStartFrames = 1
          state.startGeometry = null
        }
      } else if (state.phase === 'CONTRACTED') {
        if (primaryElbowAngle < state.contractedAngle) {
          state.contractedAngle = primaryElbowAngle
        }
        if (primaryElbowAngle > thresholds.contractedAngle + thresholds.topHysteresis) {
          state.phase = 'LOWERING'
        }
      } else if (state.phase === 'LOWERING') {
        if (primaryElbowAngle >= thresholds.extendedAngle) {
          // Returned to full extension — validate rep completion
          const repDuration = state.repStartTimestamp
            ? timestampMs - state.repStartTimestamp
            : 0

          if (
            repDuration >= thresholds.minRepDurationMs &&
            state.worstElbowDrift <= thresholds.maxUpperArmDriftAngle &&
            state.worstElbowDisplacement <= thresholds.maxElbowDisplacementRatio
          ) {
            state.repCount += 1
            state.lastRepRating = rateBicepCurlRep(
              state.contractedAngle,
              state.worstElbowDrift,
              state.worstElbowDisplacement,
            )
          }

          // Reset for next rep
          state.phase = 'EXTENDED'
          state.repStartTimestamp = null
          state.contractedAngle = 180
          state.worstElbowDrift = 0
          state.worstElbowDisplacement = 0
          state.startGeometry = null
          state.stableStartFrames = 1 // Already in extended position
        } else if (primaryElbowAngle <= thresholds.contractedAngle) {
          // Curled back up
          state.phase = 'CONTRACTED'
        }
      }
      break
    }
  }

  // 7. Generate real-time form cues
  const formCues = generateBicepCurlFormCues(
    primaryElbowAngle,
    primaryElbowDrift,
    currentDisplacementRatio,
    state.phase,
  )
  state.currentFormCues = formCues

  return {
    phase: state.phase,
    elbowAngle: primaryElbowAngle,
    repCount: state.repCount,
    currentFormCues: formCues,
    lastRepRating: state.lastRepRating,
    contractedAngle: state.contractedAngle,
    activeArm: state.activeArm,
  }
}

/**
 * Reset the bicep curl analyzer to its initial state.
 */
export function resetBicepCurlAnalyzer(customThresholds?: Partial<BicepCurlThresholds>): void {
  thresholds = { ...DEFAULT_BICEP_CURL_THRESHOLDS, ...customThresholds }
  state = createInitialState(thresholds)
}

/**
 * Read-only snapshot of bicep curl analyzer state.
 */
export function getBicepCurlState(): Readonly<{
  phase: BicepCurlPhase
  repCount: number
  lastRepRating: FormRating | null
  activeArm: 'left' | 'right' | 'both'
  worstElbowDrift: number
  worstElbowDisplacement: number
}> {
  return {
    phase: state.phase,
    repCount: state.repCount,
    lastRepRating: state.lastRepRating,
    activeArm: state.activeArm,
    worstElbowDrift: state.worstElbowDrift,
    worstElbowDisplacement: state.worstElbowDisplacement,
  }
}

import type { NormalizedLandmark } from '@mediapipe/tasks-vision'
import type { SquatPhase, PushupPhase, BicepCurlPhase, FormRating } from './types'
import { computeTorsoLeanAngle, isKneeAlignmentGood } from './squat'
import { computePushupBodyAlignment } from './pushup'
import { computeElbowDriftAngle } from './bicepCurl'
import { POSE_LANDMARKS } from '../mediapipe/landmarks'

export type FormStatus = 'GOOD' | 'NEEDS_IMPROVEMENT' | 'SEARCHING'
export type FeedbackType = 'success' | 'warning' | 'info'

export interface PrioritizedFeedback {
  status: FormStatus
  message: string
  type: FeedbackType
}

export interface FeedbackInput {
  isTracking: boolean
  isFullyVisible: boolean
  phase: SquatPhase
  kneeAngle: number | null
  deepestAngle: number
  landmarks: NormalizedLandmark[] | null
  lastRepRating: FormRating | null
  timestampMs: number
}

/**
 * Evaluates raw feedback for the current frame based on the strict priority hierarchy:
 * 1. Tracking / visibility problem
 * 2. Squat depth
 * 3. Knee alignment
 * 4. Excessive torso lean
 * 5. Phase guidance & positive confirmation
 */
export function evaluateRawFeedback(input: FeedbackInput): PrioritizedFeedback {
  const {
    isTracking,
    isFullyVisible,
    phase,
    deepestAngle,
    landmarks,
    lastRepRating,
  } = input

  // -------------------------------------------------------------------------
  // Priority 1: Tracking / Visibility Problem
  // -------------------------------------------------------------------------
  if (!isTracking) {
    return {
      status: 'SEARCHING',
      message: 'Searching for pose...',
      type: 'warning',
    }
  }

  if (!isFullyVisible || !landmarks) {
    return {
      status: 'SEARCHING',
      message: 'Move into full view',
      type: 'warning',
    }
  }

  // -------------------------------------------------------------------------
  // Priority 2: Squat Depth
  // Evaluated when user reaches bottom or is coming back up
  // -------------------------------------------------------------------------
  if (phase === 'BOTTOM' || phase === 'ASCENDING') {
    // If user bottomed out too high (shallow squat)
    if (deepestAngle > 125) {
      return {
        status: 'NEEDS_IMPROVEMENT',
        message: 'Go a little deeper',
        type: 'warning',
      }
    }
    // If user achieved excellent depth at bottom
    if (phase === 'BOTTOM' && deepestAngle <= 110) {
      return {
        status: 'GOOD',
        message: 'Good depth',
        type: 'success',
      }
    }
  }

  // -------------------------------------------------------------------------
  // Priority 3: Knee Alignment
  // Check if knees are caving inward during movement
  // -------------------------------------------------------------------------
  if (phase !== 'STANDING' && !isKneeAlignmentGood(landmarks)) {
    return {
      status: 'NEEDS_IMPROVEMENT',
      message: 'Keep your knees aligned',
      type: 'warning',
    }
  }

  // -------------------------------------------------------------------------
  // Priority 4: Excessive Torso Lean
  // Check forward shoulder-hip angle from vertical
  // -------------------------------------------------------------------------
  if (phase !== 'STANDING') {
    const torsoLean = computeTorsoLeanAngle(landmarks)
    if (torsoLean > 45) {
      return {
        status: 'NEEDS_IMPROVEMENT',
        message: 'Keep your chest more upright',
        type: 'warning',
      }
    }
  }

  // -------------------------------------------------------------------------
  // Priority 5: Phase Guidance & Positive Confirmation
  // When no warnings are present, provide encouraging real-time phase feedback
  // -------------------------------------------------------------------------
  switch (phase) {
    case 'DESCENDING':
      return {
        status: 'GOOD',
        message: 'Keep going',
        type: 'info',
      }

    case 'BOTTOM':
      return {
        status: 'GOOD',
        message: 'Drive back up',
        type: 'success',
      }

    case 'ASCENDING':
      return {
        status: 'GOOD',
        message: 'Stand tall',
        type: 'info',
      }

    case 'STANDING':
    default:
      if (lastRepRating === 'good') {
        return {
          status: 'GOOD',
          message: 'Good form',
          type: 'success',
        }
      }
      return {
        status: 'GOOD',
        message: 'Get ready',
        type: 'info',
      }
  }
}

export interface PushupFeedbackInput {
  isTracking: boolean
  isFullyVisible: boolean
  phase: PushupPhase
  elbowAngle: number | null
  deepestAngle: number
  bodyAngle: number | null
  landmarks: NormalizedLandmark[] | null
  lastRepRating: FormRating | null
  timestampMs: number
  isPlank?: boolean
}

/**
 * Evaluates raw feedback for push-ups based on priority hierarchy:
 * 1. Tracking / visibility
 * 2. Push-up depth
 * 3. Body alignment (hip sag / pike)
 * 4. Phase guidance & positive encouragement
 */
export function evaluatePushupRawFeedback(input: PushupFeedbackInput): PrioritizedFeedback {
  const {
    isTracking,
    isFullyVisible,
    phase,
    deepestAngle,
    landmarks,
    lastRepRating,
  } = input

  // Priority 1: Tracking / Visibility Problem
  if (!isTracking) {
    return {
      status: 'SEARCHING',
      message: 'Searching for pose...',
      type: 'warning',
    }
  }

  if (!isFullyVisible || !landmarks) {
    return {
      status: 'SEARCHING',
      message: 'Move into full view',
      type: 'warning',
    }
  }

  // Priority 2: Push-up Depth
  if (phase === 'BOTTOM' || phase === 'ASCENDING') {
    if (deepestAngle > 105) {
      return {
        status: 'NEEDS_IMPROVEMENT',
        message: 'Lower your chest more',
        type: 'warning',
      }
    }
    if (phase === 'BOTTOM' && deepestAngle <= 95) {
      return {
        status: 'GOOD',
        message: 'Good depth',
        type: 'success',
      }
    }
  }

  // Priority 3: Body Alignment (Sag or Pike)
  if (phase !== 'TOP' && landmarks) {
    const alignment = computePushupBodyAlignment(landmarks)
    if (!alignment.isAligned) {
      if (alignment.issue === 'sag') {
        return {
          status: 'NEEDS_IMPROVEMENT',
          message: "Don't let your hips sag",
          type: 'warning',
        }
      } else {
        return {
          status: 'NEEDS_IMPROVEMENT',
          message: 'Keep your body in a straight line',
          type: 'warning',
        }
      }
    }
  }

  // Priority 4: Phase Guidance & Encouragement
  switch (phase) {
    case 'DESCENDING':
      return {
        status: 'GOOD',
        message: 'Keep going',
        type: 'info',
      }

    case 'BOTTOM':
      return {
        status: 'GOOD',
        message: 'Drive back up',
        type: 'success',
      }

    case 'ASCENDING':
      return {
        status: 'GOOD',
        message: 'Push all the way up',
        type: 'info',
      }

    case 'TOP':
    default:
      if (input.isPlank === false) {
        return {
          status: 'GOOD',
          message: 'Get into push-up plank',
          type: 'info',
        }
      }
      if (lastRepRating === 'good') {
        return {
          status: 'GOOD',
          message: 'Good form',
          type: 'success',
        }
      }
      return {
        status: 'GOOD',
        message: 'Plank ready',
        type: 'info',
      }
  }
}

export interface BicepCurlFeedbackInput {
  isTracking: boolean
  isFullyVisible: boolean
  phase: BicepCurlPhase
  elbowAngle: number | null
  contractedAngle: number
  landmarks: NormalizedLandmark[] | null
  lastRepRating: FormRating | null
  timestampMs: number
  activeArm?: 'left' | 'right' | 'both'
}

/**
 * Evaluates raw feedback for bicep curls based on priority hierarchy:
 * 1. Tracking / visibility
 * 2. Range of motion (curl high enough)
 * 3. Arm extension (extend arm fully)
 * 4. Elbow position (keep elbow close to side)
 * 5. Phase guidance & positive encouragement
 */
export function evaluateBicepCurlRawFeedback(input: BicepCurlFeedbackInput): PrioritizedFeedback {
  const {
    isTracking,
    isFullyVisible,
    phase,
    elbowAngle,
    contractedAngle,
    landmarks,
    lastRepRating,
    activeArm = 'both',
  } = input

  // Priority 1: Tracking / Visibility Problem
  if (!isTracking) {
    return {
      status: 'SEARCHING',
      message: 'Searching for pose...',
      type: 'warning',
    }
  }

  if (!isFullyVisible || !landmarks) {
    return {
      status: 'SEARCHING',
      message: 'Move into full view',
      type: 'warning',
    }
  }

  // Priority 2: Range of Motion (Contraction)
  if (phase === 'CONTRACTED' || phase === 'LOWERING') {
    if (contractedAngle > 75) {
      return {
        status: 'NEEDS_IMPROVEMENT',
        message: 'Full curl — curl higher',
        type: 'warning',
      }
    }
    if (phase === 'CONTRACTED' && contractedAngle <= 55) {
      return {
        status: 'GOOD',
        message: 'Great squeeze!',
        type: 'success',
      }
    }
  }

  // Priority 3: Arm Extension
  if (phase === 'LOWERING' && elbowAngle !== null && elbowAngle < 125) {
    return {
      status: 'NEEDS_IMPROVEMENT',
      message: 'Extend your arm fully',
      type: 'warning',
    }
  }

  // Priority 4: Elbow Position / Flaring
  if (landmarks && (phase === 'CURLING_UP' || phase === 'CONTRACTED')) {
    const isLeft = activeArm === 'left' || activeArm === 'both'
    const isRight = activeArm === 'right' || activeArm === 'both'
    let excessiveDrift = false

    if (isLeft) {
      const leftDrift = computeElbowDriftAngle(
        landmarks[POSE_LANDMARKS.LEFT_SHOULDER],
        landmarks[POSE_LANDMARKS.LEFT_ELBOW],
        landmarks[POSE_LANDMARKS.LEFT_HIP],
      )
      if (leftDrift > 30) excessiveDrift = true
    }
    if (!excessiveDrift && isRight) {
      const rightDrift = computeElbowDriftAngle(
        landmarks[POSE_LANDMARKS.RIGHT_SHOULDER],
        landmarks[POSE_LANDMARKS.RIGHT_ELBOW],
        landmarks[POSE_LANDMARKS.RIGHT_HIP],
      )
      if (rightDrift > 30) excessiveDrift = true
    }

    if (excessiveDrift) {
      return {
        status: 'NEEDS_IMPROVEMENT',
        message: 'Keep your elbow close to your side',
        type: 'warning',
      }
    }
  }

  // Priority 5: Phase Guidance & Encouragement
  switch (phase) {
    case 'CURLING_UP':
      return {
        status: 'GOOD',
        message: 'Curl up',
        type: 'info',
      }

    case 'CONTRACTED':
      return {
        status: 'GOOD',
        message: 'Squeeze bicep',
        type: 'success',
      }

    case 'LOWERING':
      return {
        status: 'GOOD',
        message: 'Lower with control',
        type: 'info',
      }

    case 'EXTENDED':
    default:
      if (lastRepRating === 'good') {
        return {
          status: 'GOOD',
          message: 'Good form',
          type: 'success',
        }
      }
      return {
        status: 'GOOD',
        message: 'Ready to curl',
        type: 'info',
      }
  }
}

/**
 * Stabilizes real-time feedback messages to prevent rapid frame-by-frame flickering.
 *
 * Rules:
 * 1. Tracking errors immediately override everything without delay.
 * 2. Candidate messages must persist for at least `MIN_CONSECUTIVE_FRAMES` (e.g. 3 frames, ~50ms).
 * 3. Warning messages are held for at least `HOLD_DURATION_MS` (800ms) before transitioning
 *    to lower-priority info/success messages.
 * 4. Form status ('GOOD' vs 'NEEDS_IMPROVEMENT') is debounced to avoid status jitter.
 */
export class FeedbackStabilizer {
  private currentDisplayed: PrioritizedFeedback = {
    status: 'SEARCHING',
    message: 'Searching for pose...',
    type: 'warning',
  }

  private candidateFeedback: PrioritizedFeedback | null = null
  private candidateCount: number = 0
  private lastMessageChangeTime: number = 0

  // Status stabilization
  private stableStatus: FormStatus = 'SEARCHING'
  private statusCandidate: FormStatus = 'SEARCHING'
  private statusCandidateCount: number = 0

  private readonly MIN_CONSECUTIVE_FRAMES = 3
  private readonly STATUS_GOOD_RECOVERY_FRAMES = 6
  private readonly HOLD_DURATION_MS = 800

  /**
   * Process an incoming squat frame and return the temporally stabilized feedback.
   */
  processFrame(input: FeedbackInput): PrioritizedFeedback {
    const raw = evaluateRawFeedback(input)
    return this.processRaw(raw, input.timestampMs)
  }

  /**
   * Process an incoming push-up frame and return the temporally stabilized feedback.
   */
  processPushupFrame(input: PushupFeedbackInput): PrioritizedFeedback {
    const raw = evaluatePushupRawFeedback(input)
    return this.processRaw(raw, input.timestampMs)
  }

  /**
   * Process an incoming bicep curl frame and return the temporally stabilized feedback.
   */
  processBicepCurlFrame(input: BicepCurlFeedbackInput): PrioritizedFeedback {
    const raw = evaluateBicepCurlRawFeedback(input)
    return this.processRaw(raw, input.timestampMs)
  }

  /**
   * Stabilize any prioritized feedback stream temporally.
   */
  processRaw(raw: PrioritizedFeedback, now: number): PrioritizedFeedback {
    // Rule 1: Immediate override for critical tracking loss
    if (raw.status === 'SEARCHING') {
      this.currentDisplayed = raw
      this.stableStatus = 'SEARCHING'
      this.candidateFeedback = null
      this.candidateCount = 0
      this.statusCandidate = 'SEARCHING'
      this.statusCandidateCount = 0
      this.lastMessageChangeTime = now
      return this.currentDisplayed
    }

    // Stabilize Form Status (GOOD vs NEEDS_IMPROVEMENT)
    if (raw.status !== this.stableStatus) {
      if (raw.status === this.statusCandidate) {
        this.statusCandidateCount += 1
        const requiredFrames =
          raw.status === 'GOOD'
            ? this.STATUS_GOOD_RECOVERY_FRAMES
            : this.MIN_CONSECUTIVE_FRAMES

        if (this.statusCandidateCount >= requiredFrames) {
          this.stableStatus = raw.status
        }
      } else {
        this.statusCandidate = raw.status
        this.statusCandidateCount = 1
      }
    } else {
      this.statusCandidate = raw.status
      this.statusCandidateCount = 0
    }

    // Stabilize Message
    const isWarning = this.currentDisplayed.type === 'warning'
    const timeSinceChange = now - this.lastMessageChangeTime
    const isHoldActive = isWarning && timeSinceChange < this.HOLD_DURATION_MS

    // If hold is active on a warning and the new message is lower priority, keep holding
    if (isHoldActive && raw.type !== 'warning') {
      return {
        ...this.currentDisplayed,
        status: this.stableStatus,
      }
    }

    // If message matches currently displayed, reset candidate
    if (raw.message === this.currentDisplayed.message) {
      this.candidateFeedback = null
      this.candidateCount = 0
      this.currentDisplayed.status = this.stableStatus
      return this.currentDisplayed
    }

    // Debounce candidate message
    if (
      this.candidateFeedback &&
      this.candidateFeedback.message === raw.message
    ) {
      this.candidateCount += 1
      if (this.candidateCount >= this.MIN_CONSECUTIVE_FRAMES) {
        this.currentDisplayed = {
          ...raw,
          status: this.stableStatus,
        }
        this.lastMessageChangeTime = now
        this.candidateFeedback = null
        this.candidateCount = 0
      }
    } else {
      this.candidateFeedback = raw
      this.candidateCount = 1
    }

    return {
      ...this.currentDisplayed,
      status: this.stableStatus,
    }
  }

  /**
   * Reset all state (called on session reset / new workout).
   */
  reset(): void {
    this.currentDisplayed = {
      status: 'SEARCHING',
      message: 'Searching for pose...',
      type: 'warning',
    }
    this.candidateFeedback = null
    this.candidateCount = 0
    this.lastMessageChangeTime = 0
    this.stableStatus = 'SEARCHING'
    this.statusCandidate = 'SEARCHING'
    this.statusCandidateCount = 0
  }
}

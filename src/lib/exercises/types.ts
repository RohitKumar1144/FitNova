/**
 * Shared types for exercise analysis modules.
 * These types are used by squat.ts, and in future by pushup.ts and bicepCurl.ts.
 */

// ---------------------------------------------------------------------------
// State Machine
// ---------------------------------------------------------------------------

/** Squat state machine phases — one complete cycle = one rep. */
export type SquatPhase = 'STANDING' | 'DESCENDING' | 'BOTTOM' | 'ASCENDING'

// ---------------------------------------------------------------------------
// Form Feedback
// ---------------------------------------------------------------------------

/** Overall quality rating for a completed rep. */
export type FormRating = 'good' | 'fair' | 'poor'

/** A single form feedback cue shown to the user. */
export interface FormCue {
  message: string
  type: 'success' | 'warning' | 'error'
}

// ---------------------------------------------------------------------------
// Frame Analysis Result
// ---------------------------------------------------------------------------

/** Result returned by the analyzer for every processed frame. */
export interface FrameAnalysis {
  /** Current state machine phase. */
  phase: SquatPhase
  /** Smoothed average knee angle in degrees, or null if landmarks not visible. */
  kneeAngle: number | null
  /** Total completed reps so far. */
  repCount: number
  /** Real-time form cues for the current frame. */
  currentFormCues: FormCue[]
  /** Quality rating of the most recently completed rep, or null if none yet. */
  lastRepRating: FormRating | null
  /** Deepest knee angle reached during the current rep cycle (degrees). */
  deepestAngle?: number
}

// ---------------------------------------------------------------------------
// Configurable Thresholds
// ---------------------------------------------------------------------------

/** All tuneable thresholds for squat detection — no magic numbers. */
export interface SquatThresholds {
  /** Knee angle above which the user is considered fully standing (degrees). */
  standingAngle: number
  /** Knee angle below which a descent is recognized (degrees). */
  descentAngle: number
  /** Knee angle at or below which the bottom position is reached (degrees). */
  bottomAngle: number
  /** Knee angle that qualifies as "good depth" for form scoring (degrees). */
  goodDepthAngle: number
  /** Hysteresis margin added to bottomAngle for the BOTTOM → ASCENDING transition (degrees). */
  bottomHysteresis: number
  /** Minimum landmark visibility score required (0\u20131). */
  minVisibility: number
  /** Minimum elapsed time for a valid rep to prevent ghost reps (milliseconds). */
  minRepDurationMs: number
  /** EMA smoothing factor for knee angle (0\u20131). Lower = smoother. */
  smoothingAlpha: number
  /** Maximum torso forward lean from vertical before a warning is issued (degrees). */
  maxTorsoLeanAngle: number
  /** Fraction of ankle spread that knee spread must reach to avoid "knees caving" warning. */
  kneeAlignmentRatio: number
}

// ---------------------------------------------------------------------------
// Push-Up Types
// ---------------------------------------------------------------------------

/** Push-up state machine phases — one complete cycle = one rep. */
export type PushupPhase = 'TOP' | 'DESCENDING' | 'BOTTOM' | 'ASCENDING'

/** Supported exercises in FitNova */
export type ExerciseType = 'squat' | 'pushup'

/** All tuneable thresholds for push-up detection. */
export interface PushupThresholds {
  /** Elbow angle above which user is at top extended position (degrees). */
  topAngle: number
  /** Elbow angle below which descent begins (degrees). */
  descentAngle: number
  /** Elbow angle required to reach bottom position (degrees). */
  bottomAngle: number
  /** Elbow angle qualifying as good depth for form scoring (degrees). */
  goodDepthAngle: number
  /** Hysteresis margin for bottom -> ascending transition (degrees). */
  bottomHysteresis: number
  /** Minimum landmark visibility score required on visible side (0–1). */
  minVisibility: number
  /** Minimum elapsed time for a valid rep (milliseconds). */
  minRepDurationMs: number
  /** EMA smoothing factor for elbow angle (0–1). */
  smoothingAlpha: number
  /** Minimum straight-body angle (shoulder-hip-ankle) to avoid sag/pike (degrees). */
  minBodyAlignmentAngle: number
  /** Maximum angle of the torso / body from horizontal for a valid plank (degrees). */
  maxBodyAngleFromHorizontal: number
  /** Minimum consecutive frames in valid plank before a rep can start. */
  minPlankStableFrames: number
}

/** Result returned by the push-up analyzer for every processed frame. */
export interface PushupFrameAnalysis {
  phase: PushupPhase
  elbowAngle: number | null
  repCount: number
  currentFormCues: FormCue[]
  lastRepRating: FormRating | null
  deepestAngle?: number
  bodyAngle?: number | null
  isPlank?: boolean
}

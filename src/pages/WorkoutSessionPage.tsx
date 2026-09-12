import { useRef, useCallback, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Activity,
  ShieldCheck,
  RotateCcw,
  Play,
  Pause,
  Square,
  Clock,
  Dumbbell,
  CheckCircle2,
} from 'lucide-react'
import CameraFeed from '../components/tracker/CameraFeed'
import RepCounter from '../components/tracker/RepCounter'
import FormFeedback from '../components/tracker/FormFeedback'
import WorkoutSummary from '../components/tracker/WorkoutSummary'
import { analyzeSquatFrame, resetSquatAnalyzer } from '../lib/exercises/squat'
import { FeedbackStabilizer, type FormStatus, type FeedbackType } from '../lib/exercises/feedback'
import type { NormalizedLandmark } from '../lib/mediapipe/poseDetector'
import type { SquatPhase, FormCue, FormRating } from '../lib/exercises/types'

export type SessionStatus = 'idle' | 'active' | 'paused' | 'ended'

/** UI state that drives re-renders — updated only on meaningful changes. */
interface DisplayState {
  repCount: number
  phase: SquatPhase
  kneeAngle: number | null
  formCues: FormCue[]
  lastRepRating: FormRating | null
  formStatus: FormStatus
  primaryFeedback: string
  primaryFeedbackType: FeedbackType
}

const INITIAL_DISPLAY: DisplayState = {
  repCount: 0,
  phase: 'STANDING',
  kneeAngle: null,
  formCues: [],
  lastRepRating: null,
  formStatus: 'SEARCHING',
  primaryFeedback: 'Get ready',
  primaryFeedbackType: 'info',
}

function formatTimer(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export default function WorkoutSessionPage() {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('idle')
  const [display, setDisplay] = useState<DisplayState>(INITIAL_DISPLAY)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isPoseTracking, setIsPoseTracking] = useState(false)
  const [goodReps, setGoodReps] = useState(0)
  const [needsImprovementReps, setNeedsImprovementReps] = useState(0)

  // Refs for tracking mutable lifecycle without causing extra renders
  const prevRepCountRef = useRef(0)
  const prevPhaseRef = useRef<SquatPhase>('STANDING')
  const frameCountRef = useRef(0)
  const sessionStatusRef = useRef<SessionStatus>('idle')
  const goodRepsRef = useRef(0)
  const needsImprovementRepsRef = useRef(0)
  const feedbackStabilizerRef = useRef(new FeedbackStabilizer())

  // Keep sessionStatusRef in sync with state
  useEffect(() => {
    sessionStatusRef.current = sessionStatus
  }, [sessionStatus])

  // Reset analyzer on mount and cleanup on unmount
  useEffect(() => {
    resetSquatAnalyzer()
    feedbackStabilizerRef.current.reset()
    return () => {
      resetSquatAnalyzer()
      feedbackStabilizerRef.current.reset()
    }
  }, [])

  // Timer: runs only during active session, pauses when paused, stops when ended
  useEffect(() => {
    if (sessionStatus !== 'active') return

    const timerId = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1)
    }, 1000)

    return () => clearInterval(timerId)
  }, [sessionStatus])

  /**
   * Called every animation frame by CameraFeed with fresh landmarks.
   * Runs the squat analyzer, prioritizes feedback, and updates display state.
   */
  const handleLandmarksDetected = useCallback(
    (landmarks: NormalizedLandmark[], timestampMs: number) => {
      // Guard: Only process frames when workout is actively running
      if (sessionStatusRef.current !== 'active') {
        return
      }

      const result = analyzeSquatFrame(landmarks, timestampMs)
      frameCountRef.current += 1

      // Track newly completed rep ratings
      if (result.repCount > prevRepCountRef.current) {
        const rating = result.lastRepRating
        if (rating === 'good') {
          goodRepsRef.current += 1
          setGoodReps(goodRepsRef.current)
        } else {
          needsImprovementRepsRef.current += 1
          setNeedsImprovementReps(needsImprovementRepsRef.current)
        }
      }

      // Real-time prioritized and stabilized form feedback
      const feedback = feedbackStabilizerRef.current.processFrame({
        isTracking: true,
        isFullyVisible: result.kneeAngle !== null,
        phase: result.phase,
        kneeAngle: result.kneeAngle,
        deepestAngle: result.deepestAngle ?? (result.kneeAngle ?? 180),
        landmarks,
        lastRepRating: result.lastRepRating,
        timestampMs,
      })

      // Determine if the display needs updating:
      // - Always update on rep count change (critical)
      // - Always update on phase change (important)
      // - Throttle knee angle + form updates to every 3rd frame (~20fps)
      const repChanged = result.repCount !== prevRepCountRef.current
      const phaseChanged = result.phase !== prevPhaseRef.current
      const throttledFrame = frameCountRef.current % 3 === 0

      if (repChanged || phaseChanged || throttledFrame) {
        prevRepCountRef.current = result.repCount
        prevPhaseRef.current = result.phase

        setDisplay({
          repCount: result.repCount,
          phase: result.phase,
          kneeAngle: result.kneeAngle,
          formCues: result.currentFormCues,
          lastRepRating: result.lastRepRating,
          formStatus: feedback.status,
          primaryFeedback: feedback.message,
          primaryFeedbackType: feedback.type,
        })
      }
    },
    [],
  )

  const handleTrackingChange = useCallback((tracking: boolean) => {
    setIsPoseTracking(tracking)
    if (!tracking) {
      feedbackStabilizerRef.current.reset()
      setDisplay((prev) => ({
        ...prev,
        formStatus: 'SEARCHING',
        primaryFeedback: 'Searching for pose...',
        primaryFeedbackType: 'warning',
      }))
    }
  }, [])

  // Lifecycle control handlers
  const handleStartWorkout = useCallback(() => {
    resetSquatAnalyzer()
    feedbackStabilizerRef.current.reset()
    prevRepCountRef.current = 0
    prevPhaseRef.current = 'STANDING'
    frameCountRef.current = 0
    goodRepsRef.current = 0
    needsImprovementRepsRef.current = 0
    setGoodReps(0)
    setNeedsImprovementReps(0)
    setElapsedSeconds(0)
    setDisplay(INITIAL_DISPLAY)
    setSessionStatus('active')
  }, [])

  const handlePause = useCallback(() => {
    setSessionStatus('paused')
  }, [])

  const handleResume = useCallback(() => {
    setSessionStatus('active')
  }, [])

  const handleEndWorkout = useCallback(() => {
    setSessionStatus('ended')
    setIsPoseTracking(false)
  }, [])

  const handleStartNewWorkout = useCallback(() => {
    handleStartWorkout()
  }, [handleStartWorkout])

  const handleReset = useCallback(() => {
    resetSquatAnalyzer()
    feedbackStabilizerRef.current.reset()
    prevRepCountRef.current = 0
    prevPhaseRef.current = 'STANDING'
    frameCountRef.current = 0
    goodRepsRef.current = 0
    needsImprovementRepsRef.current = 0
    setGoodReps(0)
    setNeedsImprovementReps(0)
    setElapsedSeconds(0)
    setDisplay(INITIAL_DISPLAY)
    setIsPoseTracking(false)
    setSessionStatus('idle')
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <nav className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                <Activity className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              </div>
              <span className="text-lg font-extrabold text-white">
                Fit<span className="text-emerald-400">Nova</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {/* Timer Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-slate-200 shadow-inner">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>{formatTimer(elapsedSeconds)}</span>
            </div>

            {/* Session State Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider bg-slate-900 border border-slate-800">
              <span
                className={`w-2 h-2 rounded-full ${
                  sessionStatus === 'active'
                    ? 'bg-emerald-400 animate-ping'
                    : sessionStatus === 'paused'
                    ? 'bg-amber-400'
                    : sessionStatus === 'ended'
                    ? 'bg-cyan-400'
                    : 'bg-slate-500'
                }`}
              />
              <span className="text-slate-300">
                {sessionStatus === 'active'
                  ? 'In Progress'
                  : sessionStatus === 'paused'
                  ? 'Paused'
                  : sessionStatus === 'ended'
                  ? 'Completed'
                  : 'Ready'}
              </span>
            </div>

            {/* Quick Reset Button */}
            {sessionStatus !== 'ended' && (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold transition cursor-pointer"
                title="Reset session state"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Reset</span>
              </button>
            )}

            <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>On-Device AI</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
        {/* VIEW 1: Workout Completed Summary */}
        {sessionStatus === 'ended' ? (
          <WorkoutSummary
            totalReps={display.repCount}
            goodReps={goodReps}
            needsImprovementReps={needsImprovementReps}
            durationSeconds={elapsedSeconds}
            onStartNewWorkout={handleStartNewWorkout}
            exerciseName="Squats"
          />
        ) : (
          /* VIEW 2: Active / Idle / Paused Session */
          <div className="space-y-4">
            {/* Header / Exercise Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-wider">
                    Exercise
                  </span>
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    SQUATS
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Perform bodyweight squats with full range of motion. Live AI tracks reps and posture.
                </p>
              </div>

              {/* Action Buttons in Header for Mobile / Desktop */}
              <div className="flex items-center gap-2 pt-2 sm:pt-0">
                {sessionStatus === 'idle' && (
                  <button
                    type="button"
                    onClick={handleStartWorkout}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-slate-950" />
                    <span>Start Workout</span>
                  </button>
                )}

                {sessionStatus === 'active' && (
                  <>
                    <button
                      type="button"
                      onClick={handlePause}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs sm:text-sm transition cursor-pointer"
                    >
                      <Pause className="w-4 h-4" />
                      <span>Pause</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleEndWorkout}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-xs sm:text-sm transition cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5 fill-rose-400" />
                      <span>End Workout</span>
                    </button>
                  </>
                )}

                {sessionStatus === 'paused' && (
                  <>
                    <button
                      type="button"
                      onClick={handleResume}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-slate-950" />
                      <span>Resume</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleEndWorkout}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-xs sm:text-sm transition cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5 fill-rose-400" />
                      <span>End Workout</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Main Interactive Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4 items-start">
              {/* Camera / Setup Viewport */}
              <div className="space-y-3">
                {sessionStatus === 'idle' ? (
                  <div className="w-full aspect-[4/3] sm:aspect-[16/10] max-h-[520px] rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center p-6 text-center shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />

                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-500/10">
                      <Dumbbell className="w-8 h-8" />
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-white mb-2">
                      Ready to Squat?
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
                      Position your device 6–8 feet away at waist height so your full body is visible. Press Start Workout when you are ready.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 mb-6">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Automatic Rep Counting</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Live Form Correction</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleStartWorkout}
                      className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-emerald-500/25 transition duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    >
                      <Play className="w-5 h-5 fill-slate-950" />
                      <span>Start Workout</span>
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <CameraFeed
                      onLandmarksDetected={handleLandmarksDetected}
                      onTrackingChange={handleTrackingChange}
                      showOverlay={true}
                      isPaused={sessionStatus === 'paused'}
                      className="w-full shadow-2xl shadow-emerald-950/20 aspect-[4/3] sm:aspect-[16/10] max-h-[520px]"
                    />

                    {/* Quick In-Video Control Bar for Convenient Desktop Access */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-slate-800 z-10">
                      {sessionStatus === 'active' ? (
                        <button
                          type="button"
                          onClick={handlePause}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-bold text-xs transition cursor-pointer"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pause</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResume}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold text-xs transition cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-emerald-400" />
                          <span>Resume</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={handleEndWorkout}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-bold text-xs transition cursor-pointer"
                      >
                        <Square className="w-3 h-3 fill-rose-400" />
                        <span>End</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Side Panel — Rep Counter & Form Feedback */}
              <div className="flex flex-col sm:flex-row lg:flex-col gap-4">
                <RepCounter
                  repCount={display.repCount}
                  phase={display.phase}
                  kneeAngle={display.kneeAngle}
                  exerciseName="SQUATS"
                  isTracking={isPoseTracking}
                  isPaused={sessionStatus === 'paused'}
                  className="flex-1 lg:flex-none"
                />

                <FormFeedback
                  formStatus={display.formStatus}
                  primaryFeedback={display.primaryFeedback}
                  feedbackType={display.primaryFeedbackType}
                  cues={display.formCues}
                  lastRepRating={display.lastRepRating}
                  isPaused={sessionStatus === 'paused'}
                  className="flex-1 lg:flex-none"
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
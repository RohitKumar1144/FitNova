import { useRef, useCallback, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Activity, ShieldCheck, RotateCcw } from 'lucide-react'
import CameraFeed from '../components/tracker/CameraFeed'
import RepCounter from '../components/tracker/RepCounter'
import FormFeedback from '../components/tracker/FormFeedback'
import { analyzeSquatFrame, resetSquatAnalyzer } from '../lib/exercises/squat'
import type { NormalizedLandmark } from '../lib/mediapipe/poseDetector'
import type { SquatPhase, FormCue, FormRating } from '../lib/exercises/types'

/** UI state that drives re-renders — updated only on meaningful changes. */
interface DisplayState {
  repCount: number
  phase: SquatPhase
  kneeAngle: number | null
  formCues: FormCue[]
  lastRepRating: FormRating | null
}

const INITIAL_DISPLAY: DisplayState = {
  repCount: 0,
  phase: 'STANDING',
  kneeAngle: null,
  formCues: [],
  lastRepRating: null,
}

export default function WorkoutSessionPage() {
  const [display, setDisplay] = useState<DisplayState>(INITIAL_DISPLAY)

  // Refs to avoid unnecessary re-renders on every frame
  const prevRepCountRef = useRef(0)
  const prevPhaseRef = useRef<SquatPhase>('STANDING')
  const frameCountRef = useRef(0)

  // Reset analyzer on mount and cleanup on unmount
  useEffect(() => {
    resetSquatAnalyzer()
    return () => {
      resetSquatAnalyzer()
    }
  }, [])

  /**
   * Called every animation frame by CameraFeed with fresh landmarks.
   * Runs the squat analyzer and updates display state only when needed.
   */
  const handleLandmarksDetected = useCallback(
    (landmarks: NormalizedLandmark[], timestampMs: number) => {
      const result = analyzeSquatFrame(landmarks, timestampMs)
      frameCountRef.current += 1

      // Determine if the display needs updating:
      // - Always update on rep count change (critical)
      // - Always update on phase change (important)
      // - Throttle knee angle + form cue updates to every 3rd frame (~20fps)
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
        })
      }
    },
    [],
  )

  const handleReset = useCallback(() => {
    resetSquatAnalyzer()
    prevRepCountRef.current = 0
    prevPhaseRef.current = 'STANDING'
    frameCountRef.current = 0
    setDisplay(INITIAL_DISPLAY)
  }, [])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <nav className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
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
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-semibold transition"
              title="Reset rep counter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline-block">On-Device AI Active</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="space-y-4">
          {/* Header */}
          <div className="text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Squat Tracker
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Perform squats in front of your camera. AI tracks your reps and form in real-time.
            </p>
          </div>

          {/* Camera + Overlays Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4">
            {/* Camera Feed */}
            <CameraFeed
              onLandmarksDetected={handleLandmarksDetected}
              showOverlay={true}
              className="w-full shadow-2xl shadow-emerald-950/20"
            />

            {/* Side Panel — Rep Counter + Form Feedback */}
            <div className="flex flex-row lg:flex-col gap-4">
              <RepCounter
                repCount={display.repCount}
                phase={display.phase}
                kneeAngle={display.kneeAngle}
                className="flex-1 lg:flex-none"
              />
              <FormFeedback
                cues={display.formCues}
                lastRepRating={display.lastRepRating}
                className="flex-1 lg:flex-none"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
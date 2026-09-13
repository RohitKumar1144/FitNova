import type { SquatPhase, PushupPhase, BicepCurlPhase } from '../../lib/exercises/types'
import { Dumbbell, ShieldCheck } from 'lucide-react'

interface RepCounterProps {
  repCount: number
  phase: SquatPhase | PushupPhase | BicepCurlPhase
  kneeAngle?: number | null
  elbowAngle?: number | null
  angleLabel?: string
  exerciseName?: string
  isTracking?: boolean
  isPaused?: boolean
  targetReps?: number
  formScore?: number | null
  goodReps?: number
  needsImprovementReps?: number
  className?: string
}

/** Phase display configuration — label and color. */
const PHASE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  STANDING: { label: 'Standing', color: 'text-slate-400', bg: 'bg-slate-500/20' },
  TOP: { label: 'Top / Plank', color: 'text-slate-400', bg: 'bg-slate-500/20' },
  DESCENDING: { label: 'Going Down', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  BOTTOM: { label: 'Bottom', color: 'text-sky-400', bg: 'bg-sky-500/20' },
  ASCENDING: { label: 'Coming Up', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  EXTENDED: { label: 'Extended', color: 'text-slate-400', bg: 'bg-slate-500/20' },
  CURLING_UP: { label: 'Curling Up', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  CONTRACTED: { label: 'Contracted', color: 'text-sky-400', bg: 'bg-sky-500/20' },
  LOWERING: { label: 'Lowering', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
}

/**
 * Displays the current exercise, rep count, exercise phase, joint angle, and tracking status.
 */
export default function RepCounter({
  repCount,
  phase,
  kneeAngle = null,
  elbowAngle,
  angleLabel,
  exerciseName = 'SQUATS',
  isTracking = true,
  isPaused = false,
  targetReps,
  formScore = null,
  className = '',
}: RepCounterProps) {
  const phaseInfo = PHASE_CONFIG[phase] || { label: phase, color: 'text-slate-400', bg: 'bg-slate-500/20' }
  const displayAngle = elbowAngle !== undefined ? elbowAngle : kneeAngle
  const displayAngleLabel = angleLabel || (elbowAngle !== undefined ? 'Elbow Angle' : 'Knee Angle')

  return (
    <div
      className={`bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-2xl p-2.5 sm:p-5 space-y-2 sm:space-y-4 shadow-xl ${className}`}
    >
      {/* Exercise Badge & Tracking Status */}
      <div className="flex items-center justify-between gap-1 sm:gap-2 pb-1.5 sm:pb-2.5 border-b border-slate-800/80">
        <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-black uppercase tracking-wider text-white min-w-0">
          <Dumbbell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
          <span className="truncate">{exerciseName}</span>
        </div>
        <span
          className={`inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded-md border shrink-0 ${
            isPaused
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              : isTracking
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-slate-900 text-slate-400 border-slate-700/80'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isPaused
                ? 'bg-amber-400'
                : isTracking
                ? 'bg-emerald-400 animate-pulse'
                : 'bg-slate-500'
            }`}
          />
          <span className="hidden xs:inline sm:inline">
            {isPaused ? 'PAUSED' : isTracking ? 'POSE DETECTED' : 'SEARCHING FOR POSE'}
          </span>
          <span className="xs:hidden sm:hidden">
            {isPaused ? 'PAUSED' : isTracking ? 'LIVE' : 'WAIT'}
          </span>
        </span>
      </div>

      {/* 1. HERO REP COUNTER */}
      <div className="text-center py-1.5 sm:py-2 bg-slate-900/40 border border-slate-800/60 rounded-xl p-2 sm:p-3">
        <p className="text-[9px] sm:text-[11px] font-bold uppercase tracking-widest text-emerald-400">
          Completed Reps
        </p>
        <div className="flex items-baseline justify-center gap-1 sm:gap-1.5 mt-0.5 sm:mt-1">
          <span className="text-4xl xs:text-5xl sm:text-6xl font-black text-white tabular-nums tracking-tight leading-none">
            {repCount}
          </span>
          {targetReps && targetReps > 0 ? (
            <span className="text-xs sm:text-sm font-bold text-slate-400">
              / {targetReps} reps
            </span>
          ) : (
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500">
              reps
            </span>
          )}
        </div>
      </div>

      {/* 2. FORM SCORE */}
      <div className="text-center py-1 sm:py-2 bg-slate-900/40 border border-slate-800/60 rounded-xl p-1.5 sm:p-3">
        <div className="flex items-center justify-center gap-1 text-[9px] sm:text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-0.5 sm:mb-1">
          <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-purple-400" />
          <span>Form Score</span>
        </div>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-xl sm:text-3xl font-black text-white tabular-nums tracking-tight">
            {formScore !== null && formScore !== undefined ? formScore : '—'}
          </span>
          <span className="text-[10px] sm:text-xs font-semibold text-slate-400">
            / 100
          </span>
        </div>
      </div>

      {/* 3. CURRENT PHASE & JOINT ANGLE */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-1 sm:gap-0 sm:space-y-1.5 text-center">
        <div>
          <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5 sm:mb-1">
            Phase
          </p>
          <div className="flex items-center justify-center">
            <span
              className={`inline-flex items-center gap-1 px-2 sm:px-3.5 py-0.5 sm:py-1.5 rounded-lg sm:rounded-xl text-[9px] sm:text-xs font-extrabold uppercase tracking-wider ${phaseInfo.color} ${phaseInfo.bg} border border-current/20 truncate max-w-full`}
            >
              <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2 shrink-0">
                <span
                  className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    phase === 'STANDING' || phase === 'TOP' || phase === 'EXTENDED' || isPaused ? '' : 'animate-ping'
                  } ${phaseInfo.color.replace('text-', 'bg-')}`}
                />
                <span
                  className={`relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 ${phaseInfo.color.replace(
                    'text-',
                    'bg-'
                  )}`}
                />
              </span>
              <span className="truncate">{phaseInfo.label}</span>
            </span>
          </div>
        </div>

        <div className="sm:pt-2 sm:border-t sm:border-slate-800/80">
          <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {displayAngleLabel}
          </p>
          <p className="text-sm sm:text-lg font-black text-slate-200 tabular-nums mt-0.5">
            {displayAngle !== null && displayAngle !== undefined ? `${Math.round(displayAngle)}\u00B0` : '\u2014'}
          </p>
        </div>
      </div>
    </div>
  )
}

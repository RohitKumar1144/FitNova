import type { SquatPhase } from '../../lib/exercises/types'
import { Dumbbell } from 'lucide-react'

interface RepCounterProps {
  repCount: number
  phase: SquatPhase
  kneeAngle: number | null
  exerciseName?: string
  isTracking?: boolean
  isPaused?: boolean
  className?: string
}

/** Phase display configuration — label and color. */
const PHASE_CONFIG: Record<SquatPhase, { label: string; color: string; bg: string }> = {
  STANDING: { label: 'Standing', color: 'text-slate-400', bg: 'bg-slate-500/20' },
  DESCENDING: { label: 'Going Down', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  BOTTOM: { label: 'Bottom', color: 'text-sky-400', bg: 'bg-sky-500/20' },
  ASCENDING: { label: 'Coming Up', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
}

/**
 * Displays the current exercise, rep count, squat phase, knee angle, and tracking status.
 */
export default function RepCounter({
  repCount,
  phase,
  kneeAngle,
  exerciseName = 'SQUATS',
  isTracking = true,
  isPaused = false,
  className = '',
}: RepCounterProps) {
  const phaseInfo = PHASE_CONFIG[phase]

  return (
    <div
      className={`bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-xl ${className}`}
    >
      {/* Exercise Badge & Tracking Status */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-white">
          <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
          <span>{exerciseName}</span>
        </div>
        <span
          className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md border ${
            isPaused
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : isTracking
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-slate-800 text-slate-400 border-slate-700'
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
          {isPaused ? 'Paused' : isTracking ? 'Tracking Active' : 'Searching'}
        </span>
      </div>

      {/* Rep Count */}
      <div className="text-center py-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Rep Count
        </p>
        <p className="text-5xl font-black text-white tabular-nums tracking-tight leading-none mt-1.5">
          {repCount}
        </p>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-800/80" />

      {/* Phase Badge */}
      <div className="space-y-1 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Current Phase
        </p>
        <div className="flex items-center justify-center pt-0.5">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider ${phaseInfo.color} ${phaseInfo.bg}`}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  phase === 'STANDING' || isPaused ? '' : 'animate-ping'
                } ${phaseInfo.color.replace('text-', 'bg-')}`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${phaseInfo.color.replace(
                  'text-',
                  'bg-'
                )}`}
              />
            </span>
            {phaseInfo.label}
          </span>
        </div>
      </div>

      {/* Knee Angle */}
      <div className="text-center pt-1 border-t border-slate-800/80">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Knee Angle
        </p>
        <p className="text-xl font-black text-slate-200 tabular-nums mt-0.5">
          {kneeAngle !== null ? `${Math.round(kneeAngle)}\u00B0` : '\u2014'}
        </p>
      </div>
    </div>
  )
}

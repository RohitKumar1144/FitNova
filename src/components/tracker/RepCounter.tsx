import type { SquatPhase } from '../../lib/exercises/types'

interface RepCounterProps {
  repCount: number
  phase: SquatPhase
  kneeAngle: number | null
  className?: string
}

/** Phase display configuration — label and color. */
const PHASE_CONFIG: Record<SquatPhase, { label: string; color: string; bg: string }> = {
  STANDING: { label: 'Standing', color: 'text-slate-400', bg: 'bg-slate-500/20' },
  DESCENDING: { label: 'Going Down', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  BOTTOM: { label: 'Hold', color: 'text-sky-400', bg: 'bg-sky-500/20' },
  ASCENDING: { label: 'Coming Up', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
}

/**
 * Displays the current rep count, squat phase, and knee angle.
 * Designed to overlay on the camera feed.
 */
export default function RepCounter({
  repCount,
  phase,
  kneeAngle,
  className = '',
}: RepCounterProps) {
  const phaseInfo = PHASE_CONFIG[phase]

  return (
    <div
      className={`bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 space-y-3 ${className}`}
    >
      {/* Rep Count */}
      <div className="text-center">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Reps
        </p>
        <p className="text-4xl font-black text-white tabular-nums leading-none mt-1">
          {repCount}
        </p>
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-800" />

      {/* Phase Badge */}
      <div className="flex items-center justify-center">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${phaseInfo.color} ${phaseInfo.bg}`}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                phase === 'STANDING' ? '' : 'animate-ping'
              } ${phaseInfo.color.replace('text-', 'bg-')}`}
            />
            <span
              className={`relative inline-flex rounded-full h-1.5 w-1.5 ${phaseInfo.color.replace('text-', 'bg-')}`}
            />
          </span>
          {phaseInfo.label}
        </span>
      </div>

      {/* Knee Angle */}
      {kneeAngle !== null && (
        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Knee Angle
          </p>
          <p className="text-lg font-bold text-slate-300 tabular-nums">
            {Math.round(kneeAngle)}{'\u00B0'}
          </p>
        </div>
      )}
    </div>
  )
}

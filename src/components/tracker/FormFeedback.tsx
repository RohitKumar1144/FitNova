import type { FormCue, FormRating } from '../../lib/exercises/types'
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck } from 'lucide-react'

interface FormFeedbackProps {
  cues: FormCue[]
  lastRepRating: FormRating | null
  isPaused?: boolean
  className?: string
}

/** Visual config for form ratings — matching requested "Good / Needs Improvement" terminology */
const RATING_CONFIG: Record<FormRating, { label: string; color: string; bg: string; border: string }> = {
  good: {
    label: 'Good',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
  fair: {
    label: 'Needs Improvement',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  poor: {
    label: 'Needs Improvement',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
  },
}

/** Icon component for each cue type. */
function CueIcon({ type }: { type: FormCue['type'] }) {
  switch (type) {
    case 'success':
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
    case 'warning':
      return <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
    case 'error':
      return <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
  }
}

/**
 * Displays real-time form feedback cues and overall form status.
 */
export default function FormFeedback({
  cues,
  lastRepRating,
  isPaused = false,
  className = '',
}: FormFeedbackProps) {
  const ratingInfo = lastRepRating ? RATING_CONFIG[lastRepRating] : null

  return (
    <div
      className={`bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-xl ${className}`}
    >
      {/* Overall Form Status */}
      <div className="space-y-1 text-center">
        <div className="flex items-center justify-between gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 pb-1">
          <span>Form Rating</span>
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        </div>

        {ratingInfo ? (
          <div
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border ${ratingInfo.bg} ${ratingInfo.border}`}
          >
            <span className={`text-xs font-black uppercase tracking-wider ${ratingInfo.color}`}>
              {ratingInfo.label}
            </span>
          </div>
        ) : (
          <div className="px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
            <span className="text-xs font-medium text-slate-400">Ready to Analyze</span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-800/80" />

      {/* Active Form Feedback */}
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Live Feedback
        </p>

        {isPaused ? (
          <div className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
            <p className="text-xs font-medium text-amber-400">Workout is paused</p>
          </div>
        ) : cues.length > 0 ? (
          <div className="space-y-1.5">
            {cues.map((cue, i) => (
              <div
                key={`${cue.message}-${i}`}
                className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800/80"
              >
                <CueIcon type={cue.type} />
                <span className="text-xs font-semibold text-slate-200">{cue.message}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-2 px-2 rounded-xl bg-slate-900/40 border border-slate-800/50">
            <p className="text-xs text-slate-400 font-medium">
              {lastRepRating ? 'Great job, start your next rep' : 'Begin squatting to receive live form cues'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

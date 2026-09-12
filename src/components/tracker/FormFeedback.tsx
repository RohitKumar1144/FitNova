import type { FormCue, FormRating } from '../../lib/exercises/types'
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'

interface FormFeedbackProps {
  cues: FormCue[]
  lastRepRating: FormRating | null
  className?: string
}

/** Visual config for form ratings. */
const RATING_CONFIG: Record<FormRating, { label: string; color: string; bg: string; border: string }> = {
  good: {
    label: 'Good Form',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
  fair: {
    label: 'Fair Form',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  poor: {
    label: 'Needs Work',
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
 * Displays real-time form feedback cues and the last rep's quality rating.
 * Designed to sit alongside or below the camera feed.
 */
export default function FormFeedback({
  cues,
  lastRepRating,
  className = '',
}: FormFeedbackProps) {
  const ratingInfo = lastRepRating ? RATING_CONFIG[lastRepRating] : null

  return (
    <div
      className={`bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 space-y-3 ${className}`}
    >
      {/* Last Rep Rating */}
      {ratingInfo && (
        <div
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl border ${ratingInfo.bg} ${ratingInfo.border}`}
        >
          <span className={`text-xs font-bold ${ratingInfo.color}`}>
            Last Rep: {ratingInfo.label}
          </span>
        </div>
      )}

      {/* Active Form Cues */}
      {cues.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Form Feedback
          </p>
          {cues.map((cue, i) => (
            <div
              key={`${cue.message}-${i}`}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900/60"
            >
              <CueIcon type={cue.type} />
              <span className="text-xs font-medium text-slate-300">{cue.message}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-1">
          <p className="text-xs text-slate-500">
            {lastRepRating ? 'Start your next rep' : 'Begin squatting to get feedback'}
          </p>
        </div>
      )}
    </div>
  )
}

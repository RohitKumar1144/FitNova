import type { FormCue, FormRating } from '../../lib/exercises/types'
import type { FormStatus, FeedbackType } from '../../lib/exercises/feedback'
import { CheckCircle2, AlertTriangle, Info, ShieldCheck, Sparkles, Video } from 'lucide-react'

interface FormFeedbackProps {
  formStatus?: FormStatus
  primaryFeedback?: string
  feedbackType?: FeedbackType
  cues?: FormCue[]
  lastRepRating?: FormRating | null
  isPaused?: boolean
  className?: string
}

function FeedbackIcon({ type }: { type: FeedbackType }) {
  switch (type) {
    case 'success':
      return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
    case 'info':
    default:
      return <Info className="w-5 h-5 text-cyan-400 shrink-0" />
  }
}

/**
 * Displays real-time stabilized squat form feedback and single primary actionable cue.
 */
export default function FormFeedback({
  formStatus = 'GOOD',
  primaryFeedback = 'Get ready',
  feedbackType = 'info',
  isPaused = false,
  className = '',
}: FormFeedbackProps) {
  return (
    <div
      className={`bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-xl ${className}`}
    >
      {/* 1. FORM STATUS */}
      <div className="space-y-1 text-center">
        <div className="flex items-center justify-between gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 pb-1">
          <span>Form Status</span>
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        </div>

        {isPaused ? (
          <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">
              Paused
            </span>
          </div>
        ) : formStatus === 'GOOD' ? (
          <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400">
              Good
            </span>
          </div>
        ) : formStatus === 'NEEDS_IMPROVEMENT' ? (
          <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">
              Needs Improvement
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800">
            <span className="w-2 h-2 rounded-full bg-slate-500 animate-ping" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-400">
              Searching For Pose
            </span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-slate-800/80" />

      {/* 2. PRIMARY ACTIONABLE FEEDBACK CUE */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
          <span>Live Feedback</span>
          <Sparkles className="w-3 h-3 text-cyan-400" />
        </div>

        <div
          className={`min-h-[68px] flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${
            isPaused
              ? 'bg-slate-900/60 border-slate-800 text-slate-400'
              : feedbackType === 'warning'
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              : feedbackType === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
              : 'bg-slate-900/80 border-slate-800 text-slate-200'
          }`}
        >
          <FeedbackIcon type={isPaused ? 'info' : feedbackType} />
          <div className="flex-1">
            <p className="text-xs sm:text-sm font-bold tracking-tight leading-snug">
              {isPaused ? 'Workout is paused' : primaryFeedback}
            </p>
          </div>
        </div>
      </div>

      {/* 3. CAMERA SETUP HINT (Section 11) */}
      <div className="pt-2 border-t border-slate-800/60 flex items-start gap-1.5 text-[11px] text-slate-500 leading-tight">
        <Video className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
        <span>Tip: Best results with a side or 3/4 camera view.</span>
      </div>
    </div>
  )
}

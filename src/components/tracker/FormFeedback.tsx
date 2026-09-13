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
  cues = [],
  isPaused = false,
  className = '',
}: FormFeedbackProps) {
  return (
    <div
      className={`bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-2xl p-2.5 sm:p-4 space-y-2 sm:space-y-3.5 shadow-xl flex flex-col justify-between ${className}`}
    >
      <div className="space-y-2 sm:space-y-3.5">
        {/* 1. FORM STATUS */}
        <div className="space-y-1 text-center">
          <div className="flex items-center justify-between gap-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-500 pb-0.5 sm:pb-1">
            <span>Form Status</span>
            <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
          </div>

          {isPaused ? (
            <div className="flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl bg-amber-500/10 border border-amber-500/30">
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-400">
                Paused
              </span>
            </div>
          ) : formStatus === 'GOOD' ? (
            <div className="flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-emerald-400">
                Good Form
              </span>
            </div>
          ) : formStatus === 'NEEDS_IMPROVEMENT' ? (
            <div className="flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl bg-amber-500/10 border border-amber-500/30">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-400">
                Needs Work
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1 sm:py-2 rounded-lg sm:rounded-xl bg-slate-900/80 border border-slate-800">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-500 animate-ping" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400">
                Searching
              </span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-800/80" />

        {/* 2. PRIMARY ACTIONABLE FEEDBACK CUE */}
        <div className="space-y-1 sm:space-y-1.5">
          <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <span>Live Feedback</span>
            <Sparkles className="w-3 h-3 text-cyan-400" />
          </div>

          <div
            className={`min-h-[48px] sm:min-h-[64px] flex items-center gap-2 sm:gap-3 p-2 sm:p-3.5 rounded-xl border transition-all duration-200 ${
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
            <div className="flex-1 min-w-0">
              <p className="text-[11px] sm:text-sm font-bold tracking-tight leading-snug break-words">
                {isPaused ? 'Workout is paused' : primaryFeedback}
              </p>
            </div>
          </div>

          {/* Real-time active cues list from analyzer */}
          {!isPaused && cues && cues.length > 0 && (
            <div className="space-y-1 sm:space-y-1.5 pt-0.5 sm:pt-1">
              {cues.slice(0, 2).map((cue, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold border ${
                    cue.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                      : cue.type === 'warning'
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                      : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                  }`}
                >
                  {cue.type === 'success' ? (
                    <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 text-amber-400" />
                  )}
                  <span className="truncate">{cue.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. CAMERA SETUP GUIDANCE */}
      <div className="pt-1.5 sm:pt-2 border-t border-slate-800/60 flex items-start gap-1 sm:gap-1.5 text-[9px] sm:text-[11px] text-slate-400 leading-snug">
        <Video className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-400 shrink-0 mt-0.5" />
        <span className="truncate sm:whitespace-normal">Stand sideways with full body visible.</span>
      </div>
    </div>
  )
}

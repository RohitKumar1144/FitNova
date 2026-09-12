import { Link } from 'react-router-dom'
import {
  Trophy,
  RotateCcw,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Activity,
  Sparkles,
  TrendingUp,
  Target,
  Heart,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import type { AIPostWorkoutFeedback } from '../../types/feedback'

interface WorkoutSummaryProps {
  totalReps: number
  goodReps: number
  needsImprovementReps: number
  durationSeconds: number
  onStartNewWorkout: () => void
  exerciseName?: string
  aiFeedback?: AIPostWorkoutFeedback | null
  aiFeedbackLoading?: boolean
  aiFeedbackError?: string | null
  isSaving?: boolean
  saveError?: string | null
  onRetrySave?: () => void
}

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  if (mins === 0) {
    return `${secs}s`
  }
  return `${mins}m ${secs.toString().padStart(2, '0')}s`
}

function getSummaryMessage(totalReps: number, goodReps: number): { title: string; message: string } {
  if (totalReps === 0) {
    return {
      title: 'Session Ended',
      message: 'No completed reps recorded. Ready to give it another shot?',
    }
  }

  const accuracy = Math.round((goodReps / totalReps) * 100)

  if (accuracy >= 80) {
    return {
      title: 'Outstanding Performance! 🏆',
      message: 'Excellent form quality and controlled movement throughout your session. Keep up the high standard!',
    }
  }

  if (accuracy >= 50) {
    return {
      title: 'Solid Workout! 💪',
      message: 'Good effort on completing your reps. Focus on clean posture and full range of motion for an even higher form score.',
    }
  }

  return {
    title: 'Workout Finished! 🎯',
    message: 'Good practice session. Prioritize controlled pacing and alignment on each rep.',
  }
}

export default function WorkoutSummary({
  totalReps,
  goodReps,
  needsImprovementReps,
  durationSeconds,
  onStartNewWorkout,
  exerciseName = 'Squats',
  aiFeedback = null,
  aiFeedbackLoading = false,
  aiFeedbackError = null,
  isSaving = false,
  saveError = null,
  onRetrySave,
}: WorkoutSummaryProps) {
  const { title, message } = getSummaryMessage(totalReps, goodReps)
  const accuracy = totalReps > 0 ? Math.round((goodReps / totalReps) * 100) : 0

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900/90 border border-slate-800 backdrop-blur-2xl rounded-3xl p-6 sm:p-10 shadow-2xl shadow-emerald-950/20 text-center animate-in fade-in zoom-in-95 duration-300">
      {/* Trophy Badge */}
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-br from-emerald-400/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/10">
        <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400" />
      </div>

      {/* Header Info */}
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
        <Activity className="w-3.5 h-3.5" />
        <span>{exerciseName} Summary</span>
      </span>

      <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
        {title}
      </h2>

      <p className="text-sm sm:text-base text-slate-300 max-w-md mx-auto mb-8 leading-relaxed">
        {message}
      </p>

      {/* Saving / Saved Status Notification */}
      {isSaving && (
        <div className="mb-6 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center gap-2 text-xs font-medium text-emerald-400">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>Saving workout...</span>
        </div>
      )}

      {saveError && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-rose-300 text-left">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{saveError}</span>
          </div>
          {onRetrySave && (
            <button
              type="button"
              onClick={onRetrySave}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 text-xs font-bold transition shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Save</span>
            </button>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {/* Total Reps */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
            Total Reps
          </p>
          <p className="text-3xl sm:text-4xl font-black text-white tabular-nums">
            {totalReps}
          </p>
        </div>

        {/* Good Form Reps */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Good Form</span>
          </div>
          <p className="text-3xl sm:text-4xl font-black text-emerald-400 tabular-nums">
            {goodReps}
          </p>
        </div>

        {/* Needs Improvement Reps */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-1">
            <AlertTriangle className="w-3 h-3" />
            <span>Needs Work</span>
          </div>
          <p className="text-3xl sm:text-4xl font-black text-amber-400 tabular-nums">
            {needsImprovementReps}
          </p>
        </div>

        {/* Duration */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center">
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-cyan-400 mb-1">
            <Clock className="w-3 h-3" />
            <span>Duration</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-200 tabular-nums mt-1">
            {formatDuration(durationSeconds)}
          </p>
        </div>
      </div>

      {/* Form Accuracy Bar if reps > 0 */}
      {totalReps > 0 && (
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
            <span>Form Accuracy</span>
            <span className="text-emerald-400 font-mono">{accuracy}%</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${accuracy}%` }}
            />
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* AI COACH FEEDBACK SECTION */}
      {/* ================================================== */}
      <div className="my-8 text-left bg-gradient-to-b from-purple-950/20 via-slate-950/60 to-slate-950/80 border border-purple-500/20 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
            AI Coach Feedback
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Gemini 3.8
            </span>
          </h3>
        </div>

        {aiFeedbackLoading && (
          <div className="py-6 flex flex-col items-center justify-center gap-3 text-center">
            <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-purple-300 font-medium">
              Generating your personalized coach feedback...
            </p>
          </div>
        )}

        {!aiFeedbackLoading && aiFeedback && (
          <div className="space-y-4 text-xs sm:text-sm">
            {/* Overall Assessment Summary */}
            <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-purple-200 leading-relaxed font-medium">
              {aiFeedback.summary}
            </div>

            {/* What Went Well & Improvements 2-Column Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* What went well */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-emerald-500/20">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase text-[11px] tracking-wider mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>What Went Well</span>
                </div>
                <ul className="space-y-1.5 text-slate-300 text-xs">
                  {aiFeedback.what_went_well?.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Improvements */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-amber-500/20">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold uppercase text-[11px] tracking-wider mb-2">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Focus Areas</span>
                </div>
                <ul className="space-y-1.5 text-slate-300 text-xs">
                  {aiFeedback.improvements?.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold mt-0.5">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Next Workout Recommendation */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center gap-1.5 text-cyan-400 font-bold uppercase text-[11px] tracking-wider mb-1.5">
                <Target className="w-3.5 h-3.5" />
                <span>Next Workout Recommendation</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                {aiFeedback.next_workout_recommendation}
              </p>
            </div>

            {/* Motivation */}
            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-center gap-2 text-emerald-300 text-xs font-semibold">
              <Heart className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{aiFeedback.motivation}</span>
            </div>
          </div>
        )}

        {!aiFeedbackLoading && !aiFeedback && (
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 text-xs leading-relaxed">
            {aiFeedbackError || 'AI feedback is temporarily unavailable. Your workout stats above are completely saved!'}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={onStartNewWorkout}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/25 transition duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 stroke-[2.5]" />
          <span>Start New Workout</span>
        </button>

        <Link
          to="/dashboard"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition duration-200 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    </div>
  )
}

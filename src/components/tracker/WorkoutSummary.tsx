import { Link } from 'react-router-dom'
import { Trophy, RotateCcw, ArrowLeft, CheckCircle2, AlertTriangle, Clock, Activity } from 'lucide-react'

interface WorkoutSummaryProps {
  totalReps: number
  goodReps: number
  needsImprovementReps: number
  durationSeconds: number
  onStartNewWorkout: () => void
  exerciseName?: string
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
      message: 'Excellent squat depth and body alignment throughout your sets. Keep up the high standard!',
    }
  }

  if (accuracy >= 50) {
    return {
      title: 'Solid Workout! 💪',
      message: 'Good effort on completing your reps. Focus on getting thighs parallel to the ground for even better form score.',
    }
  }

  return {
    title: 'Workout Finished! 🎯',
    message: 'Good practice session. Remember to keep your chest lifted and knees tracking straight over your toes.',
  }
}

export default function WorkoutSummary({
  totalReps,
  goodReps,
  needsImprovementReps,
  durationSeconds,
  onStartNewWorkout,
  exerciseName = 'Squats',
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
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
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 mb-8">
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

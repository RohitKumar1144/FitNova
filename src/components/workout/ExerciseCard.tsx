import { Dumbbell, Clock, RotateCcw, Video } from 'lucide-react'
import type { ExerciseItem } from '../../types/workout'

interface ExerciseCardProps {
  exercise: ExerciseItem
  index: number
}

export default function ExerciseCard({ exercise, index }: ExerciseCardProps) {
  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'squat':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'pushup':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
      case 'bicep_curl':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700'
    }
  }

  const formatExerciseName = (type: string) => {
    switch (type) {
      case 'squat':
        return 'Squats'
      case 'pushup':
        return 'Push-ups'
      case 'bicep_curl':
        return 'Bicep Curls'
      default:
        return type
    }
  }

  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 sm:p-6 hover:border-slate-700 transition">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center font-mono font-bold text-xs text-slate-300">
            0{index + 1}
          </div>
          <div>
            <h4 className="text-base sm:text-lg font-bold text-white leading-tight">
              {exercise.name}
            </h4>
            <span className="text-xs text-slate-400">
              Tracked type: {formatExerciseName(exercise.exercise_type)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-semibold uppercase tracking-wider ${getBadgeColor(exercise.exercise_type)}`}>
            <Video className="w-3 h-3" />
            <span>AI Tracked</span>
          </span>
        </div>
      </div>

      {/* Target Sets & Reps Pill row */}
      <div className="grid grid-cols-3 gap-3 mb-4 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-center">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Sets</span>
          <span className="text-base sm:text-lg font-black text-white flex items-center justify-center gap-1">
            <Dumbbell className="w-3.5 h-3.5 text-emerald-400" />
            {exercise.sets}
          </span>
        </div>

        <div className="border-x border-slate-800/80">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Reps / Set</span>
          <span className="text-base sm:text-lg font-black text-white flex items-center justify-center gap-1">
            <RotateCcw className="w-3.5 h-3.5 text-teal-400" />
            {exercise.reps}
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Rest</span>
          <span className="text-base sm:text-lg font-black text-white flex items-center justify-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            {exercise.rest_seconds}s
          </span>
        </div>
      </div>

      {/* Instructions & Form Cues */}
      {exercise.instructions && (
        <div className="text-xs text-slate-300 bg-slate-900/40 p-3 rounded-xl border border-slate-800/50 leading-relaxed">
          <span className="font-semibold text-emerald-400">Coach Form Cue: </span>
          {exercise.instructions}
        </div>
      )}
    </div>
  )
}
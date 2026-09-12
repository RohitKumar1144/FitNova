import { Link } from 'react-router-dom'
import { Dumbbell, Sparkles, ChevronRight, Clock, Flame, CheckCircle2 } from 'lucide-react'

interface WorkoutPlanCardProps {
  availableMinutes?: number
  goal?: string
  fitnessLevel?: string
  hasExistingPlan?: boolean
  planTitle?: string
}

export default function WorkoutPlanCard({
  availableMinutes = 30,
  goal = 'Build Muscle',
  fitnessLevel = 'Beginner',
  hasExistingPlan = false,
  planTitle,
}: WorkoutPlanCardProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-950 border border-slate-800 p-6 sm:p-8 shadow-2xl">
      {/* Decorative gradient orb */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            {hasExistingPlan ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Active Workout Plan</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Ready • Tailored Routine</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              {availableMinutes} mins
            </span>
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              {fitnessLevel}
            </span>
          </div>
        </div>

        <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
          {hasExistingPlan && planTitle
            ? planTitle
            : 'Your personalized workout is almost ready.'}
        </h3>
        <p className="text-sm sm:text-base text-slate-400 max-w-xl mb-6 leading-relaxed">
          {hasExistingPlan
            ? `Your AI-tailored ${availableMinutes}-minute session is calibrated for your ${goal.replace('_', ' ')} goal. Ready to begin?`
            : `FitNova will generate a targeted ${availableMinutes}-minute routine focused on ${goal.replace('_', ' ')} based on your fitness profile.`}
        </p>

        <div className="flex flex-wrap items-center gap-4">
          <Link
            to="/workout-plan"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/20 transition duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Dumbbell className="w-4 h-4 stroke-[2.5]" />
            <span>{hasExistingPlan ? "View Today's Workout" : 'Generate My Workout'}</span>
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </Link>

          <Link
            to="/workout-session"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-sm font-semibold transition duration-200"
          >
            Go to Camera Tracker
          </Link>
        </div>
      </div>
    </div>
  )
}
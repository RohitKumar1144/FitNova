import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  Loader2,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  User,
  LogOut,
  AlertCircle,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import { signOut, useAuth, isDemoMode } from '../lib/supabase/auth'
import { getLatestWorkoutPlan } from '../lib/supabase/queries'
import { generateWorkoutPlan } from '../lib/ai/generateWorkoutPlan'
import type { WorkoutPlan } from '../types/workout'
import ExerciseCard from '../components/workout/ExerciseCard'
import DemoModeBadge from '../components/common/DemoModeBadge'

export default function WorkoutPlanPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [plan, setPlan] = useState<WorkoutPlan | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auth protection
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true })
    }
  }, [user, authLoading, navigate])

  // Load existing recent workout plan
  useEffect(() => {
    async function loadExistingPlan() {
      if (!user) return
      setLoadingPlan(true)
      try {
        const { data, error: planError } = await getLatestWorkoutPlan(user.id)
        if (planError) {
          console.error('Error loading latest plan:', planError)
        } else if (data?.plan_json) {
          setPlan(data.plan_json as WorkoutPlan)
        }
      } catch (err) {
        console.error('Failed to load plan:', err)
      } finally {
        setLoadingPlan(false)
      }
    }

    if (user) {
      loadExistingPlan()
    }
  }, [user])

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  const handleGenerate = async () => {
    if (generating) return
    setGenerating(true)
    setError(null)

    try {
      const res = await generateWorkoutPlan()
      if (res.error) {
        setError(res.error)
      } else if (res.plan) {
        setPlan(res.plan)
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setError(msg)
    } finally {
      setGenerating(false)
    }
  }

  if (authLoading || (loadingPlan && !plan)) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Checking workout schedule...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950 flex flex-col">
      {/* Top Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                <Activity className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              </div>
              <span className="text-lg font-extrabold text-white hidden sm:inline-block">
                Fit<span className="text-emerald-400">Nova</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {isDemoMode(user) && <DemoModeBadge />}
            <span className="text-xs text-slate-400 hidden sm:inline-flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              {user.email}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/30 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900/50 text-xs font-semibold transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Error message if generation failed */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-0.5">Could not generate workout plan</p>
              <p className="text-xs text-rose-300/90">{error}</p>
            </div>
          </div>
        )}

        {/* STATE 1: Empty State (No plan yet) */}
        {!plan && !generating && (
          <div className="relative rounded-3xl bg-slate-900/60 border border-slate-800 p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5 text-emerald-400">
              <Dumbbell className="w-7 h-7" />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Personalized AI Routine</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
              Your AI workout is ready to be created.
            </h2>
            <p className="text-sm sm:text-base text-slate-400 mb-8 max-w-lg mx-auto leading-relaxed">
              FitNova will analyze your saved fitness goals, experience level, equipment, and duration to formulate a precision routine designed for real-time camera tracking.
            </p>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base shadow-xl shadow-emerald-500/25 transition duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 cursor-pointer"
            >
              <Sparkles className="w-5 h-5" />
              <span>Generate My Workout</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* STATE 2: Loading / Generating State */}
        {generating && (
          <div className="rounded-3xl bg-slate-900/70 border border-slate-800 p-10 text-center max-w-xl mx-auto shadow-2xl space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <h3 className="text-2xl font-bold text-white">Formulating Your Routine...</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Our AI coach is balancing your sets, repetitions, and rest times for optimal biomechanics and form accuracy.
            </p>
          </div>
        )}

        {/* STATE 3: Plan Rendered Successfully */}
        {plan && !generating && (
          <div className="space-y-8">
            
            {/* Plan Header Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-950 border border-slate-800 p-6 sm:p-8 shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>AI Plan Formulated</span>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-200">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    {plan.duration_minutes} Minutes
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-200 capitalize">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    {plan.difficulty}
                  </span>
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-200 capitalize">
                    <Target className="w-3.5 h-3.5 text-cyan-400" />
                    {plan.goal.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
                {plan.title}
              </h1>
              <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed mb-6">
                {plan.description}
              </p>

              {/* Action Buttons Top */}
              <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-800/80">
                <Link
                  to="/workout-session"
                  className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/25 transition duration-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Start Workout</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={generating}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-sm font-semibold transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Regenerate Workout</span>
                </button>
              </div>
            </div>

            {/* Step 21: Adaptive Fitness Personalization Section */}
            {plan.adaptations && plan.adaptations.length > 0 ? (
              <div className="rounded-2xl bg-gradient-to-r from-emerald-950/30 via-slate-900/60 to-slate-900/60 border border-emerald-500/20 p-5 sm:p-6 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>Personalized For You: Adaptive Progression</span>
                </div>
                <p className="text-xs text-slate-400">
                  Calibrated automatically by your CV form accuracy and completion metrics from your previous workouts:
                </p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  {plan.adaptations.map((adapt, i) => {
                    const formatName = (t: string) => {
                      if (t === 'squat') return 'Squats'
                      if (t === 'pushup') return 'Push-ups'
                      if (t === 'bicep_curl') return 'Bicep Curls'
                      return t
                    }
                    const isUp = adapt.direction === 'increase'
                    const isDown = adapt.direction === 'decrease'
                    return (
                      <div
                        key={i}
                        className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2 ${
                          isUp
                            ? 'bg-emerald-500/5 border-emerald-500/20'
                            : isDown
                            ? 'bg-amber-500/5 border-amber-500/20'
                            : 'bg-slate-900/50 border-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-white">
                            {formatName(adapt.exercise_type)}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                              isUp
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : isDown
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {isUp && <TrendingUp className="w-3 h-3" />}
                            {isDown && <TrendingDown className="w-3 h-3" />}
                            {!isUp && !isDown && <Minus className="w-3 h-3" />}
                            <span>
                              {adapt.previous_reps} → {adapt.next_reps} reps
                            </span>
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {adapt.reason}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="px-4 py-3 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-center gap-2.5 text-xs text-slate-400">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  First workout baseline — FitNova will adapt your reps &amp; volume automatically based on your camera tracking performance.
                </span>
              </div>
            )}

            {/* Warm-up Section */}
            {plan.warmup && plan.warmup.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" />
                  Warm-Up Phase (Dynamic Mobility)
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {plan.warmup.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between"
                    >
                      <span className="text-sm font-semibold text-slate-200">{item.name}</span>
                      <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {item.duration_seconds}s
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Main Exercises Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <Dumbbell className="w-3.5 h-3.5" />
                  Main Exercises ({plan.exercises.length} AI-Tracked)
                </h3>
                <span className="text-xs text-slate-400 hidden sm:inline-block">
                  Automatic rep counting + posture feedback supported
                </span>
              </div>

              <div className="grid gap-4">
                {plan.exercises.map((ex, idx) => (
                  <ExerciseCard key={idx} exercise={ex} index={idx} />
                ))}
              </div>
            </div>

            {/* Cool-down Section */}
            {plan.cooldown && plan.cooldown.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Cool-Down &amp; Recovery
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {plan.cooldown.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 flex items-center justify-between"
                    >
                      <span className="text-sm font-semibold text-slate-200">{item.name}</span>
                      <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                        {item.duration_seconds}s
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons Bottom */}
            <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-sm font-semibold transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Regenerate Workout</span>
              </button>

              <Link
                to="/workout-session"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/25 transition duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Start Workout Session</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

          </div>
        )}

      </main>
    </div>
  )
}
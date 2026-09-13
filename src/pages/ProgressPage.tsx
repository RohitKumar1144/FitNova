import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowLeft,
  Award,
  Calendar,
  ChevronRight,
  Flame,
  LogOut,
  Play,
  Sparkles,
  TrendingUp,
  User,
  Check,
  Minus,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts'
import { signOut, useAuth, isDemoMode } from '../lib/supabase/auth'
import {
  getDetailedProgressDashboardData,
  type ProgressDashboardData,
} from '../lib/supabase/queries'
import { calculateBadges } from '../lib/progress/badges'
import BadgesSection from '../components/progress/BadgesSection'
import WorkoutHistory from '../components/progress/WorkoutHistory'
import DemoModeBadge from '../components/common/DemoModeBadge'

export default function ProgressPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [data, setData] = useState<ProgressDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  // Auth protection
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true })
    }
  }, [user, authLoading, navigate])

  // Load progress data
  useEffect(() => {
    async function loadProgress() {
      if (!user) return
      setLoading(true)
      try {
        const { data: resData } = await getDetailedProgressDashboardData(user.id)
        if (resData) {
          setData(resData)
        }
      } catch (err) {
        console.error('Failed to load progress data:', err)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      loadProgress()
    }
  }, [user])

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  if (authLoading || (loading && !data)) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Loading your progress analytics...</p>
        </div>
      </div>
    )
  }

  if (!user || !data) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950 flex flex-col">
      {/* 1. TOP NAVBAR */}
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

          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <Link to="/dashboard" className="hover:text-emerald-400 transition-colors">
              Dashboard
            </Link>
            <Link to="/workout-plan" className="hover:text-emerald-400 transition-colors">
              Workout
            </Link>
            <Link to="/progress" className="text-emerald-400 font-semibold flex items-center gap-1.5">
              Progress
            </Link>
            <Link to="/ai-coach" className="hover:text-emerald-400 transition-colors">
              AI Coach
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {isDemoMode(user) && <DemoModeBadge size="sm" />}
            <span className="text-xs text-slate-400 hidden sm:inline-flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              {user.email?.split('@')[0]}
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

      {/* 2. MAIN PROGRESS CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Real Performance History</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Progress Dashboard
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Deterministic metrics tracked and verified by your computer-vision workout camera.
            </p>
          </div>

          <Link
            to="/workout-session"
            className="self-start sm:self-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold shadow-lg shadow-emerald-500/20 transition"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Start Workout</span>
          </Link>
        </div>

        {/* 3. DETERMINISTIC PROGRESS SUMMARY BANNER */}
        <div className="rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900/80 to-slate-900 border border-cyan-500/20 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 text-cyan-400 shadow-md shadow-cyan-500/10">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-cyan-400 block mb-0.5">
                Current Training Status
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {data.summary}
              </h3>
            </div>
          </div>

          {data.hasHistory && (
            <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-400 bg-slate-950/60 px-3.5 py-1.5 rounded-xl border border-slate-800">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>{data.workoutsThisWeek} workouts this week</span>
            </div>
          )}
        </div>

        {/* EMPTY STATE OR FULL ANALYTICS */}
        {!data.hasHistory ? (
          <div className="space-y-8">
            <div className="rounded-3xl bg-slate-900/50 border border-slate-800 p-10 sm:p-14 text-center max-w-xl mx-auto shadow-2xl space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mx-auto text-slate-400">
                <Activity className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-white">
                Your progress will appear here after your first workout.
              </h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                Every completed repetition, posture score, and consistency streak is calculated automatically from your camera-tracked routines.
              </p>
              <div className="pt-2">
                <Link
                  to="/workout-session"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/25 transition duration-200"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Start Your First Workout</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* WORKOUT HISTORY */}
            <WorkoutHistory userId={user.id} />

            {/* ACHIEVEMENTS (All locked for new user) */}
            <BadgesSection
              badges={calculateBadges({
                totalWorkouts: data.totalWorkouts,
                currentStreak: data.currentStreak,
                totalReps: data.totalReps,
                avgForm: data.avgForm,
              })}
            />
          </div>
        ) : (
          <>
            {/* 4. KEY METRICS GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Metric 1: Current Streak */}
              <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 hover:border-slate-700 transition">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Current Streak
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Flame className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">{data.currentStreak}</span>
                  <span className="text-xs text-slate-400">
                    {data.currentStreak === 1 ? 'day' : 'days'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">Consecutive active days</p>
              </div>

              {/* Metric 2: Total Workouts */}
              <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 hover:border-slate-700 transition">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Total Workouts
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">{data.totalWorkouts}</span>
                  <span className="text-xs text-slate-400">sessions</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  {data.workoutsThisWeek} completed this week
                </p>
              </div>

              {/* Metric 3: Total Reps */}
              <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 hover:border-slate-700 transition">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Total Reps
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Activity className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">{data.totalReps}</span>
                  <span className="text-xs text-slate-400">repetitions</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">AI validated volume</p>
              </div>

              {/* Metric 4: Average Form Quality */}
              <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-5 hover:border-slate-700 transition">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Average Form
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Award className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white">
                    {data.avgForm !== null ? `${data.avgForm}%` : '—'}
                  </span>
                  <span className="text-xs text-slate-400">accuracy</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">Bio-mechanical accuracy</p>
              </div>
            </div>

            {/* 5. THIS WEEK 7-DAY ACTIVITY VIEW */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span>This Week&apos;s Activity</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Calendar tracking based on local session timestamp
                  </p>
                </div>
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full self-start sm:self-auto">
                  {data.workoutsThisWeek} {data.workoutsThisWeek === 1 ? 'workout' : 'workouts'} this week
                </span>
              </div>

              <div className="grid grid-cols-7 gap-2 sm:gap-3 pt-2">
                {data.weekDays.map((day, idx) => (
                  <div
                    key={idx}
                    className={`p-3 sm:p-4 rounded-xl border text-center flex flex-col items-center justify-between gap-2 transition ${
                      day.hasWorkout
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-white shadow-md shadow-emerald-500/5'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">
                      {day.dayName}
                    </span>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        day.hasWorkout
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-900 text-slate-600'
                      }`}
                    >
                      {day.hasWorkout ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : (
                        <Minus className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 truncate">
                      {day.hasWorkout ? `${day.totalReps} reps` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 6. CHARTS ROW: REPS OVER TIME & FORM TREND */}
            <div className="grid lg:grid-cols-12 gap-6">
              
              {/* Reps Over Time Chart (7 cols) */}
              <div className="lg:col-span-7 rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-cyan-400" />
                      <span>Reps Over Time</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Completed repetitions across workout sessions
                    </p>
                  </div>
                </div>

                {data.chartData && data.chartData.length >= 2 ? (
                  <div className="h-64 w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis
                          dataKey="date"
                          stroke="#64748b"
                          fontSize={11}
                          tickLine={false}
                          axisLine={{ stroke: '#334155' }}
                        />
                        <YAxis
                          stroke="#64748b"
                          fontSize={11}
                          tickLine={false}
                          axisLine={{ stroke: '#334155' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#090d16',
                            borderColor: '#334155',
                            borderRadius: '0.75rem',
                            fontSize: '12px',
                            color: '#f8fafc',
                          }}
                          cursor={{ fill: 'rgba(51, 65, 85, 0.2)' }}
                        />
                        <Bar
                          dataKey="reps"
                          name="Total Reps"
                          fill="#10b981"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-48 rounded-xl bg-slate-950/50 border border-slate-800/80 flex flex-col items-center justify-center text-center p-6 space-y-2">
                    <Activity className="w-6 h-6 text-slate-500" />
                    <p className="text-xs text-slate-400">
                      Complete at least 2 workout sessions to view your volume progression chart.
                    </p>
                  </div>
                )}
              </div>

              {/* Form Trend Line Chart (5 cols) */}
              <div className="lg:col-span-5 rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-400" />
                    <span>Form Accuracy Trend</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Posture quality trajectory per workout day
                  </p>
                </div>

                {data.chartData && data.chartData.length >= 2 ? (
                  <div className="h-64 w-full pt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis
                          dataKey="date"
                          stroke="#64748b"
                          fontSize={11}
                          tickLine={false}
                          axisLine={{ stroke: '#334155' }}
                        />
                        <YAxis
                          domain={[0, 100]}
                          stroke="#64748b"
                          fontSize={11}
                          tickLine={false}
                          axisLine={{ stroke: '#334155' }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#090d16',
                            borderColor: '#334155',
                            borderRadius: '0.75rem',
                            fontSize: '12px',
                            color: '#f8fafc',
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="avgForm"
                          name="Form Score %"
                          stroke="#a855f7"
                          strokeWidth={2.5}
                          dot={{ fill: '#a855f7', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-48 rounded-xl bg-slate-950/50 border border-slate-800/80 flex flex-col items-center justify-center text-center p-6 space-y-2">
                    <Award className="w-6 h-6 text-slate-500" />
                    <p className="text-xs text-slate-400">
                      Complete more workouts to see your form trend.
                    </p>
                  </div>
                )}
              </div>

            </div>

            {/* 7. FITNOVA ACTIVITY SCORE INTEGRATION */}
            {data.activityScore && data.activityScore.hasHistory && (
              <div className="rounded-2xl bg-gradient-to-r from-emerald-950/30 via-slate-900/70 to-slate-900/70 border border-emerald-500/20 p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-500/10 font-mono font-black text-2xl">
                    {data.activityScore.score}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                        FitNova Activity Score
                      </span>
                      <span className="text-[10px] text-slate-400">/ 100</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 max-w-md">
                      Consistency ({data.activityScore.consistency}) · Form ({data.activityScore.form}) · Completion ({data.activityScore.completion}) · Progression ({data.activityScore.progression})
                    </p>
                  </div>
                </div>

                <Link
                  to="/dashboard"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition self-end sm:self-auto"
                >
                  <span>View on Dashboard</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* 8. WORKOUT HISTORY */}
            <WorkoutHistory userId={user.id} />

            {/* 9. ACHIEVEMENTS SECTION */}
            <BadgesSection
              badges={calculateBadges({
                totalWorkouts: data.totalWorkouts,
                currentStreak: data.currentStreak,
                totalReps: data.totalReps,
                avgForm: data.avgForm,
              })}
            />
          </>
        )}

      </main>
    </div>
  )
}

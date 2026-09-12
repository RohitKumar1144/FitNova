import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  Award,
  Calendar,
  ChevronRight,
  Clock,
  Compass,
  Flame,
  Layers,
  LogOut,
  Menu,
  MessageSquare,
  Play,
  RotateCcw,
  Sparkles,
  TrendingUp,
  User,
  X,
  Zap,
} from 'lucide-react'
import { signOut, useAuth } from '../lib/supabase/auth'
import { getProfile, getDashboardStats, getLatestWorkoutPlan, type DashboardStats } from '../lib/supabase/queries'
import type { Profile } from '../types/profile'
import type { WorkoutPlanRecord } from '../types/workout'
import WorkoutPlanCard from '../components/workout/WorkoutPlanCard'
import StreakBadge from '../components/progress/StreakBadge'

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [latestPlan, setLatestPlan] = useState<WorkoutPlanRecord | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    currentStreak: 0,
    totalReps: 0,
    totalSessions: 0,
    avgFormScore: 0,
  })
  const [dataLoading, setDataLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Auth protection
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true })
    }
  }, [user, authLoading, navigate])

  // Load profile, stats, and latest plan
  useEffect(() => {
    async function loadDashboardData() {
      if (!user) return
      setDataLoading(true)

      try {
        const [profileRes, statsRes, planRes] = await Promise.all([
          getProfile(user.id),
          getDashboardStats(user.id),
          getLatestWorkoutPlan(user.id),
        ])

        if (profileRes.data) {
          setProfile(profileRes.data as Profile)
        }
        if (statsRes.data) {
          setStats(statsRes.data)
        }
        if (planRes.data) {
          setLatestPlan(planRes.data)
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err)
      } finally {
        setDataLoading(false)
      }
    }

    if (user) {
      loadDashboardData()
    }
  }, [user])

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  // Get user's first name
  const getFirstName = () => {
    if (profile?.full_name) {
      return profile.full_name.trim().split(' ')[0]
    }
    if (user?.email) {
      return user.email.split('@')[0]
    }
    return 'Athlete'
  }

  if (authLoading || (dataLoading && !profile)) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Loading your fitness dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950 flex flex-col">
      {/* 1. TOP NAVIGATION */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1">
              Fit<span className="text-emerald-400">Nova</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ml-1">
                AI
              </span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <Link to="/dashboard" className="text-emerald-400 font-semibold flex items-center gap-1.5">
              Dashboard
            </Link>
            <Link to="/workout-plan" className="hover:text-emerald-400 transition-colors">
              Workout
            </Link>
            <Link to="/progress" className="hover:text-emerald-400 transition-colors">
              Progress
            </Link>
            <Link to="/ai-coach" className="hover:text-emerald-400 transition-colors">
              AI Coach
            </Link>
          </div>

          {/* Right Area: User badge & Sign Out */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <User className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-slate-200">{getFirstName()}</span>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/30 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900/50 text-xs font-semibold transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-950/95 border-b border-slate-800 px-4 pt-3 pb-6 space-y-3">
            <div className="flex items-center gap-2 pb-3 mb-2 border-b border-slate-800 text-xs text-slate-300">
              <User className="w-4 h-4 text-emerald-400" />
              <span>Signed in as <strong className="text-white">{profile?.full_name || user.email}</strong></span>
            </div>

            <Link
              to="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-semibold text-emerald-400 bg-emerald-500/10"
            >
              Dashboard
            </Link>
            <Link
              to="/workout-plan"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-900 hover:text-white"
            >
              Workout Plan
            </Link>
            <Link
              to="/progress"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-900 hover:text-white"
            >
              Progress
            </Link>
            <Link
              to="/ai-coach"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-900 hover:text-white"
            >
              AI Coach
            </Link>

            <div className="pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-rose-400 border border-slate-800 text-xs font-semibold"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* MAIN DASHBOARD CONTENT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* 2. WELCOME HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight flex items-center gap-2">
              Good morning, {getFirstName()} {'\u{1F44B}'}
            </h1>
            <p className="text-sm sm:text-base text-slate-400 mt-1">
              Ready to work on your fitness today?
            </p>
          </div>

          <div className="flex items-center gap-3">
            <StreakBadge streak={stats.currentStreak} />
            <Link
              to="/onboarding"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition"
              title="Edit Fitness Profile"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              Edit Profile
            </Link>
          </div>
        </div>

        {/* 3. FITNESS SUMMARY CARDS (4 Stats) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1: Streak */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/90 p-5 hover:border-slate-700 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Current Streak</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{stats.currentStreak}</span>
              <span className="text-xs text-slate-400">{stats.currentStreak === 1 ? 'day' : 'days'}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Active daily momentum</p>
          </div>

          {/* Card 2: Total Reps */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/90 p-5 hover:border-slate-700 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Reps</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{stats.totalReps}</span>
              <span className="text-xs text-slate-400">reps logged</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Validated by AI vision</p>
          </div>

          {/* Card 3: Workout Sessions */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/90 p-5 hover:border-slate-700 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Workout Sessions</span>
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{stats.totalSessions}</span>
              <span className="text-xs text-slate-400">completed</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Finished routines</p>
          </div>

          {/* Card 4: Average Form Score */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/90 p-5 hover:border-slate-700 transition">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Form Score</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">
                {stats.avgFormScore > 0 ? `${stats.avgFormScore}%` : '\u2014'}
              </span>
              <span className="text-xs text-slate-400">accuracy</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Real-time posture score</p>
          </div>
        </div>

        {/* 4. TODAY'S WORKOUT SECTION */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Today&apos;s Training
          </h2>
          <WorkoutPlanCard
            availableMinutes={profile?.available_time_minutes || 30}
            goal={profile?.goal || 'improve_fitness'}
            fitnessLevel={profile?.fitness_level || 'beginner'}
            hasExistingPlan={!!latestPlan}
            planTitle={latestPlan?.plan_json?.title}
          />
        </div>

        {/* 5. QUICK ACTIONS & 6. PROFILE SUMMARY */}
        <div className="grid lg:grid-cols-12 gap-6">
          
          {/* 5. QUICK ACTIONS (7 cols on desktop) */}
          <div className="lg:col-span-7 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Quick Actions
            </h3>

            <div className="grid sm:grid-cols-3 gap-4">
              {/* Action 1: Start Workout */}
              <Link
                to="/workout-session"
                className="group p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-900/80 transition duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-105 transition-transform">
                    <Play className="w-5 h-5 fill-emerald-400/20" />
                  </div>
                  <h4 className="font-bold text-white text-base mb-1 group-hover:text-emerald-400 transition-colors">
                    Start Workout
                  </h4>
                  <p className="text-xs text-slate-400">
                    Open the camera vision tracker for real-time form detection.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-emerald-400 font-semibold">
                  <span>Launch Camera</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </Link>

              {/* Action 2: View Progress */}
              <Link
                to="/progress"
                className="group p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900/80 transition duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-4 group-hover:scale-105 transition-transform">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-white text-base mb-1 group-hover:text-cyan-400 transition-colors">
                    View Progress
                  </h4>
                  <p className="text-xs text-slate-400">
                    Check your repetition records, streaks, and form logs.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-cyan-400 font-semibold">
                  <span>Analytics</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </Link>

              {/* Action 3: AI Coach */}
              <Link
                to="/ai-coach"
                className="group p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-900/80 transition duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-105 transition-transform">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-white text-base mb-1 group-hover:text-purple-400 transition-colors">
                    AI Coach
                  </h4>
                  <p className="text-xs text-slate-400">
                    Ask questions and get intelligent workout modifications.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-purple-400 font-semibold">
                  <span>Chat With Coach</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </Link>
            </div>
          </div>

          {/* 6. PROFILE SUMMARY CARD (5 cols on desktop) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Fitness Profile
              </h3>
              <Link to="/onboarding" className="text-xs text-emerald-400 hover:underline">
                Update
              </Link>
            </div>

            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-emerald-400" />
                  Fitness Level
                </span>
                <span className="text-sm font-semibold text-white capitalize">
                  {profile?.fitness_level || 'Beginner'}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Primary Goal
                </span>
                <span className="text-sm font-semibold text-white capitalize">
                  {profile?.goal ? String(profile.goal).replace('_', ' ') : 'Stay Active'}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-cyan-400" />
                  Workout Window
                </span>
                <span className="text-sm font-semibold text-white">
                  {profile?.available_time_minutes || 30} minutes
                </span>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-xs text-slate-400 flex items-center gap-1.5 pt-0.5">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  Equipment
                </span>
                <span className="text-xs font-medium text-slate-300 text-right max-w-[200px]">
                  {Array.isArray(profile?.equipment)
                    ? profile.equipment.join(', ')
                    : String(profile?.equipment || 'No Equipment')}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* 7. PROGRESS PREVIEW SECTION */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Your Progress Snapshot
            </h3>
            <Link to="/progress" className="text-xs text-emerald-400 hover:underline">
              View Detailed Analytics
            </Link>
          </div>

          {stats.totalSessions > 0 ? (
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="text-lg font-bold text-white mb-1">Great momentum!</h4>
                <p className="text-sm text-slate-400">
                  You have finished {stats.totalSessions} sessions with {stats.totalReps} total repetitions.
                </p>
              </div>
              <Link
                to="/workout-session"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold transition"
              >
                Keep Going
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-8 text-center max-w-2xl mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mx-auto mb-4 text-slate-400">
                <Activity className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white mb-2">
                Complete your first workout to start tracking your progress.
              </h4>
              <p className="text-xs sm:text-sm text-slate-400 mb-6 max-w-md mx-auto">
                Once you finish a workout with the AI camera tracker, your repetition counts, form accuracy, and consistency streaks will appear here.
              </p>
              <Link
                to="/workout-session"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition duration-200"
              >
                <Play className="w-4 h-4 stroke-[2.5]" />
                Start Your First Workout
              </Link>
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
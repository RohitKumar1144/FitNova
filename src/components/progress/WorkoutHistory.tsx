import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  History,
  Activity,
  Flame,
  Dumbbell,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Play,
  RefreshCw,
  Award,
} from 'lucide-react'
import {
  getUserWorkoutSessions,
  type WorkoutSessionRecord,
} from '../../lib/supabase/queries'

interface WorkoutHistoryProps {
  userId: string
  className?: string
  initialSessions?: WorkoutSessionRecord[]
}

const DEFAULT_VISIBLE_COUNT = 5

export default function WorkoutHistory({
  userId,
  className = '',
  initialSessions,
}: WorkoutHistoryProps) {
  const [sessions, setSessions] = useState<WorkoutSessionRecord[]>(initialSessions || [])
  const [loading, setLoading] = useState<boolean>(!initialSessions)
  const [error, setError] = useState<string | null>(null)
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'squat' | 'pushup' | 'bicep_curl'>('all')
  const [isExpanded, setIsExpanded] = useState<boolean>(false)
  const [expandedFeedbackId, setExpandedFeedbackId] = useState<string | null>(null)

  // Fetch sessions if not provided or when userId changes
  useEffect(() => {
    if (initialSessions && initialSessions.length > 0) {
      setSessions(initialSessions)
      setLoading(false)
      return
    }

    async function loadSessions() {
      if (!userId) return
      setLoading(true)
      setError(null)
      try {
        const { data, error: fetchErr } = await getUserWorkoutSessions(userId, 50)
        if (fetchErr) {
          throw fetchErr
        }
        setSessions(data || [])
      } catch (err: unknown) {
        console.error('Failed to load workout history:', err)
        setError('Unable to load workout history. Please check your connection.')
      } finally {
        setLoading(false)
      }
    }

    loadSessions()
  }, [userId, initialSessions])

  const handleRefresh = async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchErr } = await getUserWorkoutSessions(userId, 50)
      if (fetchErr) throw fetchErr
      setSessions(data || [])
    } catch (err: unknown) {
      console.error('Failed to refresh workout history:', err)
      setError('Unable to refresh workout history.')
    } finally {
      setLoading(false)
    }
  }

  // Filter sessions
  const filteredSessions = useMemo(() => {
    if (selectedFilter === 'all') return sessions
    return sessions.filter((s) => s.exercise_type === selectedFilter)
  }, [sessions, selectedFilter])

  // Slice visible items
  const visibleSessions = useMemo(() => {
    if (isExpanded) return filteredSessions
    return filteredSessions.slice(0, DEFAULT_VISIBLE_COUNT)
  }, [filteredSessions, isExpanded])

  // Count per exercise for filter badges
  const exerciseCounts = useMemo(() => {
    const counts = { all: sessions.length, squat: 0, pushup: 0, bicep_curl: 0 }
    for (const s of sessions) {
      if (s.exercise_type === 'squat') counts.squat++
      else if (s.exercise_type === 'pushup') counts.pushup++
      else if (s.exercise_type === 'bicep_curl') counts.bicep_curl++
    }
    return counts
  }, [sessions])

  // Format helpers
  const formatDateTime = (isoString: string) => {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return { date: 'Unknown Date', time: '' }

    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const isYesterday = d.toDateString() === yesterday.toDateString()

    const time = d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })

    if (isToday) return { date: 'Today', time }
    if (isYesterday) return { date: 'Yesterday', time }

    const date = d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
    return { date, time }
  }

  const formatDuration = (seconds: number) => {
    const safeSecs = Math.max(0, Math.round(seconds || 0))
    const m = Math.floor(safeSecs / 60)
    const s = safeSecs % 60
    if (m === 0) return `${s}s`
    if (s === 0) return `${m}m`
    return `${m}m ${s}s`
  }

  const calculateAccuracy = (goodReps: number, badReps: number) => {
    const good = Math.max(0, goodReps || 0)
    const bad = Math.max(0, badReps || 0)
    const total = good + bad
    return total > 0 ? Math.round((good / total) * 100) : 0
  }

  const getExerciseMeta = (type: string) => {
    switch (type.toLowerCase()) {
      case 'squat':
        return {
          name: 'Squats',
          badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
          icon: Activity,
          iconColor: 'text-cyan-400',
        }
      case 'pushup':
      case 'push_up':
      case 'push-up':
        return {
          name: 'Push-ups',
          badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          icon: Flame,
          iconColor: 'text-emerald-400',
        }
      case 'bicep_curl':
      case 'bicepcurl':
      case 'bicep-curl':
        return {
          name: 'Bicep Curls',
          badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          icon: Dumbbell,
          iconColor: 'text-purple-400',
        }
      default:
        return {
          name: type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
          icon: Activity,
          iconColor: 'text-slate-400',
        }
    }
  }

  const getAccuracyBadgeStyle = (accuracy: number) => {
    if (accuracy >= 85) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    }
    if (accuracy >= 70) {
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
    }
    return 'bg-amber-500/10 text-amber-400 border-amber-500/30'
  }

  const parseAiFeedbackText = (feedback: any): string | null => {
    if (!feedback) return null
    if (typeof feedback === 'string') return feedback
    if (typeof feedback === 'object' && typeof feedback.feedback === 'string') {
      return feedback.feedback
    }
    return null
  }

  return (
    <section className={`rounded-3xl bg-slate-900/60 border border-slate-800 p-5 sm:p-7 space-y-6 ${className}`}>
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <History className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">Workout History</h2>
            {sessions.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative log of all completed camera-tracked workout sessions
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer disabled:opacity-50"
            title="Refresh History"
            aria-label="Refresh history"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Exercise Filter Pills */}
      {sessions.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <button
            type="button"
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer shrink-0 ${
              selectedFilter === 'all'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            All ({exerciseCounts.all})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('squat')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer shrink-0 ${
              selectedFilter === 'squat'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Squats ({exerciseCounts.squat})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('pushup')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer shrink-0 ${
              selectedFilter === 'pushup'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Push-ups ({exerciseCounts.pushup})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter('bicep_curl')}
            className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer shrink-0 ${
              selectedFilter === 'bicep_curl'
                ? 'bg-purple-500 text-slate-950 font-bold shadow-md shadow-purple-500/20'
                : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            Bicep Curls ({exerciseCounts.bicep_curl})
          </button>
        </div>
      )}

      {/* 3. Loading State */}
      {loading && sessions.length === 0 && (
        <div className="space-y-3 py-4">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="h-20 rounded-2xl bg-slate-950/40 border border-slate-800/60 animate-pulse flex items-center px-4"
            />
          ))}
        </div>
      )}

      {/* 4. Error State */}
      {error && (
        <div className="rounded-2xl bg-rose-950/20 border border-rose-900/40 p-4 text-center space-y-2">
          <p className="text-xs text-rose-300 font-medium">{error}</p>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-rose-300 text-xs font-semibold border border-rose-900/40 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Loading</span>
          </button>
        </div>
      )}

      {/* 5. Empty State */}
      {!loading && !error && sessions.length === 0 && (
        <div className="rounded-2xl bg-slate-950/40 border border-slate-800/80 p-8 sm:p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-400 shadow-inner">
            <Dumbbell className="w-6 h-6 text-emerald-400" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base font-bold text-white">No Completed Workouts Yet</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Start your first camera-tracked routine to log real-time repetitions, form accuracy scores, and AI biomechanical feedback.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/workout-session"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>Start Workout Now</span>
            </Link>
          </div>
        </div>
      )}

      {/* 6. Filter Empty State */}
      {!loading && !error && sessions.length > 0 && filteredSessions.length === 0 && (
        <div className="rounded-2xl bg-slate-950/40 border border-slate-800 p-6 text-center space-y-2">
          <p className="text-xs text-slate-400">
            No completed workouts found for <span className="text-white font-semibold capitalize">{selectedFilter.replace(/_/g, ' ')}</span>.
          </p>
          <button
            type="button"
            onClick={() => setSelectedFilter('all')}
            className="text-xs text-emerald-400 hover:underline font-semibold cursor-pointer"
          >
            View all workouts ({sessions.length})
          </button>
        </div>
      )}

      {/* 7. Workout Session List (Newest First) */}
      {!loading && filteredSessions.length > 0 && (
        <div className="space-y-3">
          {visibleSessions.map((session) => {
            const meta = getExerciseMeta(session.exercise_type)
            const Icon = meta.icon
            const { date, time } = formatDateTime(session.created_at)
            const accuracy = calculateAccuracy(session.good_form_reps, session.bad_form_reps)
            const duration = formatDuration(session.duration_seconds)
            const feedbackText = parseAiFeedbackText(session.ai_feedback)
            const isFeedbackOpen = expandedFeedbackId === session.id

            return (
              <div
                key={session.id}
                className="group rounded-2xl bg-slate-950/50 hover:bg-slate-950/80 border border-slate-800/80 hover:border-slate-700/80 transition duration-150 p-4 sm:p-5 space-y-3"
              >
                {/* Main Card Content */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  {/* Left: Exercise & Date */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${meta.badgeClass}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-white truncate">{meta.name}</h4>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${meta.badgeClass}`}>
                          {session.exercise_type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span>{date}</span>
                        {time && (
                          <>
                            <span>·</span>
                            <span>{time}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Middle / Right: Stats & Form Breakdown */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                    {/* Reps */}
                    <div className="text-left sm:text-right">
                      <div className="flex items-baseline gap-1 sm:justify-end">
                        <span className="text-base sm:text-lg font-black font-mono text-white">
                          {session.rep_count}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400">reps</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                        <span className="text-emerald-400 font-semibold inline-flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          {session.good_form_reps}
                        </span>
                        <span>/</span>
                        <span className="text-amber-400 font-semibold inline-flex items-center gap-0.5">
                          <AlertCircle className="w-3 h-3" />
                          {session.bad_form_reps}
                        </span>
                      </div>
                    </div>

                    {/* Accuracy Badge */}
                    <div className="text-center sm:text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-bold border ${getAccuracyBadgeStyle(
                          accuracy,
                        )}`}
                      >
                        <Award className="w-3 h-3" />
                        {accuracy}%
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5 text-center sm:text-right">Accuracy</p>
                    </div>

                    {/* Duration */}
                    <div className="text-right">
                      <div className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-slate-300">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {duration}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">Duration</p>
                    </div>
                  </div>
                </div>

                {/* Optional AI Feedback Drawer Toggle */}
                {feedbackText && (
                  <div className="pt-2 border-t border-slate-800/60">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedFeedbackId(isFeedbackOpen ? null : session.id)
                      }
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{isFeedbackOpen ? 'Hide AI Coach Note' : 'View AI Coach Note'}</span>
                      {isFeedbackOpen ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>

                    {isFeedbackOpen && (
                      <div className="mt-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 p-3 text-xs text-slate-200 leading-relaxed flex items-start gap-2.5">
                        <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-emerald-300 text-[11px] mb-0.5">Coach Feedback</p>
                          <p className="text-slate-300">{feedbackText}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 8. Pagination / Expand Toggle */}
      {!loading && filteredSessions.length > DEFAULT_VISIBLE_COUNT && (
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition cursor-pointer shadow-md"
          >
            <span>
              {isExpanded
                ? 'Show Less'
                : `View All (${filteredSessions.length} sessions)`}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      )}
    </section>
  )
}

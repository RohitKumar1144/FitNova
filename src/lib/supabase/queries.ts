import { supabase } from './client'
import type { Profile } from '../../types/profile'
import type { WorkoutPlanRecord } from '../../types/workout'
import {
  calculateCurrentStreak,
  getThisWeekActivity,
  getDeterministicProgressSummary,
} from '../progress/activityScore'

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  return { data, error }
}

export async function upsertProfile(profile: Partial<Profile> & { id: string }) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert(profile)
    .select()
    .single()

  return { data, error }
}

export async function getLatestWorkoutPlan(userId: string): Promise<{ data: WorkoutPlanRecord | null; error: unknown }> {
  const { data, error } = await supabase
    .from('workout_plans')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return { data: data as WorkoutPlanRecord | null, error }
}

export interface DashboardStats {
  currentStreak: number
  totalReps: number
  totalSessions: number
  avgFormScore: number
}

export async function getDashboardStats(userId: string): Promise<{ data: DashboardStats; error: unknown }> {
  try {
    // 1. Fetch workout_sessions — use actual columns: rep_count, good_form_reps, bad_form_reps
    const { data: sessions, error: sessionsError } = await supabase
      .from('workout_sessions')
      .select('id, rep_count, good_form_reps, bad_form_reps, created_at')
      .eq('user_id', userId)

    // 2. Fetch latest progress_snapshot — use actual columns: streak_days, total_reps, updated_at
    const { data: snapshots, error: snapshotsError } = await supabase
      .from('progress_snapshots')
      .select('streak_days, total_reps, total_sessions, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)

    let currentStreak = 0
    let totalReps = 0
    let totalSessions = 0
    let avgFormScore = 0

    if (snapshots && snapshots.length > 0) {
      currentStreak = snapshots[0].streak_days || 0
      totalReps = snapshots[0].total_reps || 0
      totalSessions = snapshots[0].total_sessions || 0
    }

    if (sessions && sessions.length > 0) {
      // Use session count from actual records if snapshot didn't have it
      if (totalSessions === 0) {
        totalSessions = sessions.length
      }
      // Derive total reps from sessions if snapshot didn't have it
      if (totalReps === 0) {
        totalReps = sessions.reduce((acc, s) => acc + (s.rep_count || 0), 0)
      }
      // Derive average form score from good_form_reps / total tracked reps
      const totalGood = sessions.reduce((acc, s) => acc + (s.good_form_reps || 0), 0)
      const totalBad = sessions.reduce((acc, s) => acc + (s.bad_form_reps || 0), 0)
      const totalTracked = totalGood + totalBad
      if (totalTracked > 0) {
        avgFormScore = Math.round((totalGood / totalTracked) * 100)
      }

      // Calculate streak deterministically from session timestamps
      const sessionTimestamps = sessions
        .map((s) => s.created_at)
        .filter((ts): ts is string => Boolean(ts))
      if (sessionTimestamps.length > 0) {
        currentStreak = calculateCurrentStreak(sessionTimestamps)
      }
    }

    return {
      data: {
        currentStreak,
        totalReps,
        totalSessions,
        avgFormScore,
      },
      error: sessionsError || snapshotsError || null,
    }
  } catch (err) {
    return {
      data: {
        currentStreak: 0,
        totalReps: 0,
        totalSessions: 0,
        avgFormScore: 0,
      },
      error: err,
    }
  }
}

export async function saveWorkoutSession(sessionData: {
  user_id: string
  exercise_type: string
  rep_count: number
  good_form_reps: number
  bad_form_reps: number
  duration_seconds: number
  ai_feedback?: any
}) {
  const { data, error } = await supabase
    .from('workout_sessions')
    .insert(sessionData)
    .select()
    .single()

  return { data, error }
}

export interface RecentExercisePerformanceRecord {
  id: string
  exercise_type: string
  rep_count: number
  good_form_reps: number
  bad_form_reps: number
  duration_seconds: number
  created_at: string
}

/**
 * Retrieves the most recent workout session for each exercise type for the user.
 * Fetches the latest sessions and deduplicates by exercise_type.
 */
export async function getRecentExercisePerformance(
  userId: string,
  limit: number = 10
): Promise<{ data: RecentExercisePerformanceRecord[]; error: unknown }> {
  try {
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('id, exercise_type, rep_count, good_form_reps, bad_form_reps, duration_seconds, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error || !data) {
      return { data: [], error }
    }

    // Keep the single most recent session for each exercise_type
    const seen = new Set<string>()
    const latestPerExercise: RecentExercisePerformanceRecord[] = []

    for (const session of data) {
      const type = session.exercise_type
      if (type && !seen.has(type)) {
        seen.add(type)
        latestPerExercise.push(session as RecentExercisePerformanceRecord)
      }
    }

    return { data: latestPerExercise, error: null }
  } catch (err) {
    return { data: [], error: err }
  }
}

export interface ActivityScoreData {
  hasHistory: boolean
  totalSessions: number
  workoutsLast7Days: number
  consistency: number
  form: number
  completion: number
  progression: number
  score: number
}

/**
 * Retrieves workout session history and latest adaptations to compute the FitNova Activity Score.
 * 
 * Formula:
 * 30% consistency
 * 30% form
 * 20% workout completion
 * 20% progression
 *
 * All inputs and the final score are clamped to 0–100 and rounded to the nearest integer.
 * For new users with no workouts, hasHistory is false and no fabricated score is returned.
 */
export async function getActivityScore(userId: string): Promise<{ data: ActivityScoreData; error: unknown }> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // 1. Fetch recent sessions (last 30 sessions for form/completion, plus timestamps)
    const { data: sessions, error: sessionsError } = await supabase
      .from('workout_sessions')
      .select('id, exercise_type, rep_count, good_form_reps, bad_form_reps, duration_seconds, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)

    // 2. Fetch latest workout plan to inspect recent adaptations
    const { data: latestPlanRecord, error: planError } = await supabase
      .from('workout_plans')
      .select('plan_json')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (sessionsError) {
      console.warn('Error fetching workout sessions for activity score:', sessionsError)
    }

    if (!sessions || sessions.length === 0) {
      return {
        data: {
          hasHistory: false,
          totalSessions: 0,
          workoutsLast7Days: 0,
          consistency: 0,
          form: 0,
          completion: 0,
          progression: 0,
          score: 0,
        },
        error: sessionsError || planError || null,
      }
    }

    // A. Consistency: count sessions in the last 7 days
    const workoutsLast7Days = sessions.filter((s) => s.created_at >= sevenDaysAgo).length
    let consistency = 0
    if (workoutsLast7Days >= 4) consistency = 100
    else if (workoutsLast7Days === 3) consistency = 75
    else if (workoutsLast7Days === 2) consistency = 50
    else if (workoutsLast7Days === 1) consistency = 25
    else consistency = 0

    // B. Form Quality: average form accuracy across usable sessions
    let formSum = 0
    let usableFormCount = 0
    for (const s of sessions) {
      const good = Math.max(0, s.good_form_reps || 0)
      const bad = Math.max(0, s.bad_form_reps || 0)
      const totalTracked = good + bad
      if (totalTracked > 0) {
        formSum += (good / totalTracked) * 100
        usableFormCount++
      }
    }
    const form = usableFormCount > 0 ? Math.round(formSum / usableFormCount) : 0

    // C. Workout Completion: completed reps vs target reps (or baseline)
    let completionSum = 0
    let usableCompletionCount = 0
    for (const s of sessions) {
      const completed = Math.max(0, s.rep_count || 0)
      if (completed === 0) {
        completionSum += 0
        usableCompletionCount++
        continue
      }
      // Standard recommended baseline for a finished set is 8 reps
      const baseline = 8
      const rate = Math.min(1.0, completed / baseline) * 100
      completionSum += rate
      usableCompletionCount++
    }
    const completion = usableCompletionCount > 0 ? Math.round(completionSum / usableCompletionCount) : 0

    // D. Progression: average from latest plan adaptations (increase=100, maintain=70, decrease=40)
    let progression = 0
    const adaptations = (latestPlanRecord?.plan_json as any)?.adaptations
    if (Array.isArray(adaptations) && adaptations.length > 0) {
      let progressionPoints = 0
      for (const adapt of adaptations) {
        if (adapt.direction === 'increase') progressionPoints += 100
        else if (adapt.direction === 'maintain') progressionPoints += 70
        else if (adapt.direction === 'decrease') progressionPoints += 40
        else progressionPoints += 70
      }
      progression = Math.round(progressionPoints / adaptations.length)
    } else if (sessions.length > 0) {
      // If user has workout sessions but no adaptations generated yet, use baseline 70 (consistent baseline)
      progression = 70
    }

    // FitNova Activity Score Formula:
    // consistency * 0.30 + form * 0.30 + completion * 0.20 + progression * 0.20
    const rawScore =
      consistency * 0.30 +
      form * 0.30 +
      completion * 0.20 +
      progression * 0.20

    const clampedScore = Math.max(0, Math.min(100, Math.round(rawScore)))

    return {
      data: {
        hasHistory: true,
        totalSessions: sessions.length,
        workoutsLast7Days,
        consistency: Math.max(0, Math.min(100, consistency)),
        form: Math.max(0, Math.min(100, form)),
        completion: Math.max(0, Math.min(100, completion)),
        progression: Math.max(0, Math.min(100, progression)),
        score: clampedScore,
      },
      error: null,
    }
  } catch (err) {
    return {
      data: {
        hasHistory: false,
        totalSessions: 0,
        workoutsLast7Days: 0,
        consistency: 0,
        form: 0,
        completion: 0,
        progression: 0,
        score: 0,
      },
      error: err,
    }
  }
}

export interface ProgressChartPoint {
  date: string
  reps: number
  avgForm: number
}

export interface ProgressDashboardData {
  hasHistory: boolean
  totalWorkouts: number
  totalReps: number
  currentStreak: number
  avgForm: number | null
  completionRate: number | null
  workoutsThisWeek: number
  weekDays: {
    dayName: string
    dateString: string
    hasWorkout: boolean
    sessionCount: number
    totalReps: number
  }[]
  chartData: ProgressChartPoint[]
  summary: string
  activityScore: ActivityScoreData
}

/**
 * Retrieves comprehensive real progress data for the Progress Dashboard.
 * Efficiently loads workout_sessions and latest plan, calculating all
 * metrics deterministically.
 */
export async function getDetailedProgressDashboardData(userId: string): Promise<{
  data: ProgressDashboardData
  error: unknown
}> {
  try {
    const [scoreResult, sessionsRes] = await Promise.all([
      getActivityScore(userId),
      supabase
        .from('workout_sessions')
        .select('id, exercise_type, rep_count, good_form_reps, bad_form_reps, duration_seconds, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(100),
    ])

    const sessions = sessionsRes.data || []
    const activityScore = scoreResult.data

    if (!sessions || sessions.length === 0) {
      return {
        data: {
          hasHistory: false,
          totalWorkouts: 0,
          totalReps: 0,
          currentStreak: 0,
          avgForm: null,
          completionRate: null,
          workoutsThisWeek: 0,
          weekDays: [],
          chartData: [],
          summary: 'Complete your first workout to start tracking progress.',
          activityScore,
        },
        error: sessionsRes.error || null,
      }
    }

    // Progress calculations using statically imported functions
    const totalWorkouts = sessions.length
    const totalReps = sessions.reduce((acc, s) => acc + (s.rep_count || 0), 0)

    // Current Streak (consecutive calendar days)
    const currentStreak = calculateCurrentStreak(sessions.map((s) => s.created_at))

    // Average Form Quality
    let formSum = 0
    let usableFormCount = 0
    for (const s of sessions) {
      const good = Math.max(0, s.good_form_reps || 0)
      const bad = Math.max(0, s.bad_form_reps || 0)
      const totalTracked = good + bad
      if (totalTracked > 0) {
        formSum += (good / totalTracked) * 100
        usableFormCount++
      }
    }
    const avgForm = usableFormCount > 0 ? Math.round(formSum / usableFormCount) : null

    // Completion Rate
    let completionSum = 0
    for (const s of sessions) {
      const completed = Math.max(0, s.rep_count || 0)
      const baseline = 8
      const rate = Math.min(1.0, completed / baseline) * 100
      completionSum += rate
    }
    const completionRate = Math.round(completionSum / sessions.length)

    // 7-day activity & weekly count
    const { weekDays, workoutsThisWeek } = getThisWeekActivity(sessions)

    // Chart Data: group reps and form by local date (YYYY-MM-DD)
    const chartMap = new Map<string, { totalReps: number; formSum: number; formCount: number }>()
    for (const s of sessions) {
      if (!s.created_at) continue
      const d = new Date(s.created_at)
      if (isNaN(d.getTime())) continue
      const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

      const entry = chartMap.get(ymd) || { totalReps: 0, formSum: 0, formCount: 0 }
      entry.totalReps += s.rep_count || 0

      const good = Math.max(0, s.good_form_reps || 0)
      const bad = Math.max(0, s.bad_form_reps || 0)
      if (good + bad > 0) {
        entry.formSum += (good / (good + bad)) * 100
        entry.formCount++
      }
      chartMap.set(ymd, entry)
    }

    const chartData: ProgressChartPoint[] = Array.from(chartMap.entries()).map(([date, val]) => ({
      date: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      reps: val.totalReps,
      avgForm: val.formCount > 0 ? Math.round(val.formSum / val.formCount) : 0,
    }))

    const summary = getDeterministicProgressSummary({
      totalWorkouts,
      workoutsThisWeek,
      avgForm: avgForm || 0,
      currentStreak,
    })

    return {
      data: {
        hasHistory: true,
        totalWorkouts,
        totalReps,
        currentStreak,
        avgForm,
        completionRate,
        workoutsThisWeek,
        weekDays,
        chartData,
        summary,
        activityScore,
      },
      error: null,
    }
  } catch (err) {
    return {
      data: {
        hasHistory: false,
        totalWorkouts: 0,
        totalReps: 0,
        currentStreak: 0,
        avgForm: null,
        completionRate: null,
        workoutsThisWeek: 0,
        weekDays: [],
        chartData: [],
        summary: 'Complete your first workout to start tracking progress.',
        activityScore: {
          hasHistory: false,
          totalSessions: 0,
          workoutsLast7Days: 0,
          consistency: 0,
          form: 0,
          completion: 0,
          progression: 0,
          score: 0,
        },
      },
      error: err,
    }
  }
}
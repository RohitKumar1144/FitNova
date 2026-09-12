export interface ActivityScoreInputs {
  consistency: number
  form: number
  completion: number
  progression: number
}

export interface ActivityScoreResult {
  score: number
  consistency: number
  form: number
  completion: number
  progression: number
}

/**
 * Clamps a number between min and max and handles NaN/undefined.
 */
export function clamp(val: number | undefined | null, min: number = 0, max: number = 100): number {
  if (val === undefined || val === null || isNaN(val)) return min
  return Math.max(min, Math.min(max, val))
}

/**
 * Calculates the FitNova Activity Score.
 *
 * Formula:
 * 30% consistency
 * 30% form
 * 20% workout completion
 * 20% progression
 *
 * activityScore =
 *   consistency * 0.30 +
 *   form * 0.30 +
 *   completion * 0.20 +
 *   progression * 0.20
 *
 * All inputs are normalized/clamped to 0–100.
 * The final score is clamped to 0–100 and rounded to the nearest integer.
 */
export function calculateActivityScore(inputs: ActivityScoreInputs): ActivityScoreResult {
  const consistency = clamp(inputs.consistency, 0, 100)
  const form = clamp(inputs.form, 0, 100)
  const completion = clamp(inputs.completion, 0, 100)
  const progression = clamp(inputs.progression, 0, 100)

  const rawScore =
    consistency * 0.30 +
    form * 0.30 +
    completion * 0.20 +
    progression * 0.20

  const score = clamp(Math.round(rawScore), 0, 100)

  return {
    score,
    consistency: Math.round(consistency),
    form: Math.round(form),
    completion: Math.round(completion),
    progression: Math.round(progression),
  }
}

/**
 * Calculates the consistency score based on workouts completed in the last 7 days.
 * 0 workouts -> 0
 * 1 workout  -> 25
 * 2 workouts -> 50
 * 3 workouts -> 75
 * 4+ workouts -> 100
 */
export function calculateConsistencyFromSessionsCount(workoutsInLast7Days: number): number {
  const count = Math.max(0, workoutsInLast7Days || 0)
  if (count === 0) return 0
  if (count === 1) return 25
  if (count === 2) return 50
  if (count === 3) return 75
  return 100
}

/**
 * Calculates average form quality from workout session records.
 * For each session: formAccuracy = good_form_reps / (good_form_reps + bad_form_reps).
 * Returns 0 if there are no sessions with usable form data.
 */
export function calculateFormScoreFromSessions(
  sessions: { good_form_reps?: number; bad_form_reps?: number }[]
): number {
  if (!sessions || sessions.length === 0) return 0

  let totalAccuracySum = 0
  let usableSessionsCount = 0

  for (const s of sessions) {
    const good = Math.max(0, s.good_form_reps || 0)
    const bad = Math.max(0, s.bad_form_reps || 0)
    const totalTracked = good + bad

    if (totalTracked > 0) {
      const accuracy = (good / totalTracked) * 100
      totalAccuracySum += accuracy
      usableSessionsCount++
    }
  }

  if (usableSessionsCount === 0) return 0
  return clamp(Math.round(totalAccuracySum / usableSessionsCount), 0, 100)
}

/**
 * Calculates workout completion rate from session records.
 * For each session: completed / target (if target exists).
 * When target reps are not recorded per session, completion is evaluated
 * based on completed repetitions relative to baseline/active performance,
 * or 0 when no usable data is present.
 */
export function calculateCompletionScoreFromSessions(
  sessions: { rep_count?: number; target_reps?: number }[]
): number {
  if (!sessions || sessions.length === 0) return 0

  let totalCompletionSum = 0
  let usableSessionsCount = 0

  for (const s of sessions) {
    const completed = Math.max(0, s.rep_count || 0)
    if (completed === 0) {
      totalCompletionSum += 0
      usableSessionsCount++
      continue
    }

    if (s.target_reps && s.target_reps > 0) {
      const rate = Math.min(1.0, completed / s.target_reps) * 100
      totalCompletionSum += rate
      usableSessionsCount++
    } else {
      // Safe fallback: a completed session with >= 8 reps represents full exercise completion (100%),
      // with lower reps scaled proportionally against an 8-rep baseline.
      const baseline = 8
      const rate = Math.min(1.0, completed / baseline) * 100
      totalCompletionSum += rate
      usableSessionsCount++
    }
  }

  if (usableSessionsCount === 0) return 0
  return clamp(Math.round(totalCompletionSum / usableSessionsCount), 0, 100)
}

/**
 * Calculates progression score from adaptive fitness data:
 * - increase -> 100
 * - maintain -> 70
 * - decrease -> 40
 * Multiple adaptations are averaged.
 * No previous workouts / adaptations -> 0.
 */
export function calculateProgressionScoreFromAdaptations(
  adaptations?: { direction: 'increase' | 'maintain' | 'decrease' | string }[]
): number {
  if (!adaptations || adaptations.length === 0) return 0

  let totalPoints = 0
  for (const adapt of adaptations) {
    if (adapt.direction === 'increase') {
      totalPoints += 100
    } else if (adapt.direction === 'maintain') {
      totalPoints += 70
    } else if (adapt.direction === 'decrease') {
      totalPoints += 40
    } else {
      totalPoints += 70
    }
  }

  return clamp(Math.round(totalPoints / adaptations.length), 0, 100)
}

export interface DayActivity {
  dayName: string // 'Mon', 'Tue', etc.
  dateString: string // 'YYYY-MM-DD'
  hasWorkout: boolean
  sessionCount: number
  totalReps: number
}

/**
 * Calculates current streak in consecutive calendar days.
 * Consecutive calendar days ending today (or yesterday).
 * Multiple workouts on the same day count as 1 streak day.
 */
export function calculateCurrentStreak(sessionDates: (string | Date)[]): number {
  if (!sessionDates || sessionDates.length === 0) return 0

  // 1. Normalize dates to local YYYY-MM-DD
  const uniqueDates = new Set<string>()
  for (const d of sessionDates) {
    const dateObj = typeof d === 'string' ? new Date(d) : d
    if (isNaN(dateObj.getTime())) continue
    const y = dateObj.getFullYear()
    const m = String(dateObj.getMonth() + 1).padStart(2, '0')
    const day = String(dateObj.getDate()).padStart(2, '0')
    uniqueDates.add(`${y}-${m}-${day}`)
  }

  if (uniqueDates.size === 0) return 0

  const toYMD = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const now = new Date()
  const todayStr = toYMD(now)

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = toYMD(yesterday)

  // A streak is active if user worked out today OR yesterday
  let anchorDate: Date
  if (uniqueDates.has(todayStr)) {
    anchorDate = now
  } else if (uniqueDates.has(yesterdayStr)) {
    anchorDate = yesterday
  } else {
    return 0 // Streak broken
  }

  let streak = 0
  const checkDate = new Date(anchorDate)

  while (true) {
    const dateStr = toYMD(checkDate)
    if (uniqueDates.has(dateStr)) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  return streak
}

/**
 * Generates the 7-day view for "THIS WEEK" (Monday through Sunday of current week).
 */
export function getThisWeekActivity(
  sessions: { created_at: string; rep_count?: number }[]
): { weekDays: DayActivity[]; workoutsThisWeek: number } {
  const now = new Date()
  const currentDayOfWeek = now.getDay() // 0 = Sun, 1 = Mon, ..., 6 = Sat
  // Monday as first day: diff = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek
  const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek

  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  monday.setHours(0, 0, 0, 0)

  const toYMD = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const weekDays: DayActivity[] = []

  // Pre-aggregate sessions by YMD
  const sessionsByDate = new Map<string, { count: number; totalReps: number }>()
  if (sessions && sessions.length > 0) {
    for (const s of sessions) {
      if (!s.created_at) continue
      const d = new Date(s.created_at)
      if (isNaN(d.getTime())) continue
      const ymd = toYMD(d)
      const existing = sessionsByDate.get(ymd) || { count: 0, totalReps: 0 }
      existing.count += 1
      existing.totalReps += s.rep_count || 0
      sessionsByDate.set(ymd, existing)
    }
  }

  let workoutsThisWeek = 0

  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(monday)
    dayDate.setDate(monday.getDate() + i)
    const ymd = toYMD(dayDate)
    const data = sessionsByDate.get(ymd)
    const hasWorkout = !!(data && data.count > 0)
    const count = data ? data.count : 0
    workoutsThisWeek += count

    weekDays.push({
      dayName: dayNames[i],
      dateString: ymd,
      hasWorkout,
      sessionCount: count,
      totalReps: data ? data.totalReps : 0,
    })
  }

  return { weekDays, workoutsThisWeek }
}

/**
 * Returns a deterministic, encouraging progress summary based on real workout metrics.
 */
export function getDeterministicProgressSummary(stats: {
  totalWorkouts: number
  workoutsThisWeek: number
  avgForm: number
  currentStreak: number
}): string {
  if (stats.totalWorkouts === 0) {
    return 'Complete your first workout to start tracking progress.'
  }
  if (stats.totalWorkouts <= 2) {
    return "You're getting started. Keep building consistency."
  }
  if (stats.workoutsThisWeek >= 3) {
    return 'Great consistency this week — your momentum is building!'
  }
  if (stats.avgForm >= 90) {
    return 'Your recent form quality is excellent — biomechanics are sharp.'
  }
  if (stats.avgForm > 0 && stats.avgForm < 75) {
    return 'Focus on technique and controlled movement over speed.'
  }
  if (stats.currentStreak >= 3) {
    return `Impressive dedication — you're on a ${stats.currentStreak}-day active streak!`
  }
  return 'Steady progress — keep showing up and refining your movement technique.'
}

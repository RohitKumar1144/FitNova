import { supabase } from './client'
import type { Profile } from '../../types/profile'
import type { WorkoutPlanRecord } from '../../types/workout'

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
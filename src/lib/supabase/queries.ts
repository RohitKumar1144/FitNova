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
    // 1. Fetch workout_sessions count and total reps
    const { data: sessions, error: sessionsError } = await supabase
      .from('workout_sessions')
      .select('id, total_reps, form_score, completed_at, created_at')
      .eq('user_id', userId)

    // 2. Fetch progress_snapshots
    const { data: snapshots, error: snapshotsError } = await supabase
      .from('progress_snapshots')
      .select('current_streak, total_reps, avg_form_score')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)

    let currentStreak = 0
    let totalReps = 0
    let totalSessions = 0
    let avgFormScore = 0

    if (snapshots && snapshots.length > 0) {
      currentStreak = snapshots[0].current_streak || 0
      totalReps = snapshots[0].total_reps || 0
      avgFormScore = Math.round(snapshots[0].avg_form_score || 0)
    }

    if (sessions && sessions.length > 0) {
      totalSessions = sessions.length
      if (totalReps === 0) {
        totalReps = sessions.reduce((acc, s) => acc + (s.total_reps || 0), 0)
      }
      if (avgFormScore === 0) {
        const scores = sessions.map(s => s.form_score).filter(Boolean)
        if (scores.length > 0) {
          avgFormScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        }
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
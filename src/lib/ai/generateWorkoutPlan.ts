import { supabase } from '../supabase/client'
import { getRecentExercisePerformance } from '../supabase/queries'
import { calculateBatchAdaptations } from '../exercises/adaptation'
import type { WorkoutPlan, WorkoutPlanRecord } from '../../types/workout'

export interface GenerateWorkoutResponse {
  data?: WorkoutPlanRecord
  plan?: WorkoutPlan
  error?: string
}

/**
 * Invokes the Supabase Edge Function `generate-workout`.
 * Calculates deterministic adaptations based on recent exercise performance history
 * and passes them to the function to strictly constrain Gemini targets and ensure
 * persistence into `workout_plans`.
 */
export async function generateWorkoutPlan(): Promise<GenerateWorkoutResponse> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return { error: 'You must be logged in to generate a workout plan.' }
    }

    // Deterministically calculate adaptations from recent performance
    let adaptationsPayload: any[] | undefined = undefined
    try {
      const { data: recentPerformances } = await getRecentExercisePerformance(session.user.id, 10)
      if (recentPerformances && recentPerformances.length > 0) {
        const perfData = recentPerformances.map((p) => ({
          exerciseType: p.exercise_type,
          completedReps: p.rep_count || 0,
          goodFormReps: p.good_form_reps || 0,
          badFormReps: p.bad_form_reps || 0,
          durationSeconds: p.duration_seconds,
        }))
        const calculated = calculateBatchAdaptations(perfData)
        adaptationsPayload = calculated.map((a) => ({
          exercise_type: a.exerciseType,
          previous_reps: a.previousReps,
          next_reps: a.nextReps,
          direction: a.direction,
          form_accuracy: a.formAccuracy,
          completion_rate: a.completionRate,
          reason: a.reason,
        }))
      }
    } catch (adaptErr) {
      console.warn('Failed to compute client-side adaptations, falling back to server calculation:', adaptErr)
    }

    const { data, error } = await supabase.functions.invoke('generate-workout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: adaptationsPayload ? { adaptations: adaptationsPayload } : undefined,
    })

    if (error) {
      // In Supabase client, FunctionsHttpError wraps the Response object in error.context
      let message = 'Failed to generate workout plan. Please try again.'
      if (typeof error === 'object' && error !== null) {
        if ('context' in error && error.context) {
          try {
            const body = await (error.context as Response).json()
            if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
              message = body.error
            }
          } catch {
            try {
              const text = await (error.context as Response).text()
              if (text && text.length < 200) message = text
            } catch {
              // ignore
            }
          }
        } else if ('message' in error && typeof (error as { message: string }).message === 'string') {
          message = (error as { message: string }).message
        }
      }
      return { error: message }
    }

    if (data?.error) {
      return { error: data.error }
    }

    const plan: WorkoutPlan = data.plan || data.data?.plan_json
    return {
      data: data.data,
      plan,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected network error occurred.'
    return { error: message }
  }
}
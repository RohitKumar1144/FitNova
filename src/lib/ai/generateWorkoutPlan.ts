import { supabase } from '../supabase/client'
import type { WorkoutPlan, WorkoutPlanRecord } from '../../types/workout'

export interface GenerateWorkoutResponse {
  data?: WorkoutPlanRecord
  plan?: WorkoutPlan
  error?: string
}

/**
 * Invokes the Supabase Edge Function `generate-workout`.
 * The function uses the authenticated user's JWT to load their profile,
 * calls the Gemini API on the server side, validates the response,
 * inserts the record into `workout_plans`, and returns the typed plan.
 */
export async function generateWorkoutPlan(): Promise<GenerateWorkoutResponse> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return { error: 'You must be logged in to generate a workout plan.' }
    }

    const { data, error } = await supabase.functions.invoke('generate-workout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    })

    if (error) {
      // In Supabase client, function invocation errors may wrap the response body
      let message = 'Failed to generate workout plan. Please try again.'
      if (typeof error === 'object' && error !== null) {
        if ('message' in error && typeof (error as { message: string }).message === 'string') {
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
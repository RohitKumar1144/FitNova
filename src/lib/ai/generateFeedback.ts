import { supabase } from '../supabase/client'
import type { AIPostWorkoutFeedback, WorkoutSessionFeedbackPayload, WorkoutSessionRecord } from '../../types/feedback'

export interface GenerateFeedbackResult {
  data?: WorkoutSessionRecord
  feedback?: AIPostWorkoutFeedback
  error?: string
}

/**
 * Invokes the Supabase Edge Function generate-feedback.
 * Interprets the completed workout session metrics using server-side Gemini 3.8 Flash,
 * saves the result into workout_sessions.ai_feedback, and returns the structured feedback.
 */
export async function generateWorkoutFeedback(
  payload: WorkoutSessionFeedbackPayload & { session_id?: string }
): Promise<GenerateFeedbackResult> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return { error: 'You must be logged in to generate AI feedback.' }
    }

    const { data, error } = await supabase.functions.invoke('generate-feedback', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: payload,
    })

    if (error) {
      let message = 'AI feedback service is temporarily busy. Please try again in a moment.'
      if (typeof error === 'object' && error !== null) {
        if ('context' in error && error.context) {
          try {
            const body = await (error.context as Response).json()
            if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
              message = body.error
            }
          } catch {
            // keep friendly fallback
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

    return {
      data: data.data,
      feedback: data.feedback,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred while requesting AI feedback.'
    return { error: message }
  }
}

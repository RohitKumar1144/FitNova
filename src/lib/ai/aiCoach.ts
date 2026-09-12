import { supabase } from '../supabase/client'

export interface ChatMessage {
  role: 'user' | 'model'
  content: string
}

export interface SendAICoachMessageResult {
  response?: string
  suggestsWorkout?: boolean
  error?: string
}

/**
 * Invokes the Supabase Edge Function i-coach.
 * Uses authenticated user JWT to retrieve profile context server-side,
 * sends conversation history + prompt to Gemini 3.8 Flash, and returns response.
 */
export async function sendAICoachMessage(
  message: string,
  history: ChatMessage[] = []
): Promise<SendAICoachMessageResult> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      return { error: 'You must be logged in to chat with the AI Coach.' }
    }

    const { data, error } = await supabase.functions.invoke('ai-coach', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {
        message,
        history,
      },
    })

    if (error) {
      let friendlyMessage = 'The AI Coach is temporarily busy. Please try asking again in a moment.'
      if (typeof error === 'object' && error !== null) {
        if ('context' in error && error.context) {
          try {
            const body = await (error.context as Response).json()
            if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
              friendlyMessage = body.error
            }
          } catch {
            // keep default friendly error
          }
        } else if ('message' in error && typeof (error as { message: string }).message === 'string') {
          friendlyMessage = (error as { message: string }).message
        }
      }
      return { error: friendlyMessage }
    }

    if (data?.error) {
      return { error: data.error }
    }

    return {
      response: data.response,
      suggestsWorkout: Boolean(data.suggestsWorkout),
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred while connecting to the AI Coach.'
    return { error: message }
  }
}

export interface AIPostWorkoutFeedback {
  summary: string
  what_went_well: string[]
  improvements: string[]
  next_workout_recommendation: string
  motivation: string
}

export interface WorkoutSessionFeedbackPayload {
  exercise_type: 'squat' | 'pushup' | 'bicep_curl'
  rep_count: number
  good_form_reps: number
  bad_form_reps: number
  duration_seconds: number
  form_accuracy: number
  workout_goal?: string
  fitness_level?: string
}

export interface WorkoutSessionRecord {
  id: string
  user_id: string
  exercise_type: string
  rep_count: number
  good_form_reps: number
  bad_form_reps: number
  duration_seconds: number
  ai_feedback: AIPostWorkoutFeedback | null
  created_at: string
}

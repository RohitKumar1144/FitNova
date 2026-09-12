export type TrackedExerciseType = 'squat' | 'pushup' | 'bicep_curl'

export interface WarmupItem {
  name: string
  duration_seconds: number
}

export interface ExerciseItem {
  name: string
  exercise_type: TrackedExerciseType
  sets: number
  reps: number
  rest_seconds: number
  instructions: string
  reason?: string
}

export interface CooldownItem {
  name: string
  duration_seconds: number
}

export interface WorkoutPlan {
  title: string
  description: string
  duration_minutes: number
  difficulty: string
  goal: string
  warmup: WarmupItem[]
  exercises: ExerciseItem[]
  cooldown: CooldownItem[]
  coach_note?: string
  adaptations?: {
    exercise_type: TrackedExerciseType | string
    previous_reps: number
    next_reps: number
    direction: 'increase' | 'maintain' | 'decrease'
    form_accuracy?: number
    completion_rate?: number
    reason: string
  }[]
}

export interface WorkoutPlanRecord {
  id: string
  user_id: string
  plan_json: WorkoutPlan
  created_at?: string
}
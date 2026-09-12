export type FitnessLevel = 'beginner' | 'intermediate' | 'advanced'

export type FitnessGoal = 'build_muscle' | 'lose_weight' | 'improve_fitness' | 'stay_active'

export type EquipmentOption = 'no_equipment' | 'dumbbells' | 'resistance_bands' | 'yoga_mat' | 'other'

export interface Profile {
  id: string
  full_name: string
  age: number
  height_cm: number
  weight_kg: number
  fitness_level: FitnessLevel | string
  goal: FitnessGoal | string
  available_time_minutes: number
  equipment: string[] | string
  created_at?: string
}

export interface OnboardingFormData {
  fullName: string
  age: number | ''
  heightCm: number | ''
  weightKg: number | ''
  fitnessLevel: FitnessLevel | ''
  goal: FitnessGoal | ''
  availableTimeMinutes: number | ''
  equipment: string[]
}
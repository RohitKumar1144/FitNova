import type { TrackedExerciseType } from '../../types/workout'

export type AdaptationDirection = 'increase' | 'maintain' | 'decrease'

export interface ExercisePerformanceData {
  exerciseType: TrackedExerciseType | string
  targetReps?: number
  completedReps: number
  goodFormReps: number
  badFormReps: number
  durationSeconds?: number
}

export interface ExerciseAdaptation {
  exerciseType: TrackedExerciseType | string
  direction: AdaptationDirection
  previousReps: number
  nextReps: number
  formAccuracy: number
  completionRate: number
  reason: string
}

export interface CalculateAdaptationOptions {
  minReps?: number
  maxReps?: number
  defaultBaselineReps?: number
}

export function calculateExerciseAdaptation(
  performance: ExercisePerformanceData,
  options: CalculateAdaptationOptions = {}
): ExerciseAdaptation {
  const minReps = options.minReps ?? 5
  const maxReps = options.maxReps ?? 30
  const defaultBaseline = options.defaultBaselineReps ?? 10

  const exerciseType = performance.exerciseType
  const completedReps = Math.max(0, performance.completedReps || 0)
  const goodFormReps = Math.max(0, performance.goodFormReps || 0)
  const badFormReps = Math.max(0, performance.badFormReps || 0)
  const trackedReps = goodFormReps + badFormReps

  const previousReps = performance.targetReps && performance.targetReps > 0
    ? performance.targetReps
    : (completedReps > 0 ? completedReps : defaultBaseline)

  const formAccuracy = trackedReps > 0
    ? Math.round((goodFormReps / trackedReps) * 100)
    : (completedReps > 0 ? 80 : 0)

  const completionRate = previousReps > 0 ? completedReps / previousReps : 1.0

  // 1. Zero reps / aborted session
  if (completedReps === 0) {
    return {
      exerciseType,
      direction: 'maintain',
      previousReps,
      nextReps: Math.max(minReps, previousReps),
      formAccuracy: 0,
      completionRate: 0,
      reason: 'No completed reps recorded -- maintaining target to establish baseline.',
    }
  }

  // 2. Substantial under-completion: completed < 80% of target
  if (completedReps < 0.8 * previousReps) {
    if (formAccuracy < 75) {
      const stepDown = Math.max(1, Math.round(previousReps * 0.15))
      const nextReps = Math.max(minReps, previousReps - stepDown)
      return {
        exerciseType,
        direction: 'decrease',
        previousReps,
        nextReps,
        formAccuracy,
        completionRate: Math.round(completionRate * 100),
        reason: 'Form needs improvement -- reducing reps and prioritizing clean technique.',
      }
    }

    const stepDown = Math.max(1, Math.round(previousReps * 0.15))
    const nextReps = Math.max(minReps, previousReps - stepDown)
    return {
      exerciseType,
      direction: 'decrease',
      previousReps,
      nextReps,
      formAccuracy,
      completionRate: Math.round(completionRate * 100),
      reason: 'Good form, but completion was below target -- keeping the workload steady.',
    }
  }

  // 3. Form Accuracy Rules (with satisfactory completion >= 80%)
  if (formAccuracy >= 90) {
    const rawStep = Math.round(previousReps * 0.15)
    const stepUp = Math.min(
      Math.max(1, rawStep),
      Math.max(1, Math.floor(previousReps * 0.20))
    )
    const nextReps = Math.min(maxReps, previousReps + stepUp)
    return {
      exerciseType,
      direction: nextReps > previousReps ? 'increase' : 'maintain',
      previousReps,
      nextReps,
      formAccuracy,
      completionRate: Math.round(completionRate * 100),
      reason: 'Excellent form and full completion -- increasing reps slightly.',
    }
  }

  if (formAccuracy >= 75) {
    return {
      exerciseType,
      direction: 'maintain',
      previousReps,
      nextReps: previousReps,
      formAccuracy,
      completionRate: Math.round(completionRate * 100),
      reason: 'Good form and completion -- building consistency with current workload.',
    }
  }

  // Poor form (< 75%): decrease by ~10-20%
  const stepDown = Math.max(1, Math.round(previousReps * 0.15))
  const nextReps = Math.max(minReps, previousReps - stepDown)
  return {
    exerciseType,
    direction: 'decrease',
    previousReps,
    nextReps,
    formAccuracy,
    completionRate: Math.round(completionRate * 100),
    reason: 'Form needs improvement -- reducing reps and prioritizing clean technique.',
  }
}

export function calculateBatchAdaptations(
  recentPerformances: ExercisePerformanceData[],
  options?: CalculateAdaptationOptions
): ExerciseAdaptation[] {
  const latestByExercise = new Map<string, ExercisePerformanceData>()
  for (const perf of recentPerformances) {
    const key = String(perf.exerciseType)
    if (!latestByExercise.has(key)) {
      latestByExercise.set(key, perf)
    }
  }
  const adaptations: ExerciseAdaptation[] = []
  for (const perf of latestByExercise.values()) {
    adaptations.push(calculateExerciseAdaptation(perf, options))
  }
  return adaptations
}

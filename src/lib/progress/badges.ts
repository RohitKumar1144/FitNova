export interface Badge {
  id: string
  title: string
  description: string
  requirement: string
  icon: 'first_workout' | 'streak_3' | 'reps_100' | 'form_master'
  emoji: string
  unlocked: boolean
  progressText?: string
}

export interface BadgeCalculationInputs {
  totalWorkouts: number
  currentStreak: number
  totalReps: number
  avgForm: number | null
}

/**
 * Deterministically evaluates the unlock state for the four FitNova fitness badges:
 * 1. First Workout: total completed workout sessions >= 1
 * 2. 3 Day Streak: current workout streak >= 3 days
 * 3. 100 Reps: total rep_count across completed sessions >= 100
 * 4. Form Master: average usable form accuracy >= 90%
 */
export function calculateBadges(inputs: BadgeCalculationInputs): Badge[] {
  const { totalWorkouts, currentStreak, totalReps, avgForm } = inputs

  const firstWorkoutUnlocked = (totalWorkouts || 0) >= 1
  const streak3Unlocked = (currentStreak || 0) >= 3
  const reps100Unlocked = (totalReps || 0) >= 100
  const formMasterUnlocked = avgForm !== null && avgForm !== undefined && avgForm >= 90

  return [
    {
      id: 'first_workout',
      title: 'First Workout',
      description: 'Completed your first camera-verified workout session.',
      requirement: 'Complete 1 workout session',
      icon: 'first_workout',
      emoji: '🏆',
      unlocked: firstWorkoutUnlocked,
      progressText: firstWorkoutUnlocked ? 'Completed' : `${Math.min(totalWorkouts || 0, 1)} / 1 workout`,
    },
    {
      id: 'streak_3',
      title: '3 Day Streak',
      description: 'Worked out 3 consecutive calendar days.',
      requirement: 'Reach a 3-day workout streak',
      icon: 'streak_3',
      emoji: '🔥',
      unlocked: streak3Unlocked,
      progressText: streak3Unlocked ? 'Completed' : `${Math.min(currentStreak || 0, 3)} / 3 days`,
    },
    {
      id: 'reps_100',
      title: '100 Reps',
      description: 'Completed 100+ total AI-tracked repetitions.',
      requirement: 'Complete 100 total repetitions',
      icon: 'reps_100',
      emoji: '💪',
      unlocked: reps100Unlocked,
      progressText: reps100Unlocked ? 'Completed' : `${Math.min(totalReps || 0, 100)} / 100 reps`,
    },
    {
      id: 'form_master',
      title: 'Form Master',
      description: 'Maintained 90%+ average bio-mechanical form accuracy.',
      requirement: 'Achieve 90%+ average form accuracy',
      icon: 'form_master',
      emoji: '⭐',
      unlocked: formMasterUnlocked,
      progressText: formMasterUnlocked
        ? `${avgForm}% Form`
        : avgForm !== null
        ? `${avgForm}% / 90% form`
        : '0% / 90% form',
    },
  ]
}

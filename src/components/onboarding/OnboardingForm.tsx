import React, { useState } from 'react'
import {
  User,
  Activity,
  Clock,
  Dumbbell,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Sparkles,
  Zap,
  Flame,
  Scale,
  Ruler,
} from 'lucide-react'
import type { FitnessLevel, FitnessGoal, OnboardingFormData } from '../../types/profile'

interface OnboardingFormProps {
  initialFullName?: string
  onSubmit: (data: OnboardingFormData) => Promise<void>
  loading: boolean
  error: string | null
}

const FITNESS_LEVELS: { id: FitnessLevel; title: string; desc: string; badge: string }[] = [
  {
    id: 'beginner',
    title: 'Beginner',
    desc: "I'm new to structured exercise.",
    badge: 'Foundation',
  },
  {
    id: 'intermediate',
    title: 'Intermediate',
    desc: 'I exercise regularly.',
    badge: 'Active',
  },
  {
    id: 'advanced',
    title: 'Advanced',
    desc: 'I train consistently and have strong experience.',
    badge: 'Athlete',
  },
]

const FITNESS_GOALS: { id: FitnessGoal; title: string; icon: React.ReactNode }[] = [
  { id: 'build_muscle', title: 'Build Muscle', icon: <Dumbbell className="w-5 h-5 text-emerald-400" /> },
  { id: 'lose_weight', title: 'Lose Weight', icon: <Flame className="w-5 h-5 text-amber-400" /> },
  { id: 'improve_fitness', title: 'Improve Fitness', icon: <Zap className="w-5 h-5 text-cyan-400" /> },
  { id: 'stay_active', title: 'Stay Active', icon: <Activity className="w-5 h-5 text-purple-400" /> },
]

const TIME_OPTIONS = [
  { minutes: 15, label: '15 minutes', note: 'Quick & focused session' },
  { minutes: 30, label: '30 minutes', note: 'Optimal balanced workout' },
  { minutes: 45, label: '45 minutes', note: 'Deep conditioning & strength' },
  { minutes: 60, label: '60 minutes', note: 'Comprehensive full-body routine' },
]

const EQUIPMENT_OPTIONS = [
  'No Equipment',
  'Dumbbells',
  'Resistance Bands',
  'Yoga Mat',
  'Other',
]

export default function OnboardingForm({
  initialFullName = '',
  onSubmit,
  loading,
  error: submitError,
}: OnboardingFormProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 7 // Steps 1 to 6, plus Step 7 Summary

  const [formData, setFormData] = useState<OnboardingFormData>({
    fullName: initialFullName,
    age: '',
    heightCm: '',
    weightKg: '',
    fitnessLevel: '',
    goal: '',
    availableTimeMinutes: '',
    equipment: [],
  })

  const [stepError, setStepError] = useState<string | null>(null)

  // Step validation
  const validateCurrentStep = (): boolean => {
    setStepError(null)

    if (currentStep === 1) {
      if (!formData.fullName.trim()) {
        setStepError('Please enter your full name.')
        return false
      }
      if (formData.age === '' || Number(formData.age) <= 0) {
        setStepError('Please enter a valid age.')
        return false
      }
      const ageNum = Number(formData.age)
      if (ageNum < 10 || ageNum > 100) {
        setStepError('Please enter a reasonable age between 10 and 100.')
        return false
      }
    }

    if (currentStep === 2) {
      if (formData.heightCm === '' || Number(formData.heightCm) <= 0) {
        setStepError('Please enter your height in cm.')
        return false
      }
      const heightNum = Number(formData.heightCm)
      if (heightNum < 80 || heightNum > 250) {
        setStepError('Please enter a realistic height between 80 cm and 250 cm.')
        return false
      }

      if (formData.weightKg === '' || Number(formData.weightKg) <= 0) {
        setStepError('Please enter your weight in kg.')
        return false
      }
      const weightNum = Number(formData.weightKg)
      if (weightNum < 25 || weightNum > 300) {
        setStepError('Please enter a realistic weight between 25 kg and 300 kg.')
        return false
      }
    }

    if (currentStep === 3) {
      if (!formData.fitnessLevel) {
        setStepError('Please select your current fitness level.')
        return false
      }
    }

    if (currentStep === 4) {
      if (!formData.goal) {
        setStepError('Please choose your primary fitness goal.')
        return false
      }
    }

    if (currentStep === 5) {
      if (!formData.availableTimeMinutes) {
        setStepError('Please select your typical workout duration.')
        return false
      }
    }

    if (currentStep === 6) {
      if (formData.equipment.length === 0) {
        setStepError('Please choose at least one equipment option (or "No Equipment").')
        return false
      }
    }

    return true
  }

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, totalSteps))
    }
  }

  const handleBack = () => {
    setStepError(null)
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const toggleEquipment = (eq: string) => {
    setFormData((prev) => {
      let updated = [...prev.equipment]
      if (eq === 'No Equipment') {
        // If selecting No Equipment, reset others or toggle
        if (updated.includes('No Equipment')) {
          updated = []
        } else {
          updated = ['No Equipment']
        }
      } else {
        // Remove 'No Equipment' if selecting actual gear
        updated = updated.filter((item) => item !== 'No Equipment')
        if (updated.includes(eq)) {
          updated = updated.filter((item) => item !== eq)
        } else {
          updated.push(eq)
        }
      }
      return { ...prev, equipment: updated }
    })
  }

  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    await onSubmit(formData)
  }

  return (
    <div className="w-full max-w-xl mx-auto bg-slate-900/80 border border-slate-800/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl shadow-emerald-950/20">
      {/* Progress Bar & Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2">
          <span>STEP {currentStep} OF {totalSteps}</span>
          <span className="text-emerald-400 font-mono">
            {Math.round((currentStep / totalSteps) * 100)}% COMPLETED
          </span>
        </div>
        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 ease-out"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Errors */}
      {(stepError || submitError) && (
        <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-2.5">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span className="leading-snug">{stepError || submitError}</span>
        </div>
      )}

      {/* STEP 1: Basic Information */}
      {currentStep === 1 && (
        <div className="space-y-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1 block">
              Step 1 â€¢ Profile Setup
            </span>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Let&apos;s get to know you
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Your name and age help personalize calorie formulas and pacing.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Rohit Kumar"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Age
              </label>
              <input
                type="number"
                min="10"
                max="100"
                value={formData.age}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    age: e.target.value === '' ? '' : parseInt(e.target.value, 10),
                  })
                }
                placeholder="e.g. 21"
                className="w-full px-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Body Information */}
      {currentStep === 2 && (
        <div className="space-y-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1 block">
              Step 2 â€¢ Physical Metrics
            </span>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Tell us about your body
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Used to calculate fitness volume, load estimations, and BMI baselines.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Height (cm)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Ruler className="w-4 h-4" />
                </div>
                <input
                  type="number"
                  min="80"
                  max="250"
                  value={formData.heightCm}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      heightCm: e.target.value === '' ? '' : parseFloat(e.target.value),
                    })
                  }
                  placeholder="e.g. 175"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Weight (kg)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Scale className="w-4 h-4" />
                </div>
                <input
                  type="number"
                  min="25"
                  max="300"
                  value={formData.weightKg}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      weightKg: e.target.value === '' ? '' : parseFloat(e.target.value),
                    })
                  }
                  placeholder="e.g. 68"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Fitness Level */}
      {currentStep === 3 && (
        <div className="space-y-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1 block">
              Step 3 â€¢ Experience
            </span>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              What&apos;s your fitness level?
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Select one that best describes your regular activity.
            </p>
          </div>

          <div className="space-y-3">
            {FITNESS_LEVELS.map((lvl) => {
              const selected = formData.fitnessLevel === lvl.id
              return (
                <div
                  key={lvl.id}
                  onClick={() => setFormData({ ...formData, fitnessLevel: lvl.id })}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    selected
                      ? 'bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-white text-base">{lvl.title}</span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        {lvl.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{lvl.desc}</p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      selected ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600'
                    }`}
                  >
                    {selected && <div className="w-2 h-2 rounded-full bg-slate-950" />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* STEP 4: Fitness Goal */}
      {currentStep === 4 && (
        <div className="space-y-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1 block">
              Step 4 â€¢ Target
            </span>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              What is your main goal?
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              FitSaathi will configure sets, reps, and exercise selection around this.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {FITNESS_GOALS.map((g) => {
              const selected = formData.goal === g.id
              return (
                <div
                  key={g.id}
                  onClick={() => setFormData({ ...formData, goal: g.id })}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    selected
                      ? 'bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      {g.icon}
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        selected ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600'
                      }`}
                    >
                      {selected && <div className="w-2 h-2 rounded-full bg-slate-950" />}
                    </div>
                  </div>
                  <span className="font-bold text-white text-base">{g.title}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* STEP 5: Availability */}
      {currentStep === 5 && (
        <div className="space-y-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1 block">
              Step 5 â€¢ Time Commitment
            </span>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              How much time do you have?
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Workouts will fit comfortably within your available time window.
            </p>
          </div>

          <div className="space-y-3">
            {TIME_OPTIONS.map((opt) => {
              const selected = formData.availableTimeMinutes === opt.minutes
              return (
                <div
                  key={opt.minutes}
                  onClick={() => setFormData({ ...formData, availableTimeMinutes: opt.minutes })}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    selected
                      ? 'bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300">
                      <Clock className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-base">{opt.label}</p>
                      <p className="text-xs text-slate-400">{opt.note}</p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      selected ? 'border-emerald-400 bg-emerald-500' : 'border-slate-600'
                    }`}
                  >
                    {selected && <div className="w-2 h-2 rounded-full bg-slate-950" />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* STEP 6: Equipment */}
      {currentStep === 6 && (
        <div className="space-y-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1 block">
              Step 6 â€¢ Gear &amp; Space
            </span>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              What equipment do you have?
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Select all that apply. FitSaathi will only prescribe exercises you can perform.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {EQUIPMENT_OPTIONS.map((item) => {
              const selected = formData.equipment.includes(item)
              return (
                <div
                  key={item}
                  onClick={() => toggleEquipment(item)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                    selected
                      ? 'bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <span className="font-medium text-white text-sm">{item}</span>
                  <div
                    className={`w-5 h-5 rounded-lg border flex items-center justify-center ${
                      selected ? 'border-emerald-400 bg-emerald-500' : 'border-slate-700'
                    }`}
                  >
                    {selected && <CheckCircle2 className="w-4 h-4 text-slate-950" />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* FINAL STEP 7: Summary Review */}
      {currentStep === 7 && (
        <div className="space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1 block">
              Final Step â€¢ Profile Verification
            </span>
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              Review Your Fitness Profile
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Confirm your details before your AI plan is formulated.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-3.5 text-sm">
            <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Full Name</span>
              <span className="text-white font-semibold">{formData.fullName}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Age</span>
              <span className="text-white font-semibold">{formData.age} years</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Height &amp; Weight</span>
              <span className="text-white font-semibold">
                {formData.heightCm} cm â€¢ {formData.weightKg} kg
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Fitness Level</span>
              <span className="text-emerald-400 font-semibold capitalize">
                {formData.fitnessLevel}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Goal</span>
              <span className="text-white font-semibold capitalize">
                {formData.goal.replace('_', ' ')}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Available Time</span>
              <span className="text-white font-semibold">
                {formData.availableTimeMinutes} minutes
              </span>
            </div>
            <div className="flex justify-between items-start py-1">
              <span className="text-slate-400">Equipment</span>
              <span className="text-white font-semibold text-right max-w-[200px]">
                {formData.equipment.join(', ')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="mt-8 flex items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition cursor-pointer disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        ) : (
          <div />
        )}

        {currentStep < totalSteps ? (
          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition cursor-pointer"
          >
            Next Step
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinalSubmit}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/25 transition disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Create My Fitness Profile</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
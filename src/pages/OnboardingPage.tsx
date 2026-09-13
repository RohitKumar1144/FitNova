import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, LogOut, CheckCircle2, ShieldAlert, LayoutDashboard } from 'lucide-react'
import { signOut, useAuth, isDemoMode } from '../lib/supabase/auth'
import { upsertProfile, getProfile } from '../lib/supabase/queries'
import OnboardingForm from '../components/onboarding/OnboardingForm'
import DemoModeBadge from '../components/common/DemoModeBadge'
import type { OnboardingFormData } from '../types/profile'

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [initialName, setInitialName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  // Auth protection: redirect if unauthenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { replace: true })
    }
  }, [user, authLoading, navigate])

  // Check if profile already exists or pre-fill name
  useEffect(() => {
    async function checkExistingProfile() {
      if (!user || isDemoMode(user)) return
      try {
        const { data } = await getProfile(user.id)
        if (data?.full_name) {
          setInitialName(data.full_name)
        }
      } catch (err) {
        console.error('Error fetching existing profile:', err)
      }
    }

    if (user && !isDemoMode(user)) {
      checkExistingProfile()
    }
  }, [user])

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  const handleSubmit = async (formData: OnboardingFormData) => {
    if (!user) {
      setError('You must be logged in to save your profile.')
      return
    }

    if (isDemoMode(user)) {
      setError('Demo mode uses a shared demo profile. Sign out and create your own account to customize your profile.')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Upsert profile into Supabase
      const { error: upsertError } = await upsertProfile({
        id: user.id,
        full_name: formData.fullName.trim(),
        age: Number(formData.age),
        height_cm: Number(formData.heightCm),
        weight_kg: Number(formData.weightKg),
        fitness_level: formData.fitnessLevel,
        goal: formData.goal,
        available_time_minutes: Number(formData.availableTimeMinutes),
        equipment: formData.equipment,
      })

      if (upsertError) {
        console.error('Profile upsert error:', upsertError)
        setError('Failed to save profile. Please check your network and try again.')
        return
      }

      setIsSuccess(true)
      setTimeout(() => {
        navigate('/dashboard', { replace: true })
      }, 1200)
    } catch (err: unknown) {
      console.error('Unexpected onboarding error:', err)
      const errMsg = err instanceof Error ? err.message : 'An unexpected error occurred.'
      setError(errMsg)
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950 flex flex-col justify-between relative overflow-x-hidden">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-emerald-500/10 blur-[130px] rounded-full" />
        <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-cyan-500/10 blur-[150px] rounded-full" />
      </div>

      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/75 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Activity className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <span className="text-xl font-extrabold text-white">
              Fit<span className="text-emerald-400">Nova</span>
            </span>
          </div>

          <div className="flex items-center gap-4">
            {isDemoMode(user) && <DemoModeBadge size="sm" showTextOnMobile={true} />}
            <span className="text-xs text-slate-400 hidden sm:inline-block">
              {user.email}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/30 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900/50 text-xs font-semibold transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-10 sm:py-16">
        {isDemoMode(user) ? (
          <div className="max-w-md w-full bg-slate-900/90 border border-amber-500/30 backdrop-blur-xl rounded-3xl p-8 text-center shadow-2xl shadow-amber-950/20">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8 text-amber-400" />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Demo Mode Active
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-3">Demo Profile Protected</h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              Demo mode uses a shared demo profile. Sign out and create your own account to customize your profile.
            </p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4" />
                Return to Dashboard
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 font-semibold text-xs transition cursor-pointer"
              >
                Sign Out &amp; Create Account
              </button>
            </div>
          </div>
        ) : isSuccess ? (
          <div className="max-w-md w-full bg-slate-900/80 border border-emerald-500/40 backdrop-blur-xl rounded-3xl p-8 text-center shadow-2xl shadow-emerald-950/30">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-2">Profile Created!</h2>
            <p className="text-sm text-slate-400 mb-6">
              Your personalized fitness journey is ready. Redirecting to your dashboard...
            </p>
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-400 animate-pulse w-full" />
            </div>
          </div>
        ) : (
          <OnboardingForm
            initialFullName={initialName}
            onSubmit={handleSubmit}
            loading={submitting}
            error={error}
          />
        )}
      </main>

      {/* Subtle footer info */}
      <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-900">
        FitNova AI Coaching • Real-Time Computer Vision
      </footer>
    </div>
  )
}
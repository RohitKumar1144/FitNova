import { Link, useNavigate } from 'react-router-dom'
import { Activity, Sparkles, UserCheck } from 'lucide-react'
import { signOut, useAuth } from '../lib/supabase/auth'

export default function OnboardingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="relative max-w-lg w-full bg-slate-900/70 border border-slate-800 backdrop-blur-xl rounded-2xl p-8 shadow-2xl text-center">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Activity className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <span className="text-xl font-extrabold text-white">
            Fit<span className="text-emerald-400">Saathi</span>
          </span>
        </div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-4">
          <UserCheck className="w-3.5 h-3.5" />
          <span>Authenticated Successfully</span>
        </div>

        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
          Welcome to FitSaathi!
        </h1>

        <p className="text-sm text-slate-400 mb-6">
          {user?.email ? (
            <span>Logged in as <strong className="text-slate-200">{user.email}</strong></span>
          ) : (
            'Your account is ready. Let us set up your personalized profile.'
          )}
        </p>

        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 mb-6 text-left space-y-2 text-xs text-slate-300">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <Sparkles className="w-4 h-4" /> Next Step: Onboarding Flow
          </div>
          <p className="text-slate-400">
            In the upcoming step, you will input your fitness level, goals, available workout equipment, and daily schedule.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition"
          >
            Back to Home
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900/50 text-sm font-medium transition cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
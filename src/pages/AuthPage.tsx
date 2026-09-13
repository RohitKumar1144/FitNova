import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Loader2,
  Sparkles,
  ChevronRight,
} from 'lucide-react'
import { signInWithEmail, signUpWithEmail, signInAsDemoUser, signOut, useAuth, isDemoMode } from '../lib/supabase/auth'

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const handleSwitchAccount = async () => {
    try {
      await signOut()
      setError(null)
      setSuccessMessage('Signed out. You can now sign in or register with a new account.')
    } catch (err: unknown) {
      console.error('Sign out error:', err)
    }
  }

  const handleDemoLogin = async () => {
    if (demoLoading || loading) return
    setDemoLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const { error: demoError } = await signInAsDemoUser()
      if (demoError) {
        setError(demoError.message)
      } else {
        setSuccessMessage('Demo session authenticated! Redirecting to dashboard...')
        setTimeout(() => {
          navigate('/dashboard', { replace: true })
        }, 500)
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to launch demo mode.'
      setError(errMsg)
    } finally {
      setDemoLoading(false)
    }
  }

  const validateForm = () => {
    setError(null)
    setSuccessMessage(null)

    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setError('Please enter your email address.')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.')
      return false
    }

    if (!password) {
      setError('Please enter a password.')
      return false
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return false
    }

    if (isSignUp) {
      if (!confirmPassword) {
        setError('Please confirm your password.')
        return false
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.')
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return

    if (!validateForm()) return

    setLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      if (isSignUp) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('fitnova_demo_mode')
        }
        if (isAuthenticated) {
          await signOut()
        }

        const { data, error: signUpError } = await signUpWithEmail(email.trim(), password)

        if (signUpError) {
          setError(signUpError.message)
          return
        }

        // Check if session was created immediately or confirmation email is required
        if (data.session) {
          setSuccessMessage('Account created! Redirecting to onboarding...')
          setTimeout(() => {
            navigate('/onboarding')
          }, 1000)
        } else if (data.user) {
          setSuccessMessage('Account created. Please confirm your email, then sign in.')
        } else {
          setSuccessMessage('Sign up submitted. Please check your email.')
        }
      } else {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('fitnova_demo_mode')
        }
        if (isAuthenticated) {
          await signOut()
        }

        const { data, error: signInError } = await signInWithEmail(email.trim(), password)

        if (signInError) {
          setError(signInError.message)
          return
        }

        if (data.session) {
          navigate('/onboarding')
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'An unexpected authentication error occurred.'
      setError(errMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-12 relative selection:bg-emerald-500 selection:text-slate-950 overflow-hidden">
      {/* Background ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[650px] h-[450px] bg-emerald-500/10 blur-[130px] rounded-full" />
        <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-cyan-500/10 blur-[140px] rounded-full" />
      </div>

      {/* Back to Home Link */}
      <div className="w-full max-w-md mb-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>
      </div>

      {/* Auth Card Container */}
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800/90 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl shadow-emerald-950/20">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-4 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
              Fit<span className="text-emerald-400">Nova</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                AI
              </span>
            </span>
          </Link>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            {isSignUp
              ? 'Start your AI-guided fitness journey today.'
              : 'Sign in to access your workouts and tracker.'}
          </p>
        </div>

        {/* Active Session Notification / Account Switcher */}
        {!authLoading && isAuthenticated && user && !loading && !demoLoading && (
          <div className="mb-6 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs space-y-3 shadow-inner">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <span className="text-[11px] text-slate-400 block">Signed in as</span>
                <span className="font-bold text-white text-sm truncate block">{user.email || 'Athlete'}</span>
              </div>
              {isDemoMode(user) && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30">
                  DEMO MODE
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
              <Link
                to="/dashboard"
                className="flex-1 py-2 text-center rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition"
              >
                Go to Dashboard
              </Link>
              <button
                type="button"
                onClick={handleSwitchAccount}
                className="flex-1 py-2 text-center rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 font-semibold transition cursor-pointer"
              >
                Sign Out / Switch
              </button>
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-slate-950/70 border border-slate-800 rounded-xl mb-6 text-sm font-medium">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false)
              setError(null)
              setSuccessMessage(null)
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              !isSignUp
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true)
              setError(null)
              setSuccessMessage(null)
            }}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              isSignUp
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" />
            <span className="leading-snug">{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={loading}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition disabled:opacity-60"
              />
            </div>
          </div>

          {/* Password input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignUp ? 'At least 6 characters' : 'Enter your password'}
                disabled={loading}
                className="w-full pl-10 pr-11 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password input for SignUp */}
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  disabled={loading}
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition cursor-pointer"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:shadow-emerald-500/35 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isSignUp ? 'Creating Account...' : 'Signing In...'}</span>
              </>
            ) : (
              <>
                <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </>
            )}
          </button>
        </form>

        {/* 1-Click Demo Mode Option */}
        <div className="mt-5 pt-5 border-t border-slate-800/80">
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={demoLoading || loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-amber-500/10 hover:from-amber-500/20 hover:to-amber-500/20 border border-amber-500/30 hover:border-amber-400 text-amber-300 text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-60"
          >
            {demoLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                <span>Authenticating Demo Session...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Try Demo Account (1-Click SIH Access)</span>
              </>
            )}
          </button>
        </div>

        {/* Switch mode hint */}
        <div className="mt-6 text-center text-xs text-slate-400">
          {isSignUp ? (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false)
                  setError(null)
                  setSuccessMessage(null)
                }}
                className="text-emerald-400 font-semibold hover:underline cursor-pointer"
              >
                Sign in here
              </button>
            </p>
          ) : (
            <p>
              Don&apos;t have an account yet?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true)
                  setError(null)
                  setSuccessMessage(null)
                }}
                className="text-emerald-400 font-semibold hover:underline cursor-pointer"
              >
                Create one for free
              </button>
            </p>
          )}
        </div>

        {/* Security badge note */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Protected with secure Supabase authentication</span>
        </div>
      </div>
    </div>
  )
}
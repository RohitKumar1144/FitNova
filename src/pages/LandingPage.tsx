import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  Brain,
  Camera,
  CheckCircle2,
  ChevronRight,
  Flame,
  Menu,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
  Zap,
  Target,
  Clock,
  Compass,
  Award,
  Video,
  MessageSquare,
  Eye,
  ArrowRight,
  Dumbbell,
  Loader2,
  Play,
  AlertCircle
} from 'lucide-react'
import { signInAsDemoUser } from '../lib/supabase/auth'

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoError, setDemoError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleTryDemo = async () => {
    if (demoLoading) return
    setDemoLoading(true)
    setDemoError(null)

    try {
      const { error } = await signInAsDemoUser()
      if (error) {
        setDemoError(error.message)
      } else {
        navigate('/dashboard')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Demo login failed.'
      setDemoError(msg)
    } finally {
      setDemoLoading(false)
    }
  }

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false)
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const features = [
    {
      icon: <Brain className="w-6 h-6 text-emerald-400" />,
      title: 'AI Personalized Workouts',
      description: 'Get workouts based on your fitness level, goal, available time, and equipment.',
      tag: 'Adaptive Engine',
    },
    {
      icon: <Camera className="w-6 h-6 text-cyan-400" />,
      title: 'Real-Time Form Detection',
      description: 'Use your camera to receive exercise-form feedback while you work out.',
      tag: 'Computer Vision',
    },
    {
      icon: <Activity className="w-6 h-6 text-amber-400" />,
      title: 'Automatic Rep Counting',
      description: 'FitNova automatically detects and counts your exercise repetitions.',
      tag: 'Hands-Free',
    },
    {
      icon: <Award className="w-6 h-6 text-purple-400" />,
      title: 'Form Score',
      description: 'Understand how well you performed each exercise with an easy-to-read form score.',
      tag: 'Instant Analytics',
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-rose-400" />,
      title: 'Progress Tracking',
      description: 'Track workouts, repetitions, streaks, and fitness progress over time.',
      tag: 'Milestones',
    },
    {
      icon: <Sparkles className="w-6 h-6 text-emerald-400" />,
      title: 'Adaptive Recommendations',
      description: 'Use previous workout performance to receive smarter recommendations.',
      tag: 'Continuous Learning',
    },
  ]

  const steps = [
    {
      step: '01',
      title: 'Personalize',
      description: 'Create your account and complete onboarding with your fitness level, goal, schedule, and gear.',
      detail: 'Tailored for busy schedules, beginners, and home routines.',
      icon: <Target className="w-5 h-5 text-emerald-400" />,
      tag: 'Onboarding',
    },
    {
      step: '02',
      title: 'Get Your AI Plan',
      description: 'FitNova generates a personalized session with target reps, sets, and balanced volume.',
      detail: 'Built with server-side AI tailored to your profile.',
      icon: <Brain className="w-5 h-5 text-teal-400" />,
      tag: 'AI Generation',
    },
    {
      step: '03',
      title: 'Start Your Workout',
      description: 'Launch your webcam. MediaPipe pose detection runs directly in your browser with private on-device vision.',
      detail: 'No video is stored or sent to any remote server.',
      icon: <Camera className="w-5 h-5 text-cyan-400" />,
      tag: 'On-Device AI',
    },
    {
      step: '04',
      title: 'Track Every Rep',
      description: 'Perform squats, push-ups, or bicep curls with hands-free automated repetition counting.',
      detail: 'State-machine tracking prevents phantom reps.',
      icon: <Dumbbell className="w-5 h-5 text-sky-400" />,
      tag: 'Vision Tracking',
    },
    {
      step: '05',
      title: 'Fix Your Form',
      description: 'Receive real-time biomechanical feedback on joint depth, spine alignment, and movement phase.',
      detail: 'Live visual indicators correct faults immediately.',
      icon: <Eye className="w-5 h-5 text-amber-400" />,
      tag: 'Instant Feedback',
    },
    {
      step: '06',
      title: 'Adapt & Improve',
      description: 'View your FitNova Activity Score, progress trends, and earned badges as workout targets dynamically adapt.',
      detail: 'Hardened database persistence across every session.',
      icon: <TrendingUp className="w-5 h-5 text-purple-400" />,
      tag: 'Adaptive Fitness',
    },
    {
      step: '07',
      title: 'Ask Your AI Coach',
      description: 'Chat with your AI Coach anytime for workout tips, recovery suggestions, and routine modifications.',
      detail: 'Context-aware advice tailored to your history.',
      icon: <MessageSquare className="w-5 h-5 text-rose-400" />,
      tag: 'Interactive Coach',
    },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
      {/* Glow background accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-emerald-500/10 blur-[130px] rounded-full" />
        <div className="absolute top-[45%] -left-40 w-[500px] h-[500px] bg-cyan-500/10 blur-[140px] rounded-full" />
        <div className="absolute top-[75%] -right-40 w-[500px] h-[500px] bg-emerald-500/10 blur-[140px] rounded-full" />
      </div>

      {/* 1. NAVBAR */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/75 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200">
              <Activity className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
              Fit<span className="text-emerald-400">Nova</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 ml-1">
                AI
              </span>
            </span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <Link to="/" className="hover:text-emerald-400 transition-colors">
              Home
            </Link>
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-emerald-400 transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="hover:text-emerald-400 transition-colors cursor-pointer"
            >
              Features
            </button>
          </div>

          {/* Right CTA */}
          <div className="hidden md:flex items-center gap-3">
            <button
              type="button"
              onClick={handleTryDemo}
              disabled={demoLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:border-amber-400 text-sm font-semibold shadow-sm transition-all duration-200 cursor-pointer disabled:opacity-60"
            >
              {demoLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-amber-300 stroke-none" />
              )}
              <span>Try Demo</span>
            </button>

            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-semibold shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              Get Started
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-950/95 border-b border-slate-800 px-4 pt-2 pb-6 space-y-3">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:bg-slate-900 hover:text-emerald-400"
            >
              Home
            </Link>
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="w-full text-left px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:bg-slate-900 hover:text-emerald-400"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('features')}
              className="w-full text-left px-3 py-2 rounded-lg text-base font-medium text-slate-200 hover:bg-slate-900 hover:text-emerald-400"
            >
              Features
            </button>
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  handleTryDemo()
                }}
                disabled={demoLoading}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold shadow-md cursor-pointer disabled:opacity-60"
              >
                {demoLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                ) : (
                  <Play className="w-4 h-4 fill-amber-300 stroke-none" />
                )}
                <span>Try Demo (Instant Access)</span>
              </button>

              <Link
                to="/auth"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold shadow-lg shadow-emerald-500/20"
              >
                Get Started
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* 2. HERO SECTION */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Hero Left Content */}
            <div className="lg:col-span-7 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Adaptive Vision • AI Fitness Companion</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15] mb-6">
                Your AI-Powered{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                  Fitness Nova
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed mb-8">
                Personalized workouts, real-time form correction, and progress tracking — built for your fitness journey.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-6">
                <Link
                  to="/auth"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base shadow-xl shadow-emerald-500/25 transition-all duration-200 hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:translate-y-0"
                >
                  Get Started
                  <ChevronRight className="w-5 h-5 stroke-[2.5]" />
                </Link>

                <button
                  type="button"
                  onClick={handleTryDemo}
                  disabled={demoLoading}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-500/25 to-emerald-500/15 hover:from-amber-500/25 hover:to-emerald-500/25 text-amber-300 hover:text-amber-200 border border-amber-500/40 hover:border-amber-400 font-bold text-base shadow-xl shadow-amber-950/20 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60 cursor-pointer"
                >
                  {demoLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
                      <span>Launching Demo...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-amber-300 stroke-none" />
                      <span>Try Demo</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Instant
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection('how-it-works')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 font-medium text-base transition-all duration-200 cursor-pointer"
                >
                  See How It Works
                </button>
              </div>

              {demoError && (
                <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2 max-w-md mx-auto lg:mx-0">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{demoError}</span>
                </div>
              )}

              {/* Quick Trust Highlights */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-800/80 max-w-md mx-auto lg:mx-0 text-left">
                <div>
                  <p className="text-2xl font-bold text-white">100%</p>
                  <p className="text-xs text-slate-400">Browser Edge AI</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-400">Zero</p>
                  <p className="text-xs text-slate-400">Sensor Hardware</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-teal-300">Free</p>
                  <p className="text-xs text-slate-400">To Get Started</p>
                </div>
              </div>
            </div>

            {/* Hero Right Visual: UI Mockup of Camera Feed + AI Telemetry */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl p-4 shadow-2xl shadow-emerald-950/40">
                {/* Status Bar */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="font-mono text-emerald-400 font-semibold">AI TRACKER ACTIVE</span>
                  </div>
                  <span className="text-slate-400 font-mono">30 FPS • 33 Landmarks</span>
                </div>

                {/* Simulated Camera Feed with Pose Skeleton Graphics */}
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-slate-800 flex items-center justify-center">
                  {/* Grid lines for tech feel */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b0f_1px,transparent_1px),linear-gradient(to_bottom,#1e293b0f_1px,transparent_1px)] bg-[size:24px_24px]" />

                  {/* Pose Skeleton Graphic */}
                  <svg className="w-full h-full p-6 text-emerald-400" viewBox="0 0 200 200" fill="none">
                    {/* Head */}
                    <circle cx="100" cy="40" r="14" stroke="currentColor" strokeWidth="2.5" className="text-teal-300" />
                    {/* Spine */}
                    <line x1="100" y1="54" x2="100" y2="105" stroke="currentColor" strokeWidth="2.5" />
                    {/* Shoulders */}
                    <line x1="70" y1="68" x2="130" y2="68" stroke="currentColor" strokeWidth="2.5" />
                    {/* Arms */}
                    <line x1="70" y1="68" x2="52" y2="92" stroke="currentColor" strokeWidth="2" />
                    <line x1="52" y1="92" x2="48" y2="118" stroke="currentColor" strokeWidth="2" />
                    <line x1="130" y1="68" x2="148" y2="92" stroke="currentColor" strokeWidth="2" />
                    <line x1="148" y1="92" x2="152" y2="118" stroke="currentColor" strokeWidth="2" />
                    {/* Hips */}
                    <line x1="82" y1="105" x2="118" y2="105" stroke="currentColor" strokeWidth="2.5" />
                    {/* Legs (Squat pose) */}
                    <line x1="82" y1="105" x2="62" y2="135" stroke="currentColor" strokeWidth="2.5" />
                    <line x1="62" y1="135" x2="72" y2="175" stroke="currentColor" strokeWidth="2.5" />
                    <line x1="118" y1="105" x2="138" y2="135" stroke="currentColor" strokeWidth="2.5" />
                    <line x1="138" y1="135" x2="128" y2="175" stroke="currentColor" strokeWidth="2.5" />

                    {/* Key Landmark Dots */}
                    <circle cx="100" cy="40" r="4" fill="#34d399" />
                    <circle cx="70" cy="68" r="3.5" fill="#38bdf8" />
                    <circle cx="130" cy="68" r="3.5" fill="#38bdf8" />
                    <circle cx="52" cy="92" r="3.5" fill="#38bdf8" />
                    <circle cx="148" cy="92" r="3.5" fill="#38bdf8" />
                    <circle cx="82" cy="105" r="3.5" fill="#34d399" />
                    <circle cx="118" cy="105" r="3.5" fill="#34d399" />
                    <circle cx="62" cy="135" r="4" fill="#10b981" />
                    <circle cx="138" cy="135" r="4" fill="#10b981" />
                    <circle cx="72" cy="175" r="3.5" fill="#34d399" />
                    <circle cx="128" cy="175" r="3.5" fill="#34d399" />

                    {/* Angle Indicator Arc */}
                    <path d="M 62 125 A 10 10 0 0 1 70 135" stroke="#fbbf24" strokeWidth="2" />
                    <text x="40" y="140" fill="#fbbf24" fontSize="9" fontWeight="bold" fontFamily="monospace">92°</text>
                  </svg>

                  {/* Live Feedback Overlay Badge */}
                  <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md border border-emerald-500/30 rounded-lg px-2.5 py-1.5 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-300">Perfect Depth (92°)</span>
                  </div>

                  <div className="absolute top-3 right-3 bg-slate-950/80 backdrop-blur-md border border-slate-700/60 rounded-lg px-2.5 py-1.5">
                    <span className="text-[11px] font-mono text-slate-300">Exercise: Squat</span>
                  </div>

                  {/* Live HUD Bottom */}
                  <div className="absolute bottom-3 inset-x-3 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-lg p-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Reps Completed</p>
                      <p className="text-lg font-black text-white">12 <span className="text-xs text-slate-500 font-normal">/ 15</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Form Accuracy</p>
                      <p className="text-lg font-black text-emerald-400">96%</p>
                    </div>
                  </div>
                </div>

                {/* Floating Mini Card */}
                <div className="mt-3 bg-slate-950/60 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <Flame className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Daily Streak: 5 Days</p>
                      <p className="text-[11px] text-slate-400">Consistent &amp; injury-free</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                    +150 XP
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. PROBLEM / SOLUTION SECTION */}
      <section className="py-20 bg-slate-900/30 border-y border-slate-800/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-2">
              Why Traditional Workouts Fail Beginners
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Fitness is hard when you are doing it alone without guidance.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {/* Card 1 */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 flex flex-col justify-between hover:border-slate-700 transition">
              <div>
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
                  <Clock className="w-5 h-5 text-rose-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">The Struggle</h3>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                  "Not knowing what workout to do" — Overwhelmed by generic YouTube videos and cookie-cutter routines that don't match your fitness level or busy schedule.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800/80 bg-emerald-950/20 -mx-6 -mb-6 p-6 rounded-b-2xl border-emerald-500/20">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-1">FitNova Solution</span>
                <p className="text-sm font-medium text-slate-200">
                  Personalized workout plans built specifically for your goal, time, and available gear.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 flex flex-col justify-between hover:border-slate-700 transition">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                  <Target className="w-5 h-5 text-amber-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">The Struggle</h3>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                  "Difficulty maintaining correct form" — Fear of gym intimidation, injuring your back or knees, and guessing whether your depth or angle is right.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800/80 bg-emerald-950/20 -mx-6 -mb-6 p-6 rounded-b-2xl border-emerald-500/20">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-1">FitNova Solution</span>
                <p className="text-sm font-medium text-slate-200">
                  Real-time camera form detection and rep counting that alerts you before bad reps cause injuries.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 flex flex-col justify-between hover:border-slate-700 transition">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                  <Compass className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">The Struggle</h3>
                <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                  "Difficulty staying consistent" — Lack of feedback leads to giving up after a week because you don't see results or have accountability.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-800/80 bg-emerald-950/20 -mx-6 -mb-6 p-6 rounded-b-2xl border-emerald-500/20">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-1">FitNova Solution</span>
                <p className="text-sm font-medium text-slate-200">
                  Form scores, streaks, and adaptive recommendations that make daily fitness fun and habit-forming.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FEATURES SECTION */}
      <section id="features" className="py-20 md:py-28 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3">
              Precision Intelligence
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
              Engineered to make you stronger, safer, and disciplined.
            </h3>
            <p className="text-slate-400 text-base">
              Every feature runs directly in your browser without requiring expensive personal trainers or external hardware.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, idx) => (
              <div
                key={idx}
                className="group relative rounded-2xl bg-slate-900/50 border border-slate-800/90 p-7 hover:border-slate-700 hover:bg-slate-900/80 transition-all duration-200 hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {feat.icon}
                  </div>
                  <span className="text-[11px] font-mono font-medium text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded-full border border-slate-700/40">
                    {feat.tag}
                  </span>
                </div>
                <h4 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                  {feat.title}
                </h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {feat.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS SECTION */}
      <section id="how-it-works" className="py-20 md:py-28 bg-slate-900/40 border-t border-slate-800 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-400 mb-3">
              How FitNova Works
            </h2>
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
              Your complete AI fitness journey from onboarding to mastery.
            </h3>
            <p className="text-slate-400 text-base">
              Explore how our server-side AI, on-device computer vision, and adaptive progression guide every repetition safely and privately.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {steps.map((item, idx) => (
              <div
                key={idx}
                className={`group relative rounded-2xl bg-slate-900/70 border border-slate-800 p-6 flex flex-col justify-between hover:border-slate-700 hover:bg-slate-900/90 transition-all duration-200 ${
                  idx === 6 ? 'md:col-span-2 lg:col-span-3 xl:col-span-1' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 font-mono">
                      {item.step}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center group-hover:scale-110 transition-transform">
                      {item.icon}
                    </div>
                  </div>

                  <div className="mb-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block mb-1.5">
                      {item.tag}
                    </span>
                    <h4 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors">
                      {item.title}
                    </h4>
                  </div>

                  <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/80 text-xs text-slate-400 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{item.detail}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick interactive callout banner inside How It Works */}
          <div className="mt-12 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-slate-900/80 to-slate-900/80 border border-emerald-500/20 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Ready to experience real-time AI movement tracking?</h4>
                <p className="text-xs text-slate-400">Zero hardware required. Your camera feed stays 100% on your device.</p>
              </div>
            </div>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition shrink-0"
            >
              <span>Get Started Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 6. FINAL CTA */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="relative rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-slate-800 p-10 md:p-16 shadow-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
              <Zap className="w-3.5 h-3.5" />
              <span>Free &amp; Open Access</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4">
              Start Your Fitness Journey Today
            </h2>

            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-8">
              Your personal fitness companion is ready. Let&apos;s get moving.
            </p>

            <Link
              to="/auth"
              className="inline-flex items-center gap-2.5 px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-base shadow-xl shadow-emerald-500/20 transition duration-200 hover:scale-[1.03] active:scale-[0.98]"
            >
              Get Started
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            </Link>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> No credit card needed
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Private on-device video
              </span>
              <span className="flex items-center gap-1.5">
                <Video className="w-4 h-4 text-emerald-400" /> Works on any laptop webcam
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-12 text-slate-400 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                <Activity className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              </div>
              <span className="text-lg font-bold text-white">
                Fit<span className="text-emerald-400">Nova</span>
              </span>
              <span className="text-xs text-slate-400 ml-2">
                — AI-Powered Personal Fitness Coach
              </span>
            </div>

            {/* Navigation links */}
            <div className="flex items-center gap-6 text-sm font-medium">
              <Link to="/" className="hover:text-emerald-400 transition">
                Home
              </Link>
              <button
                type="button"
                onClick={() => scrollToSection('how-it-works')}
                className="hover:text-emerald-400 transition cursor-pointer"
              >
                How It Works
              </button>
              <button
                type="button"
                onClick={() => scrollToSection('features')}
                className="hover:text-emerald-400 transition cursor-pointer"
              >
                Features
              </button>
              <Link to="/auth" className="hover:text-emerald-400 transition">
                Sign In
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>© {new Date().getFullYear()} FitNova. All rights reserved.</p>
            <p className="text-slate-400">Empowering health and fitness with browser-based AI vision.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

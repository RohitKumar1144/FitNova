import { Link } from 'react-router-dom'
import { ArrowLeft, MessageSquare, Sparkles } from 'lucide-react'

export default function AICoachPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900/70 border border-slate-800 rounded-3xl p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mx-auto mb-4 text-purple-400">
          <MessageSquare className="w-6 h-6" />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Assistant</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">FitSaathi AI Coach</h1>
        <p className="text-sm text-slate-400 mb-6">
          Interactive fitness guidance, exercise tips, and personalized coaching will live here.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}
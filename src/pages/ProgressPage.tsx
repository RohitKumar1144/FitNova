import { Link } from 'react-router-dom'
import { ArrowLeft, TrendingUp } from 'lucide-react'

export default function ProgressPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900/70 border border-slate-800 rounded-3xl p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4 text-cyan-400">
          <TrendingUp className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Fitness Progress Analytics</h1>
        <p className="text-sm text-slate-400 mb-6">
          Detailed charts, weekly consistency, and form history will be rendered here.
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
import { Link } from 'react-router-dom'
import { ArrowLeft, Activity, ShieldCheck } from 'lucide-react'
import CameraFeed from '../components/tracker/CameraFeed'

export default function WorkoutSessionPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <nav className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-500/20">
                <Activity className="w-4 h-4 text-slate-950 stroke-[2.5]" />
              </div>
              <span className="text-lg font-extrabold text-white">
                Fit<span className="text-emerald-400">Saathi</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline-block">On-Device MediaPipe Vision Active</span>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center justify-center">
        <div className="w-full max-w-2xl space-y-4">
          <div className="text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl font-black text-white">
              MediaPipe Vision Tracker
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Live webcam feed with real-time MediaPipe PoseLandmarker skeleton overlay.
            </p>
          </div>

          <CameraFeed showOverlay={true} className="w-full shadow-2xl shadow-emerald-950/20" />
        </div>
      </main>
    </div>
  )
}
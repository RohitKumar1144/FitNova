import { Flame } from 'lucide-react'

interface StreakBadgeProps {
  streak: number
  className?: string
}

export default function StreakBadge({ streak, className = '' }: StreakBadgeProps) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${
        streak > 0
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
          : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
      } ${className}`}
    >
      <Flame className={`w-3.5 h-3.5 ${streak > 0 ? 'text-amber-400 fill-amber-400/20' : 'text-slate-500'}`} />
      <span>{streak} {streak === 1 ? 'Day Streak' : 'Days Streak'}</span>
    </div>
  )
}
import { Lock, Trophy, CheckCircle2 } from 'lucide-react'
import type { Badge } from '../../lib/progress/badges'

interface BadgesSectionProps {
  badges: Badge[]
}

export default function BadgesSection({ badges }: BadgesSectionProps) {
  const unlockedCount = badges.filter((b) => b.unlocked).length

  return (
    <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Achievements</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Milestones earned through your camera-verified workout progress
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
            {unlockedCount} of {badges.length} Unlocked
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {badges.map((badge) => {
          const isUnlocked = badge.unlocked

          return (
            <div
              key={badge.id}
              className={`relative rounded-xl border p-5 flex flex-col justify-between gap-4 transition duration-200 ${
                isUnlocked
                  ? 'bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border-amber-500/30 shadow-lg shadow-amber-500/5'
                  : 'bg-slate-950/40 border-slate-800/80 opacity-70 hover:opacity-85'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border transition ${
                      isUnlocked
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-md shadow-amber-500/10'
                        : 'bg-slate-900 border-slate-800 text-slate-500 grayscale'
                    }`}
                  >
                    <span role="img" aria-label={badge.title}>
                      {badge.emoji}
                    </span>
                  </div>

                  {isUnlocked ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Unlocked</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
                      <Lock className="w-3 h-3" />
                      <span>Locked</span>
                    </span>
                  )}
                </div>

                <div>
                  <h4
                    className={`text-sm font-bold tracking-tight ${
                      isUnlocked ? 'text-white' : 'text-slate-300'
                    }`}
                  >
                    {badge.title}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {badge.description}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">Requirement:</span>
                <span
                  className={`font-semibold truncate ${
                    isUnlocked ? 'text-amber-400' : 'text-slate-400'
                  }`}
                  title={badge.requirement}
                >
                  {badge.requirement}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

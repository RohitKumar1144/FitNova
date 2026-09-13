import { Sparkles } from 'lucide-react'

interface DemoModeBadgeProps {
  className?: string
  showTextOnMobile?: boolean
  size?: 'sm' | 'md'
}

export default function DemoModeBadge({
  className = '',
  showTextOnMobile = false,
  size = 'md',
}: DemoModeBadgeProps) {
  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10px] gap-1'
      : 'px-2.5 py-1 text-xs gap-1.5'

  return (
    <div
      className={`inline-flex items-center rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold uppercase tracking-wider shadow-sm select-none transition-all hover:bg-amber-500/15 ${sizeClasses} ${className}`}
      title="FitNova Interactive Demo Session"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
      <span className={showTextOnMobile ? 'inline' : 'hidden sm:inline'}>DEMO MODE</span>
      <Sparkles className="w-3 h-3 text-amber-400/90 shrink-0" />
    </div>
  )
}

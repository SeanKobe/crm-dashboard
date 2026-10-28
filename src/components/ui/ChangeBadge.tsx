import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { ChangeDirection } from '../../types'

// `bounce` plays the arrow's one-time bounce-in (used on KPI cards once they load).
export interface ChangeBadgeProps {
  direction?: ChangeDirection
  bounce?: boolean
  /** Colour meaning. Defaults to the direction (up is good); metrics where lower is better pass it explicitly. The arrow always shows the direction. */
  tone?: 'good' | 'bad' | 'neutral'
  /** Spoken text when the arrow and number need words ("up 12%"). */
  label?: string
  children: ReactNode
}

export function ChangeBadge({ direction = 'up', bounce = false, tone, label, children }: ChangeBadgeProps) {
  const up = direction === 'up'
  const Arrow = tone === 'neutral' ? Minus : up ? ArrowUp : ArrowDown
  const good = tone ? tone === 'good' : up
  return (
    <span role={label ? 'img' : undefined} aria-label={label} className={cn('flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-xs font-medium', tone === 'neutral' ? 'bg-surface-muted text-text-secondary' : good ? 'bg-success/12 text-success' : 'bg-danger/12 text-danger')}>
      <Arrow className={cn('size-3.5', bounce && 'animate-bounce-in')} strokeWidth={2} />
      {children}
    </span>
  )
}

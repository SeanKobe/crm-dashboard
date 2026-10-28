import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { CountUp } from './CountUp'
import type { IconComponent } from '../../types'

// Figma "FavoriteItem": indented row with icon, label and a right-aligned count. `trailing` holds optional controls (reorder, remove).
export interface FavoriteItemProps {
  icon: IconComponent
  label: string
  count?: string
  showCount?: boolean
  trailing?: ReactNode
  /** Plays the row-in animation (rows added from the "+" menu). */
  fresh?: boolean
  onClick?: () => void
}

export function FavoriteItem({ icon: Icon, label, count, showCount = true, trailing, fresh = false, onClick }: FavoriteItemProps) {
  return (
    <div
      className={cn(
        'flex h-9 w-full items-center gap-3 rounded-md pl-9 pr-3 text-sm text-text-secondary transition-colors hover:bg-surface-subtle active:bg-surface-muted motion-reduce:transition-none',
        'focus-within:ring-[1.5px] focus-within:ring-inset focus-within:ring-primary',
        fresh && 'animate-row-in motion-reduce:animate-none',
      )}
    >
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none">
        <Icon className="size-5 shrink-0" strokeWidth={1.75} />
        <span className="flex-1 truncate">{label}</span>
      </button>
      {showCount && count !== undefined && <CountUp value={count} align="end" />}
      {trailing}
    </div>
  )
}

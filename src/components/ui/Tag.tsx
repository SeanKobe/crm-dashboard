import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

// Figma "Tag": 6px radius label. Tone x State (Default / Hover / Focus / Disabled); `onRemove` shows the X slot.
export type TagTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger'
const tones: Record<TagTone, string> = {
  neutral: 'bg-surface-muted text-text-secondary',
  primary: 'bg-primary/12 text-primary',
  success: 'bg-success/12 text-success-strong',
  warning: 'bg-warning/12 text-warning-foreground',
  danger: 'bg-danger/12 text-danger-strong',
}

export interface TagProps {
  tone?: TagTone
  children: ReactNode
  onRemove?: () => void
  /** Accessible name of the remove button. */
  removeLabel?: string
  className?: string
}

export function Tag({ tone = 'neutral', children, onRemove, removeLabel, className }: TagProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-sm px-2 py-[3px] text-xs font-medium leading-3.75 transition-[filter] duration-hover ease-out motion-reduce:transition-none', tones[tone], onRemove && 'hover:brightness-95', className)}>
      <span className="truncate">{children}</span>
      {onRemove && (
        <button type="button" aria-label={removeLabel ?? 'Remove'} onClick={onRemove} className="-mr-1 grid size-4 shrink-0 place-items-center rounded-xs outline-none transition-colors duration-hover ease-out hover:bg-text-primary/10 focus-ring motion-reduce:transition-none">
          <X className="size-3.5" strokeWidth={1.75} />
        </button>
      )}
    </span>
  )
}

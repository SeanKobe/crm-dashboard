import { cn } from '../../lib/cn'

// Figma "CalendarDay": a 36px circle with the date number. Default / Hover (surface-muted) / Selected / Muted (other month) / Today.
// Here Today is the filled purple circle (as on the Dashboard card) and Selected is the outlined circle (Figma's Today outline).
export interface CalendarDayProps {
  /** Day of the month. */
  day: number
  today?: boolean
  selected?: boolean
  /** A day from the previous or next month. */
  muted?: boolean
  /** "October 20, 2025" for assistive tech. */
  label: string
  onClick?: () => void
  size?: 'md' | 'sm'
  disabled?: boolean
  /** ISO day, for tests and keyboard navigation. */
  dataDay?: string
  tabIndex?: number
  className?: string
}

export function CalendarDay({ day, today = false, selected = false, muted = false, label, onClick, size = 'md', disabled, dataDay, tabIndex, className }: CalendarDayProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={today ? 'date' : undefined}
      aria-pressed={selected || undefined}
      tabIndex={tabIndex}
      disabled={disabled}
      data-pick-day={dataDay}
      onClick={onClick}
      className={cn(
        'grid shrink-0 place-items-center rounded-full text-sm font-medium outline-none transition-colors duration-hover ease-out focus-ring motion-reduce:transition-none disabled:cursor-not-allowed disabled:hover:bg-transparent',
        size === 'md' ? 'size-9' : 'size-8',
        today ? 'bg-primary text-primary-foreground hover:bg-primary-hover' : cn('hover:bg-surface-muted', selected && 'border-[1.5px] border-primary text-primary', !selected && (muted ? 'text-text-secondary' : 'text-text-primary')),
        className,
      )}
    >
      {day}
    </button>
  )
}

import { cn } from '../../lib/cn'

// Figma "Progress Bar": 8px track (surface-muted, full radius) with a primary fill. The fill animates when the value changes.
// Always pair it with text ("7 of 12 tasks"): the bar alone is never the only signal.
export interface ProgressBarProps {
  /** 0–100. */
  value: number
  /** Accessible name, e.g. "Progress of Q4 Pipeline". */
  label: string
  /** Spoken value, e.g. "7 of 12 tasks done". */
  valueText?: string
  className?: string
}

export function ProgressBar({ value, label, valueText, className }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-valuetext={valueText} className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-muted', className)}>
      <div className="h-full rounded-full bg-primary transition-[width] duration-chart ease-out motion-reduce:transition-none" style={{ width: `${pct}%` }} />
    </div>
  )
}

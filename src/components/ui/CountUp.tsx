import { cn } from '../../lib/cn'
import { useCountUp } from '../../lib/useCountUp'
import type { CountTrigger } from '../../types'

// Renders `value` (e.g. "$1.4K", "1,212", "95%") counting up when it scrolls into view.
// The final text is rendered invisibly in the same grid cell so the width never changes, and
// tabular figures keep digits from shifting while the number runs.
export interface CountUpProps {
  /** The final text, e.g. "$1.4K". Its prefix, suffix and separators are kept while counting. */
  value: string
  from?: number
  duration?: number
  trigger?: CountTrigger
  align?: 'start' | 'end'
  className?: string
}

export function CountUp({ value, from, duration, trigger, align = 'start', className }: CountUpProps) {
  const { ref, text } = useCountUp(value, { from, duration, trigger })
  return (
    <span ref={ref} className={cn('inline-grid tabular-nums', className)}>
      <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-pre">
        {value}
      </span>
      <span aria-hidden className={cn('col-start-1 row-start-1 whitespace-pre', align === 'end' && 'justify-self-end')}>
        {text}
      </span>
      <span className="sr-only">{value}</span>
    </span>
  )
}

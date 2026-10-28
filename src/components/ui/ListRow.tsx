import { cn } from '../../lib/cn'
import { CountUp } from './CountUp'

// Figma "ListRow": rank, circle flag, name, value. Hover or keyboard focus highlights the row (and, in Top Country, its map dots).
export interface ListRowProps {
  rank: number
  name: string
  value: string
  /** URL of the circle flag image. */
  flag?: string
  highlighted?: boolean
  onHover?: (hovering: boolean) => void
}

export function ListRow({ rank, name, value, flag, highlighted = false, onHover }: ListRowProps) {
  return (
    <div
      tabIndex={0}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onFocus={() => onHover?.(true)}
      onBlur={() => onHover?.(false)}
      className={cn('-mx-2 flex h-7 items-center gap-2 rounded-md px-2 outline-none transition-colors duration-hover ease-out focus-ring motion-reduce:transition-none', highlighted ? 'bg-primary-soft' : 'hover:bg-surface-subtle')}
    >
      <span className="w-3 text-center text-xs text-text-muted">{rank}</span>
      {flag ? <img src={flag} alt="" className="size-[18px] shrink-0 rounded-full" /> : <span className="size-[18px] shrink-0 rounded-full border border-border bg-surface-muted" aria-hidden />}
      <span className={cn('flex-1 text-compact transition-colors duration-hover ease-out', highlighted && 'text-primary')}>{name}</span>
      <CountUp value={value} align="end" className="text-compact font-medium" />
    </div>
  )
}

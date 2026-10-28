import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import type { Change } from '../../types'
import { ChangeBadge } from '../ui/ChangeBadge'
import type { ChartAnchor } from './useChartHover'

const GAP = 14 // space between the anchor dot and the tooltip
const EDGE = 8 // minimum distance from the card edge

// One tooltip for all charts: title, bold value, change badge and optional breakdown rows.
// It is positioned from `anchor` (px relative to its parent, the chart's `relative` wrapper) and clamped inside the
// closest card (<section>); it sits above the anchor, or beside it when there is no room above.
/** One breakdown line under the value (Retention). `tone` is a background utility class for the dot. */
export interface TooltipRow {
  label: string
  value: ReactNode
  tone: string
}

export interface ChartTooltipProps {
  visible: boolean
  anchor: ChartAnchor | null
  title: string
  value: ReactNode
  suffix?: string
  change?: Change
  rows?: TooltipRow[]
}

export function ChartTooltip({ visible, anchor, title, value, suffix, change, rows }: ChartTooltipProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: 0, top: 0 })

  useLayoutEffect(() => {
    const tip = ref.current
    const container = tip?.parentElement
    if (!anchor || !tip || !container) return
    const c = container.getBoundingClientRect()
    const card = (container.closest('section') ?? container).getBoundingClientRect()
    const w = tip.offsetWidth
    const h = tip.offsetHeight
    const minLeft = card.left - c.left + EDGE
    const maxLeft = card.right - c.left - w - EDGE
    const minTop = card.top - c.top + EDGE
    const maxTop = card.bottom - c.top - h - EDGE
    const clampLeft = (v: number) => Math.max(minLeft, Math.min(v, maxLeft))
    const clampTop = (v: number) => Math.max(minTop, Math.min(v, maxTop))

    // Prefer above the anchor. Otherwise beside the hovered item, never on top of it; below is a last resort.
    const half = anchor.halfWidth
    const rightLeft = anchor.x + half + GAP
    const leftLeft = Math.max(minLeft, anchor.x - half - GAP - w)
    let left: number
    let top = anchor.y - h - GAP
    if (top >= minTop) {
      left = clampLeft(anchor.x - w / 2)
    } else if (rightLeft <= maxLeft) {
      left = rightLeft
      top = clampTop(anchor.y - h / 2)
    } else if (leftLeft + w <= anchor.x - half) {
      left = leftLeft
      top = clampTop(anchor.y - h / 2)
    } else {
      left = clampLeft(anchor.x - w / 2)
      top = clampTop(anchor.y + GAP)
    }
    setPos({ left, top })
  }, [anchor, title, value, rows])

  return (
    <div ref={ref} role="tooltip" className="pointer-events-none absolute z-20" style={{ left: pos.left, top: pos.top }}>
      <div
        className={cn(
          'min-w-36 rounded-lg border border-border bg-surface px-3.5 py-3 shadow-card transition-[opacity,translate] duration-hover ease-out',
          visible ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0',
        )}
      >
        <p className="whitespace-nowrap text-compact text-text-secondary">{title}</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="whitespace-nowrap text-lg font-semibold">{value}</span>
          {suffix && <span className="text-xs text-text-muted">{suffix}</span>}
          {change && <ChangeBadge direction={change.direction}>{change.text}</ChangeBadge>}
        </div>
        {rows && (
          <ul className="mt-2.5 flex flex-col gap-1.5 border-t border-border pt-2.5">
            {rows.map((row) => (
              <li key={row.label} className="flex items-center gap-2 text-xs">
                <span className={cn('size-2 rounded-full', row.tone)} />
                <span className="flex-1 text-text-secondary">{row.label}</span>
                <span className="font-medium">{row.value}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

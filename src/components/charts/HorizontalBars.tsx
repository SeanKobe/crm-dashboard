import { useLoaded } from '../../context/loadedContext'
import { cn } from '../../lib/cn'
import { useInView } from '../../lib/useInView'
import { CrossFade } from '../ui/CrossFade'
import { ChartTooltip } from './ChartTooltip'
import { HoverFill, HoverGuide } from './HoverEffects'
import { useChartHover } from './useChartHover'
import type { LeadBreakdownRow } from '../../types'

const MAX_FILL = 79.6 // the longest bar fills this % of the track (179 of 225px in Figma), leaving room for the hover dot

// Leads bars: striped primary (the Figma gradient), grow from the left on first view, then animate length and label on tab change.
export function HorizontalBars({ rows }: { rows: LeadBreakdownRow[] }) {
  const loaded = useLoaded()
  const { ref: viewRef, inView } = useInView({ enabled: loaded })
  const drawn = loaded && inView
  const { bindContainer, itemProps, isActive, visible, index: i, anchor } = useChartHover({ resetKey: rows })
  const max = Math.max(...rows.map((r) => r.count))
  const row = i !== null ? rows[i] : undefined

  return (
    <div ref={(el) => { bindContainer(el); viewRef.current = el }} className="relative flex flex-col gap-2.5">
      {rows.map((r, n) => (
        <div
          key={n}
          className="relative flex h-5 cursor-pointer items-center gap-3 outline-none before:absolute before:inset-x-0 before:-inset-y-1.25"
          aria-label={`${r.label}: ${r.count}`}
          {...itemProps(n, { anchor: 'end' })}
        >
          <CrossFade value={r.label} className="w-22 shrink-0 text-compact" />
          <div className="flex-1">
            <div
              data-anchor
              className={cn(
                'relative h-5 origin-left rounded-xs bg-primary bg-[repeating-linear-gradient(135deg,var(--color-primary)_0,var(--color-primary-stripe)_7px,var(--color-primary)_14px)] transition-[width,scale] duration-chart ease-out motion-reduce:transition-none',
                drawn ? 'scale-x-100' : 'scale-x-0',
              )}
              style={{ width: `${(r.count / max) * MAX_FILL}%`, transitionDelay: drawn ? `${n * 60}ms, ${n * 60}ms` : '0ms' }}
            >
              <HoverFill active={isActive(n)} direction="right" className="rounded-xs" />
              <HoverGuide active={isActive(n)} orientation="horizontal" />
            </div>
          </div>
        </div>
      ))}
      {row && (
        <ChartTooltip visible={visible} anchor={anchor} title={row.label} value={row.count.toLocaleString('en-US')} suffix="leads" change={{ direction: row.change >= 0 ? 'up' : 'down', text: `${Math.abs(row.change)}%` }} />
      )}
    </div>
  )
}

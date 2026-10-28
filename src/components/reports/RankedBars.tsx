import type { KeyboardEvent, ReactNode } from 'react'
import { useLoaded } from '../../context/loadedContext'
import { cn } from '../../lib/cn'
import { useInView } from '../../lib/useInView'
import { ChartTooltip, type TooltipRow } from '../charts/ChartTooltip'
import { HoverFill, HoverGuide } from '../charts/HoverEffects'
import { useChartHover } from '../charts/useChartHover'
import type { Change } from '../../types'

// Horizontal bars for the Reports charts (pipeline by stage, lead sources, owner leaderboard). Same look and hover behaviour as the
// Dashboard's Leads bars: striped primary bars that grow in once, a guide and fill on hover, the shared tooltip, and the same
// tooltip on keyboard focus. Every row is a button: click or Enter opens the matching list.
export interface RankedRow {
  key: string
  label: string
  /** Bar length. */
  value: number
  /** Text after the bar ("4 deals · $48,000"). */
  valueText: string
  /** 0–1 share of the bar drawn solid (for example the customers within the leads). */
  inner?: number
  /** Screen reader text; says what Enter does. */
  ariaLabel: string
  tooltipTitle: string
  tooltipValue: ReactNode
  tooltipSuffix?: string
  tooltipChange?: Change
  tooltipRows?: TooltipRow[]
  onOpen?: () => void
}

export interface RankedBarsProps {
  rows: RankedRow[]
  /** Centre the bars (the funnel silhouette). */
  centered?: boolean
  /** Width of the label column. */
  labelWidth?: string
}

const MAX_FILL = 100

export function RankedBars({ rows, centered = false, labelWidth = 'w-24' }: RankedBarsProps) {
  const loaded = useLoaded()
  const { ref: viewRef, inView } = useInView({ enabled: loaded })
  const drawn = loaded && inView
  const { bindContainer, itemProps, isActive, visible, index: i, anchor } = useChartHover({ resetKey: rows.map((r) => `${r.key}:${r.value}`).join('|') })
  const max = Math.max(1, ...rows.map((r) => r.value))
  const row = i !== null ? rows[i] : undefined
  const press = (r: RankedRow) => (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); r.onOpen?.() } }
  return (
    <div ref={(el) => { bindContainer(el); viewRef.current = el }} className="relative flex flex-col gap-2.5">
      {rows.map((r, n) => (
        <div
          key={r.key}
          role="button"
          data-ranked-row={r.key}
          aria-label={r.ariaLabel}
          onClick={r.onOpen}
          onKeyDown={press(r)}
          className="relative flex min-h-9 cursor-pointer items-center gap-3 rounded-md px-1 outline-none transition-colors duration-hover ease-out hover:bg-surface-subtle focus-ring motion-reduce:transition-none"
          {...itemProps(n, { anchor: 'end' })}
        >
          <span className={cn('shrink-0 truncate text-compact', labelWidth)}>{r.label}</span>
          <div className={cn('flex min-w-0 flex-1', centered && 'justify-center')}>
            <div
              data-anchor
              className={cn(
                'relative h-5 min-w-1 origin-left overflow-hidden rounded-xs bg-primary bg-[repeating-linear-gradient(135deg,var(--color-primary)_0,var(--color-primary-stripe)_7px,var(--color-primary)_14px)] transition-[width,scale] duration-chart ease-out motion-reduce:transition-none',
                drawn ? 'scale-x-100' : 'scale-x-0',
              )}
              style={{ width: `${Math.max(2, (r.value / max) * MAX_FILL * 0.62)}%`, transitionDelay: drawn ? `${n * 60}ms, ${n * 60}ms` : '0ms' }}
            >
              {r.inner !== undefined && r.inner > 0 && <span aria-hidden className="absolute inset-y-0 left-0 bg-primary-pressed" style={{ width: `${Math.min(1, r.inner) * 100}%` }} />}
              <HoverFill active={isActive(n)} direction="right" className="rounded-xs" />
              <HoverGuide active={isActive(n)} orientation="horizontal" />
            </div>
          </div>
          <span className="w-40 shrink-0 text-right text-compact tabular-nums text-text-secondary max-sm:hidden">{r.valueText}</span>
        </div>
      ))}
      {row && <ChartTooltip visible={visible} anchor={anchor} title={row.tooltipTitle} value={row.tooltipValue} suffix={row.tooltipSuffix} change={row.tooltipChange} rows={row.tooltipRows} />}
    </div>
  )
}

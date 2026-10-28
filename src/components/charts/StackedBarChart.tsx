import type { RetentionPoint, RetentionSeries, RetentionSeriesKey } from '../../types'
import { useLoaded } from '../../context/loadedContext'
import { cn } from '../../lib/cn'
import { percentChange } from '../../lib/format'
import { useInView } from '../../lib/useInView'
import { ChartTooltip } from './ChartTooltip'
import { HoverFill, HoverGuide } from './HoverEffects'
import { seriesTone } from './seriesTone'
import { useChartHover } from './useChartHover'

const sum = (m: RetentionPoint, series: RetentionSeries[]): number => series.reduce((total, s) => total + (m[s.key] ?? 0), 0)

// Retention stacks build bottom to top when first in view. Clicking a month highlights its column; the legend dims or hides series.
// `hiddenSeries` and `focusSeries` come from the legend in the card.
export interface StackedBarChartProps {
  months: RetentionPoint[]
  series: RetentionSeries[]
  activeMonth: string
  onSelect?: (month: string) => void
  previousTotal: number
  /** Series collapsed to zero height by the legend. */
  hiddenSeries?: RetentionSeriesKey[]
  /** Series kept at full strength while the others dim. */
  focusSeries?: RetentionSeriesKey | null
  height?: number
}

export function StackedBarChart({ months, series, activeMonth, onSelect, previousTotal, hiddenSeries = [], focusSeries = null, height = 79 }: StackedBarChartProps) {
  const loaded = useLoaded()
  const { ref: viewRef, inView } = useInView({ enabled: loaded })
  const drawn = loaded && inView
  const { bindContainer, itemProps, isActive, visible, index: i, anchor } = useChartHover({ resetKey: months })
  const totals = months.map((m) => sum(m, series))
  const max = Math.max(...totals) // fixed axis: hiding a series shrinks stacks instead of rescaling them
  const hovered = i !== null ? months[i] : undefined
  const order = series.map((s) => s.key).reverse() // enterprises sit at the bottom and build first

  return (
    <div ref={(el) => { bindContainer(el); viewRef.current = el }} className="relative">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }}>
        {months.map((m, n) => {
          const selected = m.month === activeMonth
          const hasData = totals[n] > 0
          return (
            <button
              key={m.month}
              type="button"
              aria-pressed={selected}
              onClick={() => onSelect?.(m.month)}
              className={cn('flex flex-col items-center gap-2 rounded-md outline-none transition-colors duration-hover ease-out focus-ring motion-reduce:transition-none', selected && 'bg-primary-soft', hasData && 'cursor-pointer')}
              {...(hasData ? itemProps(n) : {})}
            >
              <div className="flex w-full flex-col items-center justify-end" style={{ height }}>
                {hasData ? (
                  <div data-anchor className="relative w-8">
                    <div className="flex flex-col overflow-hidden rounded-xs">
                      {series.map((s) => (
                        <div
                          key={s.key}
                          className={cn('origin-bottom transition-[height,opacity,scale] duration-chart ease-out motion-reduce:transition-none', seriesTone[s.key], drawn ? 'scale-y-100' : 'scale-y-0', focusSeries && focusSeries !== s.key && 'opacity-25')}
                          style={{ height: hiddenSeries.includes(s.key) ? 0 : `${((m[s.key] ?? 0) / max) * height}px`, transitionDelay: drawn ? `${n * 50 + order.indexOf(s.key) * 90}ms, 0ms, ${n * 50 + order.indexOf(s.key) * 90}ms` : '0ms' }}
                        />
                      ))}
                    </div>
                    <HoverFill active={isActive(n)} direction="down" className="rounded-xs" />
                    <HoverGuide active={isActive(n)} orientation="vertical" />
                  </div>
                ) : (
                  <div className={cn('h-0.5 w-8 bg-border transition-opacity duration-chart ease-out', drawn ? 'opacity-100' : 'opacity-0')} />
                )}
              </div>
              <span className={cn('text-compact leading-4 transition-[color,font-weight] duration-hover ease-out', selected ? 'font-medium text-text-primary' : 'text-text-muted')}>{m.month}</span>
            </button>
          )
        })}
      </div>
      {hovered && i !== null && totals[i] > 0 && (
        <ChartTooltip
          visible={visible}
          anchor={anchor}
          title={hovered.title}
          value={totals[i]}
          change={percentChange(totals[i], i > 0 ? totals[i - 1] : previousTotal)}
          rows={series.map((s) => ({ label: s.label, value: hovered[s.key], tone: seriesTone[s.key] }))}
        />
      )}
    </div>
  )
}

import { useLoaded } from '../../context/loadedContext'
import { cn } from '../../lib/cn'
import { money, percentChange } from '../../lib/format'
import type { Change } from '../../types'
import { useInView } from '../../lib/useInView'
import { ChartTooltip } from './ChartTooltip'
import { HoverFill, HoverGuide } from './HoverEffects'
import { useChartHover } from './useChartHover'

// Revenue bar chart. Bars grow from the baseline when it first scrolls into view, then morph between ranges: columns always
// exist (up to 12) and unused ones collapse, so heights, widths and labels animate instead of jumping.
function niceMax(value: number): number {
  const steps = [1, 2, 2.5, 4, 5, 10]
  const magnitude = 10 ** Math.floor(Math.log10(value / 4))
  const step = steps.map((s) => s * magnitude).find((s) => s * 4 >= value) ?? 10 * magnitude
  return step * 4
}
const SLOTS = 12
const AXIS_OVERHANG = 7.5 // half a tick label: the labels centre on the plot's top and bottom edges

export interface BarChartProps {
  labels: string[]
  /** Tooltip titles, one per bar. */
  titles: string[]
  values: number[]
  /** The dotted overlay line; same length as `values`. */
  trend?: number[]
  /** The value before the first bar, for the first bar's change badge. */
  previous: number
  /** Axis suffix ("k" for thousands). */
  unit?: string
  formatValue?: (value: number) => string
  /** Changing this replays the trend line's draw animation. */
  trendKey: string
  height?: number
  /** Tooltip change per bar when it is not "vs the bar before" (Reports: vs the same slot of the previous period). */
  changes?: (Change | undefined)[]
  /** Makes each bar a button (click or Enter) that opens the matching list. */
  onSelect?: (index: number) => void
  /** Added to each bar's label for assistive tech when `onSelect` is set ("Open in Deals"). */
  selectHint?: string
  /** Axis and label text at 4.5:1 (text-secondary instead of text-muted). */
  strongText?: boolean
}

export function BarChart({ labels, titles, values, trend = [], previous, unit = 'k', formatValue = money, trendKey, height = 256, changes, onSelect, selectHint, strongText = false }: BarChartProps) {
  const loaded = useLoaded()
  const { ref: viewRef, inView } = useInView({ enabled: loaded })
  const drawn = loaded && inView
  const { bindContainer, itemProps, isActive, visible, index: i, anchor } = useChartHover({ resetKey: values })
  const n = labels.length
  const max = niceMax(Math.max(...values, ...trend))
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((f) => max * f)
  const fmtTick = (v: number) => `${Number.isInteger(v) ? v : v.toFixed(1)}${unit}`
  const points = trend.map((t, k) => `${((k + 0.5) / n) * 100},${100 - (t / max) * 100}`).join(' ')
  const slot = (k: number) => ({ flexGrow: k < n ? 1 : 0, marginLeft: k === 0 || k >= n ? 0 : 12, opacity: k < n ? 1 : 0 })
  const slotClass = 'min-w-0 basis-0 overflow-hidden transition-[flex-grow,margin,opacity] duration-chart ease-out motion-reduce:transition-none'

  return (
    <div ref={bindContainer} className="relative flex items-start gap-3">
      <div className={cn('flex w-7 flex-col items-end justify-between text-xs leading-3.75 tabular-nums', strongText ? 'text-text-secondary' : 'text-text-muted')} style={{ height: height + AXIS_OVERHANG * 2 }}>
        {ticks.map((t) => <span key={t} className="animate-fade-in">{fmtTick(t)}</span>)}
      </div>
      <div ref={viewRef} className="flex min-w-0 flex-1 flex-col gap-2 pt-[7.5px]">
        <div className="relative flex items-end" style={{ height }}>
          {Array.from({ length: SLOTS }, (_, k) => {
            const v: number | undefined = values[k]
            return (
              <div
                key={k}
                style={slot(k)}
                className={cn('flex h-full cursor-pointer items-end outline-none', onSelect && k < n && 'rounded-t-xs focus-visible:ring-[1.5px] focus-visible:ring-inset focus-visible:ring-primary', slotClass, k >= n && 'pointer-events-none')}
                aria-label={k < n && v !== undefined ? `${titles[k]}: ${formatValue(v)}${onSelect && selectHint ? `. ${selectHint}` : ''}` : undefined}
                aria-hidden={k >= n}
                role={onSelect && k < n ? 'button' : undefined}
                onClick={onSelect && k < n ? () => onSelect(k) : undefined}
                onKeyDown={onSelect && k < n ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(k) } } : undefined}
                {...(k < n ? itemProps(k) : {})}
              >
                <div
                  data-anchor
                  className={cn('relative w-full origin-bottom rounded-t-xs bg-surface-faint transition-[height,scale] duration-chart ease-out motion-reduce:transition-none', drawn ? 'scale-y-100' : 'scale-y-0')}
                  style={{ height: `${((v ?? 0) / max) * 100}%`, transitionDelay: drawn ? `0ms, ${k * 35}ms` : '0ms' }}
                >
                  <div className="h-0.5 w-full bg-primary" />
                  <HoverFill active={isActive(k)} direction="down" className="rounded-t-xs" />
                  <HoverGuide active={isActive(k)} orientation="vertical" />
                </div>
              </div>
            )
          })}
          {trend.length > 1 && drawn && (
            <svg key={trendKey} className="pointer-events-none absolute inset-0 size-full animate-draw [animation-delay:250ms]" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
              <polyline points={points} fill="none" className="stroke-border-strong" strokeWidth="1.5" strokeDasharray="2 5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
          )}
        </div>
        <div className="h-px bg-border" />
        <div className={cn('flex text-xs leading-3.75', strongText ? 'text-text-secondary' : 'text-text-muted')}>
          {Array.from({ length: SLOTS }, (_, k) => (
            <span key={k} style={slot(k)} className={cn('block text-center', slotClass)}>
              <span key={labels[k]} className="inline-block animate-fade-in">{labels[k]}</span>
            </span>
          ))}
        </div>
      </div>
      {i !== null && values[i] !== undefined && (
        <ChartTooltip visible={visible} anchor={anchor} title={titles[i]} value={formatValue(values[i])} change={changes ? changes[i] : percentChange(values[i], i > 0 ? values[i - 1] : previous)} />
      )}
    </div>
  )
}

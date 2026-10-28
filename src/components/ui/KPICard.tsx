import { Info } from 'lucide-react'
import { useLoaded } from '../../context/loadedContext'
import { cn } from '../../lib/cn'
import { ChangeBadge } from './ChangeBadge'
import { CountUp } from './CountUp'
import { SkeletonOverlay } from './Skeleton'
import { Tooltip } from './Tooltip'
import type { KpiMetric } from '../../types'

// Figma "KPI Card": Default and Hover (border-strong, shadow-hover, lifts 2px). Click toggles the Selected look
// (primary-soft fill, primary stroke, focus-ring halo). The info icon explains the metric; the badge arrow bounces in once.
export interface KPICardProps extends Omit<KpiMetric, 'id' | 'change' | 'direction' | 'comparison'> {
  /** Change vs the comparison period; leave out to show the value alone (Reports with comparison off). */
  change?: string
  direction?: KpiMetric['direction']
  comparison?: string
  /** Colour of the badge when it differs from the arrow's direction (a falling sales cycle is good news). */
  changeTone?: 'good' | 'bad' | 'neutral'
  /** Spoken form of the change ("up 12% vs the previous period"). */
  changeLabel?: string
  /** The Selected look (primary-soft fill, primary stroke, focus-ring halo). */
  selected?: boolean
  onSelect?: () => void
}

export function KPICard({ icon: Icon, label, info, value, change, direction = 'up', comparison, changeTone, changeLabel, selected = false, onSelect }: KPICardProps) {
  const loaded = useLoaded()
  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.() } }}
      className={cn(
        'relative flex cursor-pointer flex-col gap-5 rounded-lg border px-[11px] py-4 outline-none transition-[transform,translate,scale,box-shadow,border-color,background-color] duration-hover ease-out motion-reduce:transition-none focus-ring',
        selected ? 'border-primary bg-primary-soft ring-[3px] ring-focus-ring' : 'border-border bg-surface shadow-card hover:-translate-y-0.5 hover:border-border-strong hover:shadow-hover',
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-md border border-border bg-surface shadow-control">
          <Icon className="size-5" strokeWidth={1.75} />
        </span>
        <span className="flex-1 text-sm font-medium">{label}</span>
        <Tooltip content={info}>
          {(props) => (
            <button {...props} type="button" aria-label={`About ${label}`} onClick={(e) => e.stopPropagation()} className="grid size-5 place-items-center rounded-full text-text-secondary outline-none transition-colors duration-hover ease-out hover:text-text-primary focus-ring">
              <Info className="size-5" strokeWidth={1.75} />
            </button>
          )}
        </Tooltip>
      </div>
      <div className="flex items-end gap-1.5">
        <div className="flex shrink-0 items-center gap-1.5">
          <CountUp value={value} className="text-kpi font-medium leading-8.5" />
          {change !== undefined && <ChangeBadge direction={direction} tone={changeTone} label={changeLabel} bounce={loaded}>{change}</ChangeBadge>}
        </div>
        <span className="flex-1" />
        {comparison !== undefined && <span className="whitespace-nowrap text-compact text-text-secondary">{comparison}</span>}
      </div>
      <SkeletonOverlay show={!loaded} variant="kpi" />
    </div>
  )
}

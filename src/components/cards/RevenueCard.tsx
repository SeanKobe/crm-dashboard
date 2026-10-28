import { useMemo, useState } from 'react'
import { ChevronsUpDown } from 'lucide-react'
import { chartMetrics, metricRanges, revenue, revenueRanges } from '../../data/mock'
import { cn } from '../../lib/cn'
import { money } from '../../lib/format'
import { BarChart } from '../charts/BarChart'
import { CountUp } from '../ui/CountUp'
import { CrossFade } from '../ui/CrossFade'
import { Menu } from '../ui/Menu'
import { SegmentedFilter } from '../ui/SegmentedFilter'
import { Card } from './Card'
import type { ChartMetric, ChartRange } from '../../types'

// The title is a menu: switch the chart between Revenue, Deals and Leads. The time filter morphs the bars to the new range.
export function RevenueCard() {
  const [range, setRange] = useState<ChartRange>(revenue.defaultRange)
  const [metric, setMetric] = useState<ChartMetric>('Revenue')
  const ranges = useMemo(() => metricRanges(metric), [metric])
  const data = ranges[range]
  const format = metric === 'Revenue' ? money : (v: number) => `${v.toLocaleString('en-US')} ${data.noun}`
  return (
    <Card className="flex flex-col gap-5 px-[19px] py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Menu
            label="Chart metric"
            items={chartMetrics.map((m) => ({ id: m, label: m, checked: m === metric, onSelect: () => setMetric(m) }))}
            focusSelected
            trigger={({ open, props }) => (
              <button {...props} type="button" className={cn('-ml-1.5 flex items-center gap-1.5 -my-0.5 rounded-md px-1.5 py-0.5 text-sm font-medium outline-none transition-colors duration-hover ease-out hover:bg-surface-muted focus-ring', open && 'bg-surface-muted')}>
                <CrossFade value={metric} />
                <ChevronsUpDown className="size-5 text-text-secondary" strokeWidth={1.75} />
              </button>
            )}
          />
          <div className="flex items-end gap-2">
            <CountUp value={data.amount} className="text-amount font-medium leading-6.75" />
            <span className="text-sm text-text-secondary">{data.delta} {data.compare}</span>
          </div>
        </div>
        <SegmentedFilter label="Time range" options={revenueRanges} value={range} onChange={setRange} />
      </div>
      <BarChart labels={data.labels} titles={data.titles} values={data.values} trend={data.trend} previous={data.previous} unit={data.unit} formatValue={format} trendKey={`${metric}-${range}`} />
    </Card>
  )
}

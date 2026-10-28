import { useState } from 'react'
import { retention } from '../../data/mock'
import { cn } from '../../lib/cn'
import { seriesOutline, seriesTone } from '../charts/seriesTone'
import { StackedBarChart } from '../charts/StackedBarChart'
import { CountUp } from '../ui/CountUp'
import { Card, CardHeader } from './Card'
import type { RetentionSeriesKey } from '../../types'

// Legend: hover a series to dim the others, click to hide or show it (the stacks resize with a transition).
export function RetentionCard() {
  const [active, setActive] = useState(retention.activeMonth)
  const [hidden, setHidden] = useState<RetentionSeriesKey[]>([])
  const [focus, setFocus] = useState<RetentionSeriesKey | null>(null)
  const toggle = (key: RetentionSeriesKey) => setHidden((h) => (h.includes(key) ? h.filter((k) => k !== key) : h.length < retention.series.length - 1 ? [...h, key] : h))
  return (
    <Card className="flex flex-col gap-2 px-[15px] py-4">
      <CardHeader title={retention.title} widgetId="retention" />
      <div className="flex items-end gap-2">
        <CountUp value={retention.amount} className="text-amount font-medium leading-6.75" />
        <span className="text-sm text-text-secondary">{retention.delta}</span>
      </div>
      <ul className="-ml-1.5 flex items-center">
        {retention.series.map((s) => {
          const off = hidden.includes(s.key)
          return (
            <li key={s.key} className="-my-0.5">
              <button
                type="button"
                aria-pressed={!off}
                onClick={() => toggle(s.key)}
                onMouseEnter={() => setFocus(s.key)}
                onMouseLeave={() => setFocus(null)}
                onFocus={() => setFocus(s.key)}
                onBlur={() => setFocus(null)}
                className={cn('flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-compact leading-4 outline-none transition-[color,opacity,background-color] duration-hover ease-out hover:bg-surface-muted hover:text-text-primary focus-ring', off ? 'text-text-muted line-through' : 'text-text-secondary')}
              >
                <span className={cn('size-2 rounded-full border-[1.5px] transition-[background-color,border-color] duration-hover ease-out', off ? cn('bg-transparent', seriesOutline[s.key]) : cn('border-transparent', seriesTone[s.key]))} />
                {s.label}
              </button>
            </li>
          )
        })}
      </ul>
      <div>
        <StackedBarChart months={retention.months} series={retention.series} activeMonth={active} onSelect={setActive} previousTotal={retention.previousTotal} hiddenSeries={hidden} focusSeries={focus} />
      </div>
    </Card>
  )
}

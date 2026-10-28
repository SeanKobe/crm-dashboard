import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { topCountry } from '../../data/mock'
import au from '../../assets/flags/au.svg'
import id from '../../assets/flags/id.svg'
import my from '../../assets/flags/my.svg'
import sg from '../../assets/flags/sg.svg'
import { CountryMap } from '../charts/CountryMap'
import { ListRow } from '../ui/ListRow'
import { Card, CardHeader } from './Card'
import type { CountryKey } from '../../types'

const FLAGS: Record<CountryKey, string> = { australia: au, malaysia: my, indonesia: id, singapore: sg }

// Hovering a row lights up that country's dots on the map; hovering the map lights up its row.
export function TopCountryCard() {
  const [active, setActive] = useState<CountryKey | null>(null)
  return (
    <Card className="flex gap-4 px-[15px] py-4">
      <CountryMap active={active} onHover={setActive} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <CardHeader title={topCountry.title} widgetId="country" />
        <div className="flex flex-col gap-1">
          {topCountry.rows.map((row) => {
            const key = row.country
            return <ListRow key={row.name} rank={row.rank} name={row.name} value={row.value} flag={FLAGS[key]} highlighted={active === key} onHover={(on) => setActive(on ? key : null)} />
          })}
        </div>
        <button type="button" className="group flex h-8 w-fit items-center gap-2 rounded-md border border-border bg-surface px-3 text-compact font-medium shadow-control outline-none transition-[background-color,border-color,transform,translate,scale] duration-hover ease-out hover:border-border-strong hover:bg-surface-subtle active:scale-[0.97] focus-ring motion-reduce:transition-none">
          {topCountry.viewMore}
          <ArrowRight className="size-4 transition-transform duration-hover ease-out group-hover:translate-x-0.5" strokeWidth={1.75} />
        </button>
      </div>
    </Card>
  )
}

import { BellRing, CalendarCheck, Handshake, UsersRound } from 'lucide-react'
import { Toggle } from '../ui/Toggle'
import type { CalendarLayers, IconComponent } from '../../types'

// "Layers": which calendars are shown. The last two are read-only items derived from Deals (close dates) and Contacts (follow-ups due).
const ROWS: { key: keyof CalendarLayers; label: string; icon: IconComponent; note?: string }[] = [
  { key: 'mine', label: 'My events', icon: CalendarCheck },
  { key: 'team', label: 'Team events', icon: UsersRound },
  { key: 'dealCloses', label: 'Deal close dates', icon: Handshake, note: 'Read-only, from Deals' },
  { key: 'followUps', label: 'Contact follow-ups', icon: BellRing, note: 'Read-only, from Contacts' },
]

export function LayersPanel({ layers, onChange }: { layers: CalendarLayers; onChange: (patch: Partial<CalendarLayers>) => void }) {
  return (
    <section aria-labelledby="cal-layers" className="flex flex-col gap-2" data-layers>
      <h3 id="cal-layers" className="text-sm font-medium">Layers</h3>
      <ul className="flex flex-col gap-1">
        {ROWS.map((r) => (
          <li key={r.key} className="flex items-start gap-2.5 rounded-md px-1 py-1.5">
            <r.icon aria-hidden className="mt-0.5 size-5 shrink-0 text-text-secondary" strokeWidth={1.75} />
            <span className="flex min-w-0 flex-1 flex-col"><Toggle label={r.label} checked={layers[r.key]} onChange={(on) => onChange({ [r.key]: on })} />{r.note && <span className="text-xs text-text-secondary">{r.note}</span>}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

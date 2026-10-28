import { BellRing, Handshake, Check } from 'lucide-react'
import { useRecords } from '../../context/recordsContext'
import { attendeeInfo } from '../../lib/attendees'
import { cn } from '../../lib/cn'
import { DEMO_TODAY } from '../../lib/dates'
import { eventTimeText, eventsOn, longDate } from '../../lib/calendarLogic'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { platformIcon, typeMeta } from './eventMeta'
import type { DerivedItem, ScheduleEvent } from '../../types'

// Agenda: a list grouped by day; days with nothing scheduled are skipped.
export interface AgendaViewProps {
  days: string[]
  events: ScheduleEvent[]
  derived: DerivedItem[]
  selectedId: string | null
  onOpenEvent: (id: string, el: HTMLElement) => void
  onDerivedOpen: (item: DerivedItem) => void
  onDerivedContacted: (item: DerivedItem) => void
}

export function AgendaView({ days, events, derived, selectedId, onOpenEvent, onDerivedOpen, onDerivedContacted }: AgendaViewProps) {
  const { resolve } = useRecords()
  const contactName = (id: string): string | null => { const r = resolve({ type: 'contact', id }); return r && !r.deleted ? r.name : null }
  return (
    <div className="h-full min-h-0 overflow-y-auto rounded-lg border border-border bg-surface shadow-card" data-agenda>
      {days.map((d) => {
        const list = eventsOn(events, d)
        const items = derived.filter((x) => x.date === d)
        if (!list.length && !items.length) return null
        return (
          <section key={d} aria-label={longDate(d)} data-agenda-day={d} className="flex gap-4 border-b border-border px-5 py-3 last:border-b-0 max-sm:flex-col max-sm:gap-2">
            <h3 className="flex w-40 shrink-0 items-start gap-2 pt-1 text-sm font-medium">{longDate(d).replace(/, \d{4}$/, '')}{d === DEMO_TODAY && <Badge tone="primary" variant="solid">Today</Badge>}</h3>
            <ul className="flex min-w-0 flex-1 flex-col gap-1.5">
              {list.map((e) => {
                const meta = typeMeta[e.type]
                const Icon = meta.icon
                const PIcon = e.platform ? platformIcon[e.platform] : null
                const who = e.attendees.map((a) => attendeeInfo(a, contactName))
                return (
                  <li key={e.id}>
                    <button type="button" data-event-id={e.id} onClick={(ev) => onOpenEvent(e.id, ev.currentTarget)} className={cn('flex w-full animate-fade-in items-center gap-3 rounded-md border-l-[3px] px-3 py-2 text-left outline-none transition-colors duration-hover ease-out focus-ring hover:bg-surface-subtle motion-reduce:transition-none', meta.bar, meta.chip, selectedId === e.id && 'ring-2 ring-primary')}>
                      <span className="w-36 shrink-0 text-compact text-text-secondary">{eventTimeText(e)}</span>
                      <Icon aria-hidden className={cn('size-4 shrink-0', meta.text)} strokeWidth={1.75} />
                      <span className="sr-only">{e.type}: </span>
                      <span className={cn('min-w-0 flex-1 truncate text-sm font-medium', e.status === 'Cancelled' && 'line-through')}>{e.title}{e.status === 'Cancelled' && <span className="ml-2 text-xs font-normal text-text-secondary no-underline">Cancelled</span>}</span>
                      {e.status === 'Completed' && <Check aria-label="Completed" role="img" className="size-4 shrink-0 text-text-secondary" strokeWidth={2} />}
                      {PIcon && <span className="flex shrink-0 items-center gap-1 text-xs text-text-secondary max-md:hidden"><PIcon aria-hidden className="size-3.5" strokeWidth={1.75} />{e.platform}</span>}
                      <span className="flex shrink-0 -space-x-1.5 max-md:hidden">{who.slice(0, 3).map((w) => <span key={`${w.ref.kind}${w.ref.id}`} className="rounded-full ring-2 ring-surface"><Avatar initial={w.initials} tone={w.tone} size="L" /></span>)}</span>
                    </button>
                  </li>
                )
              })}
              {items.map((x) => (
                <li key={x.id} className="flex items-center gap-2 rounded-md border border-dashed border-border-strong px-3 py-2" data-derived={x.kind}>
                  <button type="button" data-derived-id={x.id} onClick={() => onDerivedOpen(x)} className="flex min-w-0 flex-1 items-center gap-3 rounded-sm text-left outline-none focus-ring">
                    <span className="w-36 shrink-0 text-compact text-text-secondary">All day</span>
                    {x.kind === 'deal-close' ? <Handshake aria-hidden className="size-4 shrink-0 text-text-secondary" strokeWidth={1.75} /> : <BellRing aria-hidden className="size-4 shrink-0 text-text-secondary" strokeWidth={1.75} />}
                    <span className="min-w-0 flex-1 truncate text-sm text-text-secondary"><span className="sr-only">{x.kind === 'deal-close' ? 'Deal closes: ' : 'Follow-up due: '}</span>{x.title}{x.overdue && <span className="ml-2 text-xs font-medium text-warning-foreground">Overdue</span>}</span>
                  </button>
                  {x.kind === 'follow-up' && <button type="button" onClick={() => onDerivedContacted(x)} className="flex h-7 shrink-0 items-center gap-1 rounded-md border border-border bg-surface px-2 text-xs font-medium outline-none transition-colors duration-hover ease-out hover:border-border-strong hover:bg-surface-subtle focus-ring motion-reduce:transition-none"><Check aria-hidden className="size-3.5" strokeWidth={2} />Mark as contacted</button>}
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

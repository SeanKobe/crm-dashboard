import { CalendarClock, Copy, ExternalLink, MapPin, Pencil, Trash2, Video, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useRecords } from '../../context/recordsContext'
import { attendeeInfo } from '../../lib/attendees'
import { cn } from '../../lib/cn'
import { eventTimeText, eventsOn, findConflicts, longDate } from '../../lib/calendarLogic'
import { useEvents } from '../../lib/useEvents'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { Popover } from '../ui/Menu'
import { Select } from '../ui/Select'
import { TextField } from '../ui/TextField'
import { TimeField } from '../ui/TimeField'
import { RecordChip } from '../notes/RecordChip'
import { ConflictChip } from './EventFields'
import { draftToPatch, validateDraft, type EventDraft } from './eventDraft'
import { EVENT_TYPES, joinUrl, platformIcon, typeMeta } from './eventMeta'
import type { DerivedItem, EventType, ScheduleEvent } from '../../types'

const typeOptions = EVENT_TYPES.map((t) => ({ value: t, label: t, leading: (() => { const I = typeMeta[t].icon; return <I aria-hidden className={`size-4 ${typeMeta[t].text}`} strokeWidth={1.75} /> })() }))
const anchorOf = (el: HTMLElement | null) => ({ current: el })

// ---- quick create: title, type, time. "More options" opens the full form with what has been typed.
export interface QuickCreateProps {
  open: boolean
  anchor: HTMLElement | null
  initial: EventDraft
  onClose: () => void
  onCreate: (draft: EventDraft) => void
  onMore: (draft: EventDraft) => void
  onViewConflict: (id: string) => void
}

export function QuickCreatePopover({ open, anchor, initial, onClose, onCreate, onMore, onViewConflict }: QuickCreateProps) {
  const [draft, setDraft] = useState(initial)
  const [attempted, setAttempted] = useState(false)
  const anchorRef = useMemo(() => anchorOf(anchor), [anchor])
  const errors = validateDraft(draft)
  const day = useEvents({ from: draft.date, to: draft.date })
  const conflicts = useMemo(() => {
    if (errors.endTime || errors.startTime || draft.allDay) return []
    const p = draftToPatch(draft)
    return findConflicts({ id: '__new', start: p.start, end: p.end, allDay: false, attendees: draft.attendees, ownerId: draft.ownerId }, day.events)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, day.events])
  const submit = () => { setAttempted(true); if (Object.keys(errors).length) return; onCreate(draft) }
  return (
    <Popover open={open} onClose={() => onClose()} anchorRef={anchorRef} role="dialog" label="Quick create event">
      <form onSubmit={(e) => { e.preventDefault(); submit() }} className="flex w-80 flex-col gap-3 rounded-lg border border-border bg-surface p-3 shadow-hover" data-quick-create>
        <p className="text-xs font-medium text-text-secondary">{longDate(draft.date)}</p>
        <TextField label="Title" required autoFocus value={draft.title} onChange={(title) => setDraft((d) => ({ ...d, title }))} placeholder="Add a title" error={attempted ? errors.title ?? null : null} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }} />
        <Select<EventType> label="Type" value={draft.type} options={typeOptions} onChange={(type) => setDraft((d) => ({ ...d, type }))} />
        {!draft.allDay && (
          <div className="grid grid-cols-2 gap-3">
            <TimeField label="Start" value={draft.startTime} onChange={(startTime) => setDraft((d) => ({ ...d, startTime }))} error={attempted ? errors.startTime ?? null : null} />
            <TimeField label="End" value={draft.endTime} onChange={(endTime) => setDraft((d) => ({ ...d, endTime }))} error={attempted ? errors.endTime ?? null : null} />
          </div>
        )}
        <ConflictChip conflicts={conflicts} onView={(id) => { onClose(); onViewConflict(id) }} />
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => onMore(draft)} className="rounded-xs text-compact font-medium text-primary underline underline-offset-2 outline-none focus-ring">More options</button>
          <span className="flex gap-2"><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Create</Button></span>
        </div>
      </form>
    </Popover>
  )
}

// ---- event details
export interface EventPopoverProps {
  event: ScheduleEvent | null
  anchor: HTMLElement | null
  conflicts: ScheduleEvent[]
  onClose: () => void
  onEdit: (e: ScheduleEvent) => void
  onDuplicate: (e: ScheduleEvent) => void
  onDelete: (e: ScheduleEvent) => void
  onOpenFull: (e: ScheduleEvent) => void
  onViewConflict: (id: string) => void
}

export function EventPopover({ event, anchor, conflicts, onClose, onEdit, onDuplicate, onDelete, onOpenFull, onViewConflict }: EventPopoverProps) {
  const { resolve } = useRecords()
  const anchorRef = useMemo(() => anchorOf(anchor), [anchor])
  const [last, setLast] = useState<ScheduleEvent | null>(event)
  if (event && event !== last) setLast(event)
  const e = event ?? last
  const contactName = (id: string): string | null => { const r = resolve({ type: 'contact', id }); return r && !r.deleted ? r.name : null }
  return (
    <Popover open={Boolean(event)} onClose={() => onClose()} anchorRef={anchorRef} role="dialog" label={e ? `Event details: ${e.title}` : 'Event details'}>
      {e && (
        <div className="flex w-88 flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-hover" data-event-popover={e.id}>
          <div className="flex items-start gap-2">
            {(() => { const meta = typeMeta[e.type]; const I = meta.icon; return <span className={cn('mt-0.5 grid size-8 shrink-0 place-items-center rounded-md', meta.chip)}><I aria-hidden className={cn('size-5', meta.text)} strokeWidth={1.75} /></span> })()}
            <div className="min-w-0 flex-1">
              <h3 className={cn('text-base font-medium leading-5', e.status === 'Cancelled' && 'line-through')}>{e.title}</h3>
              <p className="text-compact text-text-secondary">{e.type}{e.status !== 'Scheduled' ? ` · ${e.status}` : ''}</p>
            </div>
            <button type="button" aria-label="Close" onClick={onClose} className="grid size-6 place-items-center rounded-xs text-text-secondary outline-none hover:text-text-primary focus-ring"><X className="size-4" strokeWidth={1.75} /></button>
          </div>
          <p className="flex items-center gap-2 text-sm"><CalendarClock aria-hidden className="size-4 shrink-0 text-text-secondary" strokeWidth={1.75} /><span>{longDate(e.start.slice(0, 10))}, {eventTimeText(e)}</span></p>
          {(e.platform || e.location) && (
            <p className="flex items-center gap-2 text-sm">
              {(() => { const I = e.platform ? platformIcon[e.platform] : MapPin; return <I aria-hidden className="size-4 shrink-0 text-text-secondary" strokeWidth={1.75} /> })()}
              <span className="min-w-0 flex-1 truncate">{[e.platform, e.location].filter(Boolean).join(' · ')}</span>
              {joinUrl(e.platform, e.id) && <a href={joinUrl(e.platform, e.id) ?? undefined} target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center gap-1 rounded-sm bg-primary px-2 py-1 text-xs font-medium text-primary-foreground outline-none hover:bg-primary-hover focus-ring"><Video aria-hidden className="size-3.5" strokeWidth={1.75} />Join</a>}
            </p>
          )}
          {e.attendees.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Attendees">
              {e.attendees.slice(0, 8).map((a) => { const i = attendeeInfo(a, contactName); return <li key={`${a.kind}${a.id}`} className="flex items-center gap-1.5 rounded-full border border-border py-0.5 pl-0.5 pr-2 text-xs"><Avatar initial={i.initials} tone={i.tone} size="S" />{i.name}</li> })}
              {e.attendees.length > 8 && <li className="px-1 text-xs text-text-secondary">+{e.attendees.length - 8} more</li>}
            </ul>
          )}
          {e.links.length > 0 && <ul className="flex flex-wrap gap-1.5" aria-label="Linked records">{e.links.map((l) => <li key={`${l.type}${l.id}`}><RecordChip link={l} /></li>)}</ul>}
          <ConflictChip conflicts={conflicts} onView={onViewConflict} />
          {e.description && <p className="text-compact leading-4 text-text-secondary">{e.description}</p>}
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <Button icon={Pencil} onClick={() => onEdit(e)}>Edit</Button>
            <Button icon={Copy} onClick={() => onDuplicate(e)}>Duplicate</Button>
            <Button variant="destructive" strong icon={Trash2} onClick={() => onDelete(e)}>Delete</Button>
          </div>
          <button type="button" onClick={() => onOpenFull(e)} className="flex w-fit items-center gap-1 rounded-xs text-compact font-medium text-primary underline underline-offset-2 outline-none focus-ring"><ExternalLink aria-hidden className="size-3.5" strokeWidth={1.75} />Open full details</button>
        </div>
      )}
    </Popover>
  )
}

// ---- "+N more" for a crowded day
export function MorePopover({ day, anchor, events, derived, onClose, onOpenEvent, onDerivedOpen }: { day: string | null; anchor: HTMLElement | null; events: ScheduleEvent[]; derived: DerivedItem[]; onClose: () => void; onOpenEvent: (id: string, el: HTMLElement) => void; onDerivedOpen: (i: DerivedItem) => void }) {
  const anchorRef = useMemo(() => anchorOf(anchor), [anchor])
  const [last, setLast] = useState<string | null>(day)
  if (day && day !== last) setLast(day)
  const d = day ?? last
  return (
    <Popover open={Boolean(day)} onClose={() => onClose()} anchorRef={anchorRef} role="dialog" label={d ? `Everything on ${longDate(d)}` : 'Events'}>
      {d && (
        <div className="flex w-72 flex-col gap-1 rounded-lg border border-border bg-surface p-2 shadow-hover" data-more-popover>
          <p className="px-2 pb-1 pt-1 text-xs font-medium text-text-secondary">{longDate(d)}</p>
          {eventsOn(events, d).map((e) => { const meta = typeMeta[e.type]; const I = meta.icon; return (
            <button key={e.id} type="button" data-event-id={e.id} onClick={(ev) => { onClose(); onOpenEvent(e.id, ev.currentTarget) }} className={cn('flex items-center gap-2 rounded-sm border-l-[3px] px-2 py-1.5 text-left text-xs font-medium outline-none transition-colors duration-hover ease-out focus-ring motion-reduce:transition-none', meta.bar, meta.chip)}>
              <I aria-hidden className={cn('size-3.5 shrink-0', meta.text)} strokeWidth={1.75} /><span className="min-w-0 flex-1 truncate">{e.title}</span><span className="shrink-0 font-normal text-text-secondary">{e.allDay ? 'All day' : eventTimeText(e).split(' – ')[0]}</span>
            </button>
          ) })}
          {derived.filter((x) => x.date === d).map((x) => <button key={x.id} type="button" onClick={() => { onClose(); onDerivedOpen(x) }} className="rounded-sm border border-dashed border-border-strong px-2 py-1.5 text-left text-xs font-medium text-text-secondary outline-none focus-ring">{x.title}</button>)}
        </div>
      )}
    </Popover>
  )
}

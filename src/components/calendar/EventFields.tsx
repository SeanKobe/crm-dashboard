import { TriangleAlert } from 'lucide-react'
import { owners } from '../../data/deals'
import { Avatar } from '../ui/Avatar'
import { DateField } from '../ui/DateField'
import { Select } from '../ui/Select'
import { TextField } from '../ui/TextField'
import { TimeField } from '../ui/TimeField'
import { Toggle } from '../ui/Toggle'
import { AttendeePicker, LinkPicker } from './pickers'
import { EVENT_TYPES, PLATFORMS, typeMeta } from './eventMeta'
import type { DraftErrors, EventDraft } from './eventDraft'
import type { EventPlatform, EventStatus, EventType, ScheduleEvent } from '../../types'

// Non-blocking warning: the event overlaps another one for the same attendee. Saving is still allowed.
export function ConflictChip({ conflicts, onView }: { conflicts: ScheduleEvent[]; onView: (id: string) => void }) {
  if (!conflicts.length) return null
  return (
    <ul role="status" aria-label="Scheduling conflicts" className="flex flex-col gap-1.5" data-conflicts>
      {conflicts.slice(0, 3).map((c) => (
        <li key={c.id} className="flex items-center gap-2 rounded-md bg-warning/16 px-2.5 py-1.5 text-compact font-medium leading-4 text-warning-foreground">
          <TriangleAlert aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
          <span className="min-w-0 flex-1 truncate">Overlaps with {c.title}</span>
          <button type="button" onClick={() => onView(c.id)} className="rounded-xs font-medium underline underline-offset-2 outline-none focus-ring">View</button>
        </li>
      ))}
      {conflicts.length > 3 && <li className="px-2.5 text-xs text-text-secondary">and {conflicts.length - 3} more</li>}
    </ul>
  )
}

const typeOptions = EVENT_TYPES.map((t) => ({ value: t, label: t, leading: (() => { const I = typeMeta[t].icon; return <I aria-hidden className={`size-4 ${typeMeta[t].text}`} strokeWidth={1.75} /> })() }))
const platformOptions = [{ value: 'none', label: 'No platform' }, ...PLATFORMS.map((p) => ({ value: p, label: p }))]
const statusOptions = (['Scheduled', 'Completed', 'Cancelled'] as EventStatus[]).map((s) => ({ value: s, label: s }))
const ownerOptions = owners.map((o) => ({ value: o.id, label: o.name, leading: <Avatar initial={o.initial} tone={o.tone} size="S" /> }))

export interface EventFieldsProps {
  draft: EventDraft
  errors: DraftErrors
  /** Show validation messages (after a submit attempt, or always in the drawer). */
  showErrors: boolean
  onChange: (patch: Partial<EventDraft>) => void
  conflicts: ScheduleEvent[]
  onViewConflict: (id: string) => void
  showStatus?: boolean
  autoFocusTitle?: boolean
}

export function EventFields({ draft, errors, showErrors, onChange, conflicts, onViewConflict, showStatus = false, autoFocusTitle = false }: EventFieldsProps) {
  const err = (k: keyof DraftErrors): string | null => (showErrors ? errors[k] ?? null : null)
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-4">
      <TextField className="col-span-2" label="Title" required autoFocus={autoFocusTitle} value={draft.title} onChange={(title) => onChange({ title })} placeholder="e.g. Acme renewal call" error={err('title')} />
      <Select<EventType> label="Type" value={draft.type} options={typeOptions} onChange={(type) => onChange({ type })} />
      <Select<string> label="Platform" value={draft.platform ?? 'none'} options={platformOptions} onChange={(p) => onChange({ platform: p === 'none' ? null : (p as EventPlatform) })} />
      <DateField label={draft.allDay ? 'First day' : 'Date'} value={draft.date} onChange={(date) => onChange({ date, endDate: draft.endDate < date ? date : draft.endDate })} error={err('date')} />
      <div className="flex items-end pb-2.5"><Toggle label="All day" checked={draft.allDay} onChange={(allDay) => onChange({ allDay })} /></div>
      {draft.allDay ? (
        <DateField className="col-span-2" label="Last day" value={draft.endDate} min={draft.date} onChange={(endDate) => onChange({ endDate })} error={err('endDate')} />
      ) : (
        <>
          <TimeField label="Start" value={draft.startTime} onChange={(startTime) => onChange({ startTime })} error={err('startTime')} />
          <TimeField label="End" value={draft.endTime} onChange={(endTime) => onChange({ endTime })} error={err('endTime')} />
        </>
      )}
      {conflicts.length > 0 && <div className="col-span-2"><ConflictChip conflicts={conflicts} onView={onViewConflict} /></div>}
      <TextField className="col-span-2" label="Location or link" value={draft.location} onChange={(location) => onChange({ location })} placeholder="Room, address or dial-in" />
      <div className="col-span-2 flex flex-col gap-1.5"><span className="text-compact font-medium leading-4">Attendees</span><AttendeePicker value={draft.attendees} onChange={(attendees) => onChange({ attendees })} /></div>
      <div className="col-span-2 flex flex-col gap-1.5"><span className="text-compact font-medium leading-4">Linked records</span><LinkPicker value={draft.links} onChange={(links) => onChange({ links })} /></div>
      <Select label="Organizer" value={draft.ownerId} options={ownerOptions} onChange={(ownerId) => onChange({ ownerId })} />
      {showStatus ? <Select<EventStatus> label="Status" value={draft.status} options={statusOptions} onChange={(status) => onChange({ status })} /> : <span />}
      <TextField className="col-span-2" label="Description" multiline rows={3} value={draft.description} onChange={(description) => onChange({ description })} placeholder="Agenda, notes, dial-in details" />
    </div>
  )
}

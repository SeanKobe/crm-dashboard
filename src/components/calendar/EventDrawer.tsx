import { Check, Copy, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { findConflicts } from '../../lib/calendarLogic'
import { cn } from '../../lib/cn'
import { useAutosave } from '../../lib/useAutosave'
import { useEvents } from '../../lib/useEvents'
import { eventsService } from '../../services/events'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { EventFields } from './EventFields'
import { draftToPatch, toDraft, validateDraft, type EventDraft } from './eventDraft'
import { typeMeta } from './eventMeta'
import type { EventPatch, ScheduleEvent } from '../../types'

// Event detail drawer body (opens at /calendar/:id). Every valid change saves by itself and a "Saved" mark confirms it.
export interface EventDrawerBodyProps {
  event: ScheduleEvent
  onClose: () => void
  onDuplicate: (e: ScheduleEvent) => void
  onDelete: (e: ScheduleEvent) => void
  onViewConflict: (id: string) => void
}

export function EventDrawerBody({ event, onClose, onDuplicate, onDelete, onViewConflict }: EventDrawerBodyProps) {
  const [draft, setDraft] = useState<EventDraft>(() => toDraft(event))
  const save = useAutosave<EventPatch>((patch) => eventsService.update(event.id, patch), 600)
  const dirty = useRef(false)
  const errors = validateDraft(draft)
  const day = useEvents({ from: draft.date, to: draft.allDay ? draft.endDate || draft.date : draft.date })
  const conflicts = useMemo(() => {
    if (Object.keys(errors).length) return []
    const p = draftToPatch(draft)
    return findConflicts({ id: event.id, start: p.start, end: p.end, allDay: draft.allDay, attendees: draft.attendees, ownerId: draft.ownerId }, day.events)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, day.events, event.id])

  const queue = save.queue
  useEffect(() => {
    if (!dirty.current || Object.keys(validateDraft(draft)).length) return
    queue(draftToPatch(draft))
  }, [draft, queue])
  const meta = typeMeta[event.type]
  const Icon = meta.icon
  return (
    <>
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-6 py-4 max-lg:px-4">
        <span className={cn('grid size-8 shrink-0 place-items-center rounded-md', meta.chip)}><Icon aria-hidden className={cn('size-5', meta.text)} strokeWidth={1.75} /></span>
        <h2 className="min-w-0 flex-1 truncate text-lg font-medium leading-6">{event.title}</h2>
        <span aria-live="polite" role="status" data-save-status={save.status} className="flex h-5 shrink-0 items-center gap-1 text-xs font-medium">
          {save.status === 'saving' && <span className="text-text-secondary">Saving…</span>}
          {save.status === 'saved' && <span className="flex items-center gap-1 text-success-strong"><Check aria-hidden className="size-4" strokeWidth={2} />Saved</span>}
          {save.status === 'error' && <span className="text-danger-strong">Couldn’t save. <button type="button" onClick={() => { void save.retry() }} className="underline underline-offset-2">Retry</button></span>}
        </span>
        <IconButton icon={X} label="Close event details" size="sm" onClick={onClose} />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 max-lg:px-4">
        <EventFields draft={draft} errors={errors} showErrors onChange={(p) => { dirty.current = true; setDraft((d) => ({ ...d, ...p })) }} conflicts={conflicts} onViewConflict={onViewConflict} showStatus />
      </div>
      <footer className="flex shrink-0 items-center gap-2 border-t border-border px-6 py-3 max-lg:px-4">
        <Button icon={Copy} onClick={() => onDuplicate(event)}>Duplicate</Button>
        <span className="flex-1" />
        <Button variant="destructive" strong icon={Trash2} onClick={() => onDelete(event)}>Delete</Button>
      </footer>
    </>
  )
}

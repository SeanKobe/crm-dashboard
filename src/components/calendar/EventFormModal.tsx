import { useEffect, useMemo, useRef, useState } from 'react'
import { findConflicts } from '../../lib/calendarLogic'
import { useEvents } from '../../lib/useEvents'
import { eventsService } from '../../services/events'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { EventFields } from './EventFields'
import { draftToPatch, validateDraft, type EventDraft } from './eventDraft'
import type { ScheduleEvent } from '../../types'

// The full event form (Modal). Create from a draft, or edit an existing event. Errors are shown after the first attempt and focus
// goes to the first invalid field. Conflicts are a warning only: the event can still be saved.
export interface EventFormModalProps {
  open: boolean
  onClose: () => void
  initial: EventDraft
  /** Set when editing an existing event. */
  editingId?: string
  onSaved: (event: ScheduleEvent, created: boolean) => void
  onViewConflict: (id: string) => void
}

export function EventFormModal({ open, onClose, initial, editingId, onSaved, onViewConflict }: EventFormModalProps) {
  const [draft, setDraft] = useState<EventDraft>(initial)
  const [attempted, setAttempted] = useState(0)
  const [saving, setSaving] = useState(false)
  const body = useRef<HTMLDivElement>(null)
  const errors = validateDraft(draft)
  const day = useEvents({ from: draft.date || initial.date, to: draft.allDay ? draft.endDate || draft.date : draft.date || initial.date })
  const conflicts = useMemo(() => {
    if (Object.keys(errors).length) return []
    const p = draftToPatch(draft)
    return findConflicts({ id: editingId ?? '__new', start: p.start, end: p.end, allDay: draft.allDay, attendees: draft.attendees, ownerId: draft.ownerId }, day.events)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, day.events, editingId])

  useEffect(() => {
    if (!attempted) return
    ;(body.current?.closest('[role="dialog"]')?.querySelector<HTMLElement>('[aria-invalid="true"]'))?.focus()
  }, [attempted])

  const submit = async () => {
    setAttempted((n) => n + 1)
    if (Object.keys(errors).length) return
    setSaving(true)
    try {
      const patch = draftToPatch(draft)
      const saved = editingId ? await eventsService.update(editingId, patch) : await eventsService.create(patch)
      onSaved(saved, !editingId)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={editingId ? 'Edit event' : 'New event'}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" state={saving ? 'loading' : 'default'} onClick={() => { void submit() }}>{editingId ? 'Save changes' : 'Create event'}</Button></>}
    >
      <div ref={body} onKeyDown={(e) => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT' && (e.target as HTMLInputElement).type === 'text') { e.preventDefault(); void submit() } }}>
        <EventFields draft={draft} errors={errors} showErrors={attempted > 0} onChange={(p) => setDraft((d) => ({ ...d, ...p }))} conflicts={conflicts} onViewConflict={(id) => { onClose(); onViewConflict(id) }} autoFocusTitle showStatus={Boolean(editingId)} />
      </div>
    </Modal>
  )
}

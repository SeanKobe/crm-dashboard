import { useToast } from '../../context/toastContext'
import { eventTimeText } from '../../lib/calendarLogic'
import { eventsService } from '../../services/events'
import { EventFormModal } from './EventFormModal'
import { blankDraft, defaultNewDraftFor } from './eventDraft'
import type { AttendeeRef, EventLink } from '../../types'
import { DEMO_TODAY } from '../../lib/dates'
import { addDays } from '../../lib/dates'
import { useNavigate } from 'react-router'
import { CURRENT_USER_ID } from '../../services/session'

// "Schedule" from a Contact or Deal: the full event form, pre-linked (and with the contact as an attendee). Loaded on demand.
export interface ScheduleEventModalProps {
  open: boolean
  onClose: () => void
  link: EventLink
  attendees: AttendeeRef[]
  titleHint?: string
}

export default function ScheduleEventModal({ open, onClose, link, attendees, titleHint }: ScheduleEventModalProps) {
  const toast = useToast()
  const navigate = useNavigate()
  const initial = { ...defaultNewDraftFor(addDays(DEMO_TODAY, 1)), ...blankDraft({ date: addDays(DEMO_TODAY, 1), endDate: addDays(DEMO_TODAY, 1), title: titleHint ?? '', links: [link], attendees: [{ kind: 'owner' as const, id: CURRENT_USER_ID }, ...attendees], type: 'Meeting' }) }
  return (
    <EventFormModal
      open={open}
      onClose={onClose}
      initial={initial}
      onViewConflict={(id) => { onClose(); navigate(`/calendar/${id}`) }}
      onSaved={(e) => {
        onClose()
        toast({ type: 'success', title: 'Event scheduled', message: `${e.title}, ${eventTimeText(e)}`, action: { label: 'Undo', onClick: () => { void eventsService.delete(e.id) } } })
      }}
    />
  )
}

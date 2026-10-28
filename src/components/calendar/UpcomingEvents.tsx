import { CalendarPlus } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { addDays, DEMO_TODAY } from '../../lib/dates'
import { eventTimeText, longDate } from '../../lib/calendarLogic'
import { useEvents } from '../../lib/useEvents'
import { Button } from '../ui/Button'
import { SkeletonLine } from '../ui/Skeleton'
import { typeMeta } from './eventMeta'
import type { AttendeeRef, EventLink } from '../../types'

// "Schedule" action and "Upcoming events" for the Contact and Deal drawers. The form itself is its own chunk, loaded on first use.
const ScheduleEventModal = lazy(() => import('./ScheduleEventModal'))

export function ScheduleButton({ link, attendees = [], titleHint, label = 'Schedule' }: { link: EventLink; attendees?: AttendeeRef[]; titleHint?: string; label?: string }) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  return (
    <>
      <Button icon={CalendarPlus} onClick={() => { setMounted(true); setOpen(true) }}>{label}</Button>
      {mounted && <Suspense fallback={null}><ScheduleEventModal open={open} onClose={() => setOpen(false)} link={link} attendees={attendees} titleHint={titleHint} /></Suspense>}
    </>
  )
}

export function UpcomingEvents({ link, attendeeId, attendees, titleHint, heading = 'Upcoming events' }: { link: EventLink; attendeeId?: string; attendees?: AttendeeRef[]; titleHint?: string; heading?: string }) {
  const navigate = useNavigate()
  const range = useMemo(() => ({ from: DEMO_TODAY, to: addDays(DEMO_TODAY, 120) }), [])
  const { events, status } = useEvents(range, attendeeId ? { attendeeId } : { linkId: link.id })
  const upcoming = events.filter((e) => e.status !== 'Cancelled')
  return (
    <section aria-label={heading} className="flex flex-col gap-3" data-upcoming-events>
      <div className="flex items-center gap-2">
        <h3 className="flex-1 text-base font-medium">{heading}</h3>
        <ScheduleButton link={link} attendees={attendees} titleHint={titleHint} />
      </div>
      {status === 'loading' && <div role="status" aria-busy="true" aria-label="Loading events"><SkeletonLine className="w-56" /></div>}
      {status === 'ready' && upcoming.length === 0 && <p className="text-sm text-text-secondary">Nothing scheduled yet.</p>}
      <ul className="flex flex-col gap-1">
        {upcoming.slice(0, 5).map((e) => { const I = typeMeta[e.type].icon; return (
          <li key={e.id}>
            <button type="button" data-upcoming-event={e.id} onClick={() => navigate(`/calendar/${e.id}`)} className="flex w-full items-center gap-3 rounded-md border border-border px-3 py-2 text-left outline-none transition-colors duration-hover ease-out hover:border-border-strong hover:bg-surface-subtle focus-ring motion-reduce:transition-none">
              <I aria-hidden className={`size-5 shrink-0 ${typeMeta[e.type].text}`} strokeWidth={1.75} />
              <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-sm font-medium leading-4.25"><span className="sr-only">{e.type}: </span>{e.title}</span><span className="truncate text-xs leading-3.75 text-text-secondary">{longDate(e.start.slice(0, 10))}, {eventTimeText(e)}</span></span>
            </button>
          </li>
        ) })}
      </ul>
    </section>
  )
}

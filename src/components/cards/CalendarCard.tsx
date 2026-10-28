import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRecords } from '../../context/recordsContext'
import { calendar } from '../../data/mock'
import { attendeeInfo } from '../../lib/attendees'
import { dashTime, eventsOn } from '../../lib/calendarLogic'
import { useEvents } from '../../lib/useEvents'
import { cn } from '../../lib/cn'
import { CrossFade } from '../ui/CrossFade'
import { EventCard } from '../ui/EventCard'
import { Card, CardHeader } from './Card'

const DAY = 86_400_000
const iso = (d: Date): string => d.toISOString().slice(0, 10)
const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const arrow = '-m-1 grid size-7 place-items-center rounded-md text-text-secondary outline-none transition-[background-color,color,transform,translate,scale] duration-hover ease-out hover:bg-surface-muted hover:text-text-primary active:scale-[0.97] focus-ring'

// The week slides left or right, the purple circle glides to the clicked date, and the event list cross-fades when the date changes.
export function CalendarCard() {
  const [weekStart, setWeekStart] = useState(new Date(`${calendar.startWeek}T00:00:00Z`))
  const [selected, setSelected] = useState(calendar.selected)
  const [dir, setDir] = useState<'left' | 'right' | null>(null)
  const grid = useRef<HTMLDivElement>(null)
  const dateRefs = useRef<Record<string, HTMLElement>>({})
  const [circle, setCircle] = useState<{ x: number; y: number } | null>(null)
  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * DAY))
  const month = new Date(weekStart.getTime() + 3 * DAY).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  // Events come from the same service as the Calendar page, so a new event shows up here too.
  const range = useMemo(() => ({ from: iso(weekStart), to: iso(new Date(weekStart.getTime() + 6 * DAY)) }), [weekStart])
  const feed = useEvents(range)
  const { resolve } = useRecords()
  const events = eventsOn(feed.events, selected).filter((e) => e.status !== 'Cancelled').map((e) => {
    const who = e.attendees.map((a) => attendeeInfo(a, (id) => { const r = resolve({ type: 'contact', id }); return r && !r.deleted ? r.name : null }))
    return {
      id: e.id,
      title: e.title,
      time: e.allDay ? 'All day' : `${dashTime(e.start)} - ${dashTime(e.end)}`,
      extra: who.length > 3 ? `+${who.length - 3}` : null,
      platform: e.platform ? `On ${e.platform}` : e.location || e.type,
      people: who.slice(0, 3).map((w) => ({ initial: w.initials, tone: w.tone })),
    }
  })
  const shift = (weeks: number) => {
    setDir(weeks > 0 ? 'right' : 'left')
    setWeekStart(new Date(weekStart.getTime() + weeks * 7 * DAY))
    setSelected(iso(new Date(new Date(`${selected}T00:00:00Z`).getTime() + weeks * 7 * DAY)))
  }

  useLayoutEffect(() => {
    const el = dateRefs.current[selected]
    setCircle(el ? { x: el.offsetLeft, y: el.offsetTop } : null)
  }, [selected, weekStart])

  return (
    <Card className="flex flex-col gap-4.5 px-[19px] py-5">
      <CardHeader title={calendar.title} widgetId="calendar" />
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Previous week" onClick={() => shift(-1)} className={arrow}><ChevronLeft className="size-5" strokeWidth={1.75} /></button>
        <CrossFade value={month} className="text-base font-medium leading-4.75" />
        <button type="button" aria-label="Next week" onClick={() => shift(1)} className={arrow}><ChevronRight className="size-5" strokeWidth={1.75} /></button>
      </div>
      <div ref={grid} className="relative overflow-hidden">
        {circle && <span aria-hidden className="absolute left-0 top-0 size-9 rounded-full bg-primary transition-transform duration-move ease-out motion-reduce:transition-none" style={{ transform: `translate(${circle.x}px, ${circle.y}px)` }} />}
        <div key={iso(weekStart)} className={cn('grid grid-cols-7 gap-1', dir === 'right' && 'animate-slide-in-right', dir === 'left' && 'animate-slide-in-left')}>
          {days.map((d, i) => {
            const key = iso(d)
            const active = key === selected
            return (
              <button key={key} type="button" aria-pressed={active} onClick={() => setSelected(key)} className="group flex flex-col items-center gap-3 rounded-md outline-none focus-ring">
                <span className="text-compact leading-4 text-text-muted">{weekdays[i]}</span>
                <span ref={(el) => { if (el) dateRefs.current[key] = el }} className={cn('relative z-10 flex size-9 items-center justify-center rounded-full text-sm font-medium transition-colors duration-hover ease-out', active ? 'text-primary-foreground' : 'group-hover:bg-surface-muted')}>
                  {d.getUTCDate()}
                </span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="h-px bg-border" />
      <div key={selected} className="flex flex-col gap-4.5">
        {feed.status !== 'ready' ? null : events.length ? (
          events.map((e, i) => <div key={e.id} className="animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}><EventCard {...e} /></div>)
        ) : (
          <p className="animate-fade-in rounded-md bg-surface-subtle p-4 text-center text-sm text-text-muted">No events scheduled</p>
        )}
      </div>
    </Card>
  )
}

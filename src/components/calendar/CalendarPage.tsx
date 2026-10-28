import { CalendarDays, CalendarOff, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useMatch, useNavigate, useSearchParams } from 'react-router'
import { useDeals } from '../../context/dealsContext'
import { useToast } from '../../context/toastContext'
import { DEMO_TODAY, demoNow } from '../../lib/dates'
import { dateOf, eventTimeText, findConflicts, fmtTime, longDate, rangeFor, shiftDate, weekDays, monthGrid } from '../../lib/calendarLogic'
import { motion, prefersReducedMotion } from '../../lib/motion'
import { useMediaQuery } from '../../lib/useMediaQuery'
import { useTick } from '../../lib/useTick'
import { useDerivedItems, useEvent, useEvents } from '../../lib/useEvents'
import { eventsService } from '../../services/events'
import { contactsService } from '../../services/contacts'
import { loadCalendarPrefs, saveCalendarPrefs } from '../../services/calendarPrefs'
import { Button } from '../ui/Button'
import { Drawer } from '../ui/Drawer'
import { EmptyState } from '../ui/EmptyState'
import { Popover } from '../ui/Menu'
import { SkeletonBlock, SkeletonLine } from '../ui/Skeleton'
import { AgendaView } from './AgendaView'
import { CalendarToolbar } from './CalendarToolbar'
import { EventDrawerBody } from './EventDrawer'
import { EventFormModal } from './EventFormModal'
import { LayersPanel } from './LayersPanel'
import { MiniCalendar } from './MiniCalendar'
import { MonthView } from './MonthView'
import { EventPopover, MorePopover, QuickCreatePopover } from './Popovers'
import { TimeGrid } from './TimeGrid'
import { blankDraft, defaultNewDraftFor, draftToPatch, slotDraft, toDraft, type EventDraft } from './eventDraft'
import type { CalendarLayers, CalendarViewMode, DerivedItem, ScheduleEvent } from '../../types'

// Calendar page: mini month + layers on the left, toolbar and Month / Week / Day / Agenda on the right, popovers for quick create and
// event details, a drawer at /calendar/:id. View, date, layers and scroll position persist.
type Pop =
  | { kind: 'quick'; anchor: HTMLElement | null; draft: EventDraft; day: string; minutes: number | null; key: number }
  | { kind: 'event'; id: string; anchor: HTMLElement | null }
  | { kind: 'more'; day: string; anchor: HTMLElement | null }

export function CalendarPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const { currentUserId } = useDeals()
  const [params] = useSearchParams()
  const errorFlag = params.get('error') === '1'
  const match = useMatch('/calendar/:id')
  const openId = match?.params.id ?? null
  const wide = useMediaQuery('(min-width: 1024px)')
  useTick(30_000)

  const [prefs] = useState(() => loadCalendarPrefs(typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches))
  const [view, setView] = useState<CalendarViewMode>(prefs.view)
  const [date, setDate] = useState(prefs.date)
  const [layers, setLayers] = useState<CalendarLayers>(prefs.layers)
  const [dir, setDir] = useState<'left' | 'right' | null>(null)
  const [pop, setPop] = useState<Pop | null>(null)
  const [popKey, setPopKey] = useState(0)
  const [ghostEl, setGhostEl] = useState<HTMLDivElement | null>(null)
  const [form, setForm] = useState<{ initial: EventDraft; editingId?: string; key: number } | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [initialScroll, setInitialScroll] = useState(prefs.scrollTop)
  const [shownId, setShownId] = useState<string | null>(openId)
  if (openId && openId !== shownId) setShownId(openId)
  const scrollRef = useRef(prefs.scrollTop)
  const scrollTimer = useRef(0)
  const monthAnchor = useRef<HTMLElement | null>(null)

  const announce = useCallback((msg: string) => setAnnouncement((p) => (p === msg ? `${msg}​` : msg)), [])
  const range = useMemo(() => rangeFor(view, date), [view, date])
  const feed = useEvents(range, { minLoadMs: prefersReducedMotion() ? 0 : motion.skeleton, simulateError: errorFlag })
  const derivedAll = useDerivedItems(range, layers.dealCloses || layers.followUps)
  const derived = useMemo(() => derivedAll.filter((x) => (x.kind === 'deal-close' ? layers.dealCloses : layers.followUps)), [derivedAll, layers.dealCloses, layers.followUps])
  const visible = useMemo(() => feed.events.filter((e) => (e.ownerId === currentUserId ? layers.mine : layers.team)), [feed.events, layers.mine, layers.team, currentUserId])
  const now = demoNow()

  useEffect(() => { saveCalendarPrefs({ view, date, layers }) }, [view, date, layers])
  useEffect(() => () => window.clearTimeout(scrollTimer.current), [])

  // ---- navigation
  const shift = (d: 1 | -1) => { setInitialScroll(scrollRef.current); setDir(d === 1 ? 'right' : 'left'); setDate((x) => shiftDate(view, x, d)); setPop(null) }
  const today = () => { setInitialScroll(scrollRef.current); setDir(null); setDate(DEMO_TODAY); setPop(null) }
  const changeView = (v: CalendarViewMode) => { if (v === view) return; setInitialScroll(scrollRef.current); setDir(null); setView(v); setPop(null); announce(`${v[0].toUpperCase()}${v.slice(1)} view`) }
  const goDay = (d: string) => { setInitialScroll(scrollRef.current); setDir(null); setDate(d); setView('day'); setPop(null) }
  const pickDate = (d: string) => { setInitialScroll(scrollRef.current); setDir(null); setDate(d); setPop(null) }

  // ---- creating
  const openForm = (initial: EventDraft, editingId?: string) => { setPop(null); setForm({ initial, editingId, key: Date.now() }) }
  const newEvent = () => openForm(defaultNewDraftFor(date))
  const quickAt = (day: string, minutes: number | null, el: HTMLElement) => {
    setPopKey((k) => k + 1)
    const draft = minutes === null ? (view === 'month' ? defaultNewDraftFor(day) : blankDraft({ date: day, endDate: day, allDay: true, type: 'Task', platform: null })) : slotDraft(day, minutes, 30)
    monthAnchor.current = el
    setPop({ kind: 'quick', anchor: el, draft, day, minutes, key: popKey + 1 })
  }
  const undoToast = (title: string, message: string | undefined, undo: () => void) => toast({ type: 'info', title, message, action: { label: 'Undo', onClick: undo } })

  const createFromDraft = async (draft: EventDraft) => {
    const e = await eventsService.create({ ...draftToPatch(draft), ownerId: currentUserId })
    setPop(null)
    toast({ type: 'success', title: 'Event created', message: `${e.title}, ${eventTimeText(e)}`, action: { label: 'Undo', onClick: () => { void eventsService.delete(e.id) } } })
    announce(`Created ${e.title} on ${longDate(dateOf(e.start))}.`)
  }

  // ---- moving, resizing, deleting (every one has an Undo toast)
  const commitMove = async (e: ScheduleEvent, start: string, end: string, how: 'move' | 'resize' = 'move') => {
    const before = { start: e.start, end: e.end }
    await eventsService.update(e.id, { start, end })
    const clash = findConflicts({ ...e, start, end }, feed.events)
    const when = e.allDay ? longDate(dateOf(start)) : `${longDate(dateOf(start))}, ${fmtTime(start)} – ${fmtTime(end)}`
    undoToast(`${how === 'resize' ? 'Resized' : 'Moved'} ${e.title}`, `${when}${clash.length ? `. Overlaps with ${clash[0].title}.` : ''}`, () => { void eventsService.update(e.id, before).then(() => announce(`Undone. ${e.title} is back where it was.`)) })
    announce(`${how === 'resize' ? 'Resized' : 'Moved'} ${e.title} to ${when}.${clash.length ? ` It overlaps with ${clash[0].title}.` : ''} Undo is available.`)
  }
  const removeEvent = async (e: ScheduleEvent) => {
    await eventsService.delete(e.id)
    setPop(null)
    if (openId === e.id) navigate(`/calendar${location.search}`)
    toast({ type: 'info', title: `Deleted ${e.title}`, action: { label: 'Undo', onClick: () => { void eventsService.restore(e.id).then(() => announce(`Restored ${e.title}.`)) } } })
    announce(`Deleted ${e.title}. Undo is available.`)
  }
  const duplicate = async (e: ScheduleEvent) => {
    const copy = await eventsService.create({ title: `Copy of ${e.title}`, type: e.type, start: e.start, end: e.end, allDay: e.allDay, platform: e.platform, location: e.location, attendees: e.attendees, links: e.links, description: e.description, ownerId: e.ownerId })
    setPop(null)
    toast({ type: 'success', title: 'Event duplicated', message: copy.title, action: { label: 'Undo', onClick: () => { void eventsService.delete(copy.id) } } })
    announce(`Duplicated ${e.title}.`)
  }

  // ---- derived items (deal close dates, contact follow-ups)
  const openDerived = (x: DerivedItem) => navigate(x.recordType === 'deal' ? `/deals/${x.recordId}` : `/contacts/${x.recordId}`)
  const markContacted = async (x: DerivedItem) => {
    const c = await contactsService.get(x.recordId)
    if (!c) return
    const before = c.lastContactedAt
    await contactsService.update(c.id, { lastContactedAt: `${DEMO_TODAY}T${demoNow().toTimeString().slice(0, 8)}` })
    undoToast(`Marked ${c.name} as contacted`, 'Last contacted is now today.', () => { void contactsService.update(c.id, { lastContactedAt: before }).then(() => announce(`Undone. ${c.name}’s last contacted date is restored.`)) })
    announce(`Marked ${c.name} as contacted.`)
  }

  // ---- route drawer
  const { event: shownEvent } = useEvent(shownId)
  const closeDrawer = useCallback(() => navigate(`/calendar${location.search}`), [navigate, location.search])
  const viewEvent = useCallback((id: string) => { setPop(null); navigate(`/calendar/${id}${location.search}`) }, [navigate, location.search])
  const returnFocus = () => document.querySelector<HTMLElement>(`[data-event-id="${shownId}"]`) ?? document.querySelector<HTMLElement>('[data-calendar-fallback]')

  // ---- keyboard shortcuts
  const shortcuts = useRef({ view, shift, today, changeView, newEvent })
  useEffect(() => { shortcuts.current = { view, shift, today, changeView, newEvent } })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && t.closest('input, textarea, select, [contenteditable=true], [role=combobox], [role=listbox], [role=menu], [role=dialog]')) return
      const s = shortcuts.current
      const k = e.key.toLowerCase()
      const bodyish = !t || t === document.body || t.id === 'main'
      if (k === 't') s.today()
      else if (k === 'm') s.changeView('month')
      else if (k === 'w') s.changeView('week')
      else if (k === 'd') s.changeView('day')
      else if (k === 'a') s.changeView('agenda')
      else if (k === 'j' || (k === 'arrowright' && bodyish)) s.shift(1)
      else if (k === 'k' || (k === 'arrowleft' && bodyish)) s.shift(-1)
      else if (k === 'n') s.newEvent()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ---- pieces
  const popEvent = pop?.kind === 'event' ? visible.find((e) => e.id === pop.id) ?? null : null
  const popConflicts = useMemo(() => (popEvent ? findConflicts(popEvent, feed.events) : []), [popEvent, feed.events])
  const onScroll = (top: number) => { scrollRef.current = top; window.clearTimeout(scrollTimer.current); scrollTimer.current = window.setTimeout(() => saveCalendarPrefs({ scrollTop: top }), 300) }
  const slot = pop?.kind === 'quick' && pop.minutes !== null && (view === 'week' || view === 'day') ? { day: pop.day, minutes: pop.minutes } : null
  const days = view === 'day' ? [date] : weekDays(date)
  const isEmpty = feed.status === 'ready' && visible.length === 0 && derived.length === 0
  const sidebar = (
    <div className="flex flex-col gap-6">
      <MiniCalendar date={date} onPick={pickDate} />
      <LayersPanel layers={layers} onChange={(p) => { setLayers((l) => ({ ...l, ...p })); announce('Layers updated.') }} />
    </div>
  )
  const common = { selectedId: pop?.kind === 'event' ? pop.id : null, onOpenEvent: (id: string, el: HTMLElement) => { setPop({ kind: 'event', id, anchor: el }) }, onDerivedOpen: openDerived, onDerivedContacted: (x: DerivedItem) => { void markContacted(x) }, onAnnounce: announce, onGoDay: goDay }

  let body
  if (feed.status === 'error') body = (
    <div className="grid h-full place-items-center rounded-lg border border-border bg-surface" data-calendar-fallback tabIndex={-1}>
      <EmptyState tone="danger" icon={TriangleAlert} title="We could not load your calendar" description="Check your connection and try again." action={<Button onClick={() => { navigate('/calendar', { replace: true }); feed.reload() }}>Retry</Button>} />
    </div>
  )
  else if (feed.status === 'loading') body = <CalendarSkeleton view={view} />
  else if (view === 'agenda') body = isEmpty ? (
    <div className="grid h-full place-items-center rounded-lg border border-border bg-surface" data-calendar-fallback tabIndex={-1}>
      <EmptyState icon={CalendarOff} title="Nothing scheduled" description="Nothing scheduled. Click a time slot or New event to add one." action={<Button variant="primary" onClick={newEvent}>New event</Button>} />
    </div>
  ) : <AgendaView days={monthGrid(date).filter((d) => d >= range.from && d <= range.to)} events={visible} derived={derived} selectedId={common.selectedId} onOpenEvent={common.onOpenEvent} onDerivedOpen={openDerived} onDerivedContacted={common.onDerivedContacted} />
  else if (view === 'month') body = (
    <MonthView date={date} events={visible} derived={derived} selectedId={common.selectedId} slotDay={pop?.kind === 'quick' ? pop.day : null} anchorRef={(el) => { if (el) monthAnchor.current = el }}
      onOpenEvent={common.onOpenEvent} onCreateAt={(d, el) => quickAt(d, null, el)} onOpenMore={(d, el) => setPop({ kind: 'more', day: d, anchor: el })} onMove={(e, s, en) => { void commitMove(e, s, en) }} onDelete={(e) => { void removeEvent(e) }}
      onAnnounce={announce} onGoDay={goDay} onDerivedOpen={openDerived} onDerivedContacted={common.onDerivedContacted} />
  )
  else body = (
    <TimeGrid days={days} events={visible} derived={derived} selectedId={common.selectedId} slot={slot} ghostRef={setGhostEl} now={now} initialScroll={initialScroll} onScroll={onScroll}
      onOpenEvent={common.onOpenEvent} onCreateAt={(d, m, el) => quickAt(d, m, el)} onMove={(e, s, en, how) => { void commitMove(e, s, en, how) }} onDelete={(e) => { void removeEvent(e) }}
      onAnnounce={announce} onGoDay={goDay} onDerivedOpen={openDerived} onDerivedContacted={common.onDerivedContacted} />
  )

  const quickAnchor = pop?.kind === 'quick' ? (slot ? ghostEl : pop.anchor) : null
  const drawerBody = shownId === null ? null : shownEvent === undefined ? <div role="status" aria-busy="true" aria-label="Loading event" className="flex flex-col gap-3 p-6"><SkeletonLine className="h-6 w-56" /><SkeletonBlock className="h-40" /></div> : shownEvent === null ? (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h2 className="text-base font-medium">We couldn’t find that event</h2>
      <p className="max-w-72 text-sm leading-4.25 text-text-secondary">No event matches “{shownId}”. It may have been removed, or the link is wrong.</p>
      <Button variant="primary" onClick={closeDrawer}>Back to calendar</Button>
    </div>
  ) : shownEvent.deletedAt ? (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h2 className="text-base font-medium">This event was deleted</h2>
      <p className="max-w-72 text-sm leading-4.25 text-text-secondary">“{shownEvent.title}” is in the trash. You can bring it back.</p>
      <div className="flex gap-2"><Button onClick={closeDrawer}>Close</Button><Button variant="primary" onClick={() => { void eventsService.restore(shownEvent.id) }}>Restore event</Button></div>
    </div>
  ) : <EventDrawerBody key={shownEvent.id} event={shownEvent} onClose={closeDrawer} onDuplicate={(e) => { void duplicate(e) }} onDelete={(e) => { void removeEvent(e) }} onViewConflict={viewEvent} />

  return (
    <div className="flex min-h-0 flex-1 gap-4" data-calendar-page>
      <aside aria-label="Calendar navigation" className="w-60 shrink-0 overflow-y-auto rounded-lg border border-border bg-surface p-4 max-lg:hidden">{sidebar}</aside>
      <section aria-label="Calendar" className="flex min-w-0 flex-1 flex-col gap-3">
        <CalendarToolbar view={view} date={date} onToday={today} onShift={shift} onView={changeView} onNew={newEvent} sidebarTrigger={!wide ? <MobileSidebar>{sidebar}</MobileSidebar> : undefined} />
        <div className="relative min-h-0 flex-1" data-calendar-fallback tabIndex={-1} role="region" aria-label={`${view} view, ${rangeTitleFor(view, date)}`}>
          <div key={`${view}-${view === 'day' ? date : view === 'week' ? days[0] : date.slice(0, 7)}`} className={dir === 'right' ? 'h-full animate-slide-in-right' : dir === 'left' ? 'h-full animate-slide-in-left' : 'h-full'}>{body}</div>
          {isEmpty && view !== 'agenda' && feed.status === 'ready' && <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm text-text-secondary" data-empty-range>Nothing scheduled. Click a time slot or New event to add one.</p>}
        </div>
      </section>
      <div role="status" aria-live="polite" className="sr-only" data-calendar-announcer>{announcement}</div>

      <QuickCreatePopover key={pop?.kind === 'quick' ? pop.key : 'q'} open={pop?.kind === 'quick'} anchor={quickAnchor} initial={pop?.kind === 'quick' ? pop.draft : blankDraft()} onClose={() => setPop(null)} onCreate={(d) => { void createFromDraft(d) }} onMore={(d) => openForm(d)} onViewConflict={viewEvent} />
      <EventPopover event={popEvent} anchor={pop?.kind === 'event' ? pop.anchor : null} conflicts={popConflicts} onClose={() => setPop(null)} onEdit={(e) => openForm(toDraft(e), e.id)} onDuplicate={(e) => { void duplicate(e) }} onDelete={(e) => { void removeEvent(e) }} onOpenFull={(e) => viewEvent(e.id)} onViewConflict={viewEvent} />
      <MorePopover day={pop?.kind === 'more' ? pop.day : null} anchor={pop?.kind === 'more' ? pop.anchor : null} events={visible} derived={derived} onClose={() => setPop(null)} onOpenEvent={(id, el) => setPop({ kind: 'event', id, anchor: el })} onDerivedOpen={openDerived} />
      {form && (
        <EventFormModal key={form.key} open initial={form.initial} editingId={form.editingId} onClose={() => setForm(null)} onViewConflict={viewEvent}
          onSaved={(e, created) => { setForm(null); toast({ type: 'success', title: created ? 'Event created' : 'Event updated', message: `${e.title}, ${eventTimeText(e)}`, action: created ? { label: 'Undo', onClick: () => { void eventsService.delete(e.id) } } : undefined }); announce(`${created ? 'Created' : 'Updated'} ${e.title}.`) }} />
      )}
      <Drawer open={Boolean(openId)} onClose={closeDrawer} title={shownEvent ? `Event details: ${shownEvent.title}` : 'Event details'} returnFocus={returnFocus}>{drawerBody}</Drawer>
    </div>
  )
}

const rangeTitleFor = (view: CalendarViewMode, date: string): string => (view === 'day' ? longDate(date) : view === 'week' ? `week of ${longDate(weekDays(date)[0])}` : date.slice(0, 7))

function MobileSidebar({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [el, setEl] = useState<HTMLButtonElement | null>(null)
  const anchorRef = useMemo(() => ({ current: el }), [el])
  return (
    <>
      <button ref={setEl} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium shadow-button outline-none transition-colors duration-hover ease-out hover:border-border-strong hover:bg-surface-subtle focus-ring motion-reduce:transition-none"><CalendarDays aria-hidden className="size-5" strokeWidth={1.75} />Calendar</button>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={anchorRef} role="dialog" label="Mini calendar and layers"><div className="w-72 rounded-lg border border-border bg-surface p-4 shadow-hover">{children}</div></Popover>
    </>
  )
}

function CalendarSkeleton({ view }: { view: CalendarViewMode }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading calendar" className="grid h-full grid-rows-[auto_1fr] overflow-hidden rounded-lg border border-border bg-surface">
      <div className="grid grid-cols-7 border-b border-border bg-surface-subtle">{Array.from({ length: 7 }, (_, i) => <div key={i} className="p-3"><SkeletonLine className="w-8" /></div>)}</div>
      <div className={view === 'month' ? 'grid grid-cols-7 grid-rows-5' : 'grid grid-cols-7'}>
        {Array.from({ length: view === 'month' ? 35 : 7 }, (_, i) => <div key={i} className="flex flex-col gap-2 border-b border-l border-border p-2"><SkeletonLine className="h-3 w-6" />{i % 3 !== 1 && <SkeletonBlock className="h-5" />}{i % 4 === 0 && <SkeletonBlock className="h-5" />}</div>)}
      </div>
    </div>
  )
}

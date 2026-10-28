import { BellRing, Check, Handshake } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import { cn } from '../../lib/cn'
import { DEMO_TODAY, addDays, toLocalISO } from '../../lib/dates'
import { CalendarDay } from '../ui/CalendarDay'
import { HOUR_PX, SNAP, TZ_LABEL, dateOf, eventTimeText, eventsOn, fmtTime, hourLabel, layoutDay, longDate, minutesOf, parseLocal, segmentOf, snap, weekdayShort, withMinutes } from '../../lib/calendarLogic'
import { typeMeta } from './eventMeta'
import { useKeyboardMove } from './useKeyboardMove'
import type { DerivedItem, ScheduleEvent } from '../../types'

// Week and Day views: sticky header with the timezone label and an all-day row, a 24-hour grid (8am to 7pm visible, scrolls beyond),
// a current-time line, overlapping events side by side, drag to move, drag the bottom edge to resize (15-minute snapping), live time while dragging.
export interface TimeGridProps {
  days: string[]
  events: ScheduleEvent[]
  derived: DerivedItem[]
  selectedId: string | null
  slot: { day: string; minutes: number } | null
  ghostRef: (el: HTMLDivElement | null) => void
  now: Date
  initialScroll: number
  onScroll: (top: number) => void
  onOpenEvent: (id: string, el: HTMLElement) => void
  onCreateAt: (day: string, minutes: number | null, el: HTMLElement) => void
  onMove: (e: ScheduleEvent, start: string, end: string, how: 'move' | 'resize') => void
  onDelete: (e: ScheduleEvent) => void
  onAnnounce: (msg: string) => void
  onGoDay: (day: string) => void
  onDerivedOpen: (item: DerivedItem) => void
  onDerivedContacted: (item: DerivedItem) => void
}

interface DragState { id: string; mode: 'move' | 'resize'; x0: number; y0: number; colW: number; orig: { start: string; end: string }; start: string; end: string; moved: boolean }

const shiftMinutes = (iso: string, m: number): string => toLocalISO(new Date(parseLocal(iso).getTime() + m * 60_000))

export function TimeGrid({ days, events, derived, selectedId, slot, ghostRef, now, initialScroll, onScroll, onOpenEvent, onCreateAt, onMove, onDelete, onAnnounce, onGoDay, onDerivedOpen, onDerivedContacted }: TimeGridProps) {
  const scroller = useRef<HTMLDivElement>(null)
  const cols = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const suppressClick = useRef(false)
  const commit = useCallback((e: ScheduleEvent, start: string, end: string) => onMove(e, start, end, parseLocal(end).getTime() !== parseLocal(e.end).getTime() && parseLocal(start).getTime() === parseLocal(e.start).getTime() ? 'resize' : 'move'), [onMove])
  const kb = useKeyboardMove('time', commit, onAnnounce)
  // Moving to another day re-creates the event element in a different column: keep focus on it while it is picked up.
  const pickedId = kb.picked?.id
  const pickedStart = kb.picked?.start
  useEffect(() => { if (pickedId) scroller.current?.querySelector<HTMLElement>(`[data-event-id="${pickedId}"]`)?.focus({ preventScroll: true }) }, [pickedId, pickedStart])

  useLayoutEffect(() => { if (scroller.current) scroller.current.scrollTop = initialScroll >= 0 ? initialScroll : 8 * HOUR_PX }, [initialScroll])

  // ---- pointer drag / resize
  const begin = (ev: RPointerEvent, e: ScheduleEvent, mode: 'move' | 'resize') => {
    if (ev.button !== 0 || e.allDay) return
    const colW = (cols.current?.getBoundingClientRect().width ?? 700) / days.length
    const d: DragState = { id: e.id, mode, x0: ev.clientX, y0: ev.clientY, colW, orig: { start: e.start, end: e.end }, start: e.start, end: e.end, moved: false }
    dragRef.current = d
    setDrag(d)
    if (mode === 'resize') ev.stopPropagation()
  }
  useEffect(() => {
    if (!drag) return undefined
    const move = (ev: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const dx = ev.clientX - d.x0, dy = ev.clientY - d.y0
      if (!d.moved && Math.hypot(dx, dy) < 5) return
      const dMin = snap((dy / HOUR_PX) * 60)
      let start = d.orig.start, end = d.orig.end
      if (d.mode === 'move') {
        const dDays = Math.round(dx / d.colW)
        const dur = Math.round((parseLocal(d.orig.end).getTime() - parseLocal(d.orig.start).getTime()) / 60000)
        const day0 = dateOf(d.orig.start)
        const minStart = Math.max(0, Math.min(24 * 60 - dur, minutesOf(d.orig.start) + dMin))
        const targetDay = addDays(day0, dDays)
        const first = days[0], last = days[days.length - 1]
        const day = targetDay < first ? first : targetDay > last ? last : targetDay
        start = withMinutes(day, minStart)
        end = shiftMinutes(start, dur)
      } else {
        const sMin = minutesOf(d.orig.start)
        const eMin = Math.max(sMin + SNAP, Math.min(24 * 60 - 1, snap(minutesOf(d.orig.end) + dMin)))
        end = withMinutes(dateOf(d.orig.start), eMin)
      }
      const next = { ...d, start, end, moved: true }
      dragRef.current = next
      setDrag(next)
    }
    const up = () => {
      const d = dragRef.current
      dragRef.current = null
      setDrag(null)
      if (!d || !d.moved) return
      suppressClick.current = true
      setTimeout(() => { suppressClick.current = false }, 0)
      const e = events.find((x) => x.id === d.id)
      if (e && (d.start !== d.orig.start || d.end !== d.orig.end)) onMove(e, d.start, d.end, d.mode)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.id, drag?.mode])

  const shown = events.map((e) => (drag?.id === e.id ? { ...e, start: drag.start, end: drag.end } : kb.picked?.id === e.id ? { ...e, start: kb.picked.start, end: kb.picked.end } : e))
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const todayCol = days.includes(DEMO_TODAY) ? DEMO_TODAY : null

  const slotAt = (ev: React.MouseEvent<HTMLElement>, day: string) => {
    const r = ev.currentTarget.getBoundingClientRect()
    const minutes = Math.max(0, Math.min(23 * 60 + 30, Math.floor(((ev.clientY - r.top) / HOUR_PX) * 2) * 30))
    onCreateAt(day, minutes, ev.currentTarget)
  }
  const grid = `repeat(${days.length}, minmax(0, 1fr))`

  return (
    <div ref={scroller} onScroll={(e) => onScroll(e.currentTarget.scrollTop)} className="relative h-full min-h-0 overflow-y-auto rounded-lg border border-border bg-surface shadow-card" data-time-scroll>
      <div className="sticky top-0 z-20 border-b border-border bg-surface">
        <div className="flex">
          <div className="flex w-14 shrink-0 items-end justify-center pb-2 text-center text-[10px] font-medium leading-3 text-text-secondary" data-timezone title={TZ_LABEL}>{TZ_LABEL.split(' · ')[1]}</div>
          <div className="grid flex-1" style={{ gridTemplateColumns: grid }}>
            {days.map((d) => (
              <div key={d} className="flex flex-col items-center gap-1 border-l border-border py-2">
                <span className="text-compact leading-4 text-text-secondary">{weekdayShort(d)}</span>
                <CalendarDay day={Number(d.slice(8))} today={d === DEMO_TODAY} label={longDate(d)} onClick={() => onGoDay(d)} />
              </div>
            ))}
          </div>
        </div>
        <p className="sr-only">Timezone {TZ_LABEL}</p>
        <div className="flex border-t border-border">
          <div className="flex w-14 shrink-0 items-start justify-center pt-2 text-[10px] font-medium leading-3 text-text-secondary">All day</div>
          <div className="grid flex-1" style={{ gridTemplateColumns: grid }} data-allday-row>
            {days.map((d) => (
              <div key={d} data-day={d} role="gridcell" aria-label={`${longDate(d)}, all-day items`} onClick={(e) => { if (e.target === e.currentTarget) onCreateAt(d, null, e.currentTarget) }} className="flex min-h-9 flex-col gap-0.5 border-l border-border p-0.5">
                {eventsOn(shown, d).filter((e) => e.allDay).map((e) => <AllDayChip key={e.id} e={e} selected={selectedId === e.id} onOpen={onOpenEvent} />)}
                {derived.filter((x) => x.date === d).map((x) => <DerivedChip key={x.id} item={x} onOpen={onDerivedOpen} onContacted={onDerivedContacted} />)}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative flex" style={{ height: 24 * HOUR_PX }}>
        <div className="relative w-14 shrink-0" aria-hidden>
          {Array.from({ length: 24 }, (_, h) => h > 0 && <span key={h} className="absolute right-2 -translate-y-1/2 text-[10px] font-medium leading-3 text-text-secondary" style={{ top: h * HOUR_PX }}>{hourLabel(h)}</span>)}
        </div>
        <div ref={cols} className="relative grid flex-1" style={{ gridTemplateColumns: grid }}>
          <div aria-hidden className="pointer-events-none absolute inset-0">
            {Array.from({ length: 24 }, (_, h) => <div key={h} className="absolute inset-x-0 border-t border-border" style={{ top: h * HOUR_PX }} />)}
          </div>
          {days.map((d) => {
            const placed = layoutDay(eventsOn(shown, d).filter((e) => !e.allDay), d)
            const count = placed.length + eventsOn(shown, d).filter((e) => e.allDay).length
            return (
              <div key={d} data-day={d} role="gridcell" aria-label={`${longDate(d)}, ${count} ${count === 1 ? 'event' : 'events'}`} onClick={(e) => { if (e.target === e.currentTarget) slotAt(e, d) }} className={cn('relative border-l border-border', d === DEMO_TODAY && 'bg-primary-soft/40')}>
                {slot && slot.day === d && <div ref={ghostRef} aria-hidden className="pointer-events-none absolute inset-x-0.5 rounded-md border border-dashed border-primary bg-primary-soft" style={{ top: (slot.minutes / 60) * HOUR_PX, height: HOUR_PX / 2 }} />}
                {placed.map(({ event: e, col, cols: n }) => {
                  const { top, height } = segmentOf(e, d)
                  const lifting = drag?.id === e.id || kb.picked?.id === e.id
                  return (
                    <TimedEvent
                      key={e.id}
                      e={e}
                      day={d}
                      style={{ top, height, left: `calc(${(col / n) * 100}% + 2px)`, width: `calc(${100 / n}% - 4px)` }}
                      selected={selectedId === e.id}
                      lifting={lifting}
                      onPointerDown={(ev) => begin(ev, e, 'move')}
                      onResizeDown={(ev) => begin(ev, e, 'resize')}
                      onClick={(el) => { if (!suppressClick.current && !kb.picked) onOpenEvent(e.id, el) }}
                      onKeyDown={(ev) => { if (!kb.onKeyDown(ev, e)) { if (ev.key === ' ') { ev.preventDefault(); onOpenEvent(e.id, ev.currentTarget as HTMLElement) } else if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); onDelete(e) } } }}
                    />
                  )
                })}
                {d === todayCol && (
                  <div role="img" aria-label={`Current time ${fmtTime(withMinutes(d, nowMin))}`} data-now-line className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: (nowMin / 60) * HOUR_PX }}>
                    <span className="-ml-1 size-2 shrink-0 rounded-full bg-danger" /><span className="h-0.5 flex-1 bg-danger" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function TimedEvent({ e, day, style, selected, lifting, onPointerDown, onResizeDown, onClick, onKeyDown }: { e: ScheduleEvent; day: string; style: React.CSSProperties; selected: boolean; lifting: boolean; onPointerDown: (ev: RPointerEvent) => void; onResizeDown: (ev: RPointerEvent) => void; onClick: (el: HTMLElement) => void; onKeyDown: (ev: React.KeyboardEvent<HTMLDivElement>) => void }) {
  const meta = typeMeta[e.type]
  const Icon = meta.icon
  const tall = (style.height as number) >= 40
  const cancelled = e.status === 'Cancelled'
  return (
    <div
      role="button"
      tabIndex={0}
      data-event-id={e.id}
      aria-roledescription="draggable event"
      aria-label={`${e.title}, ${e.type}, ${longDate(day)}, ${eventTimeText(e)}${e.platform ? `, ${e.platform}` : ''}${cancelled ? ', cancelled' : ''}. Press Enter to pick up and move, Space to open details.`}
      onPointerDown={onPointerDown}
      onClick={(ev) => onClick(ev.currentTarget)}
      onKeyDown={onKeyDown}
      className={cn(
        'group absolute z-[5] flex touch-none select-none flex-col gap-0.5 overflow-hidden rounded-md border-l-[3px] px-1.5 py-1 text-left text-xs leading-3.75 text-text-primary outline-none transition-[box-shadow,translate,background-color] duration-hover ease-out focus-ring motion-reduce:transition-none',
        meta.bar, meta.chip,
        lifting ? 'z-30 -translate-y-px cursor-grabbing overflow-visible shadow-drag ring-2 ring-primary motion-reduce:translate-y-0' : 'cursor-grab hover:shadow-hover',
        selected && !lifting && 'ring-2 ring-primary',
        cancelled && 'opacity-80',
      )}
      style={style}
    >
      <span className="flex items-start gap-1 font-medium"><Icon aria-hidden className={cn('mt-px size-3.5 shrink-0', meta.text)} strokeWidth={1.75} /><span className={cn('min-w-0 flex-1 truncate', cancelled && 'line-through')}>{e.title}</span>{e.status === 'Completed' && <Check aria-label="Completed" role="img" className="size-3.5 shrink-0 text-text-secondary" strokeWidth={2} />}</span>
      {lifting ? <span data-event-time className="pointer-events-none absolute -top-6 left-0 z-40 whitespace-nowrap rounded-sm bg-text-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground shadow-hover">{eventTimeText(e)}</span> : tall && <span className="truncate text-text-secondary" data-event-time>{cancelled ? 'Cancelled · ' : ''}{eventTimeText(e)}</span>}
      <span aria-hidden data-resize-handle onPointerDown={onResizeDown} className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize" />
    </div>
  )
}

export function AllDayChip({ e, selected, onOpen }: { e: ScheduleEvent; selected: boolean; onOpen: (id: string, el: HTMLElement) => void }) {
  const meta = typeMeta[e.type]
  const Icon = meta.icon
  return (
    <button type="button" data-event-id={e.id} onClick={(ev) => onOpen(e.id, ev.currentTarget)} aria-label={`${e.title}, ${e.type}, ${eventTimeText(e)}${e.status === 'Cancelled' ? ', cancelled' : ''}`} className={cn('flex w-full items-center gap-1 truncate rounded-sm border-l-[3px] px-1.5 py-0.5 text-left text-xs font-medium leading-3.75 text-text-primary outline-none transition-colors duration-hover ease-out focus-ring motion-reduce:transition-none', meta.bar, meta.chip, selected && 'ring-2 ring-primary')}>
      <Icon aria-hidden className={cn('size-3.5 shrink-0', meta.text)} strokeWidth={1.75} /><span className={cn('truncate', e.status === 'Cancelled' && 'line-through')}>{e.title}</span>
    </button>
  )
}

/** Read-only item from Deals (close date) or Contacts (follow-up due). Clicking opens the deal or contact. */
export function DerivedChip({ item, onOpen, onContacted }: { item: DerivedItem; onOpen: (i: DerivedItem) => void; onContacted: (i: DerivedItem) => void }) {
  const Icon = item.kind === 'deal-close' ? Handshake : BellRing
  return (
    <span className="group/d flex items-center gap-0.5 rounded-sm border border-dashed border-border-strong bg-surface" data-derived={item.kind}>
      <button type="button" data-derived-id={item.id} onClick={() => onOpen(item)} aria-label={`${item.kind === 'deal-close' ? 'Deal closes' : 'Follow-up due'}: ${item.title}${item.overdue ? ', overdue' : ''}. Opens the ${item.recordType}.`} className="flex min-w-0 flex-1 items-center gap-1 rounded-sm px-1.5 py-0.5 text-left text-xs font-medium leading-3.75 text-text-secondary outline-none transition-colors duration-hover ease-out hover:text-text-primary focus-ring motion-reduce:transition-none">
        <Icon aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} /><span className="truncate">{item.title}</span>{item.overdue && <span className="shrink-0 font-medium text-warning-foreground">Overdue</span>}
      </button>
      {item.kind === 'follow-up' && (
        <button type="button" aria-label={`Mark as contacted: ${item.title}`} title="Mark as contacted" onClick={() => onContacted(item)} className="grid size-5 shrink-0 place-items-center rounded-xs text-text-secondary opacity-0 outline-none transition-opacity duration-hover ease-out hover:text-success-strong focus-visible:opacity-100 group-hover/d:opacity-100 focus-ring motion-reduce:transition-none"><Check className="size-3.5" strokeWidth={2} /></button>
      )}
    </span>
  )
}


import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { cn } from '../../lib/cn'
import { DEMO_TODAY, addDays } from '../../lib/dates'
import { dateOf, eventTimeText, eventsOn, fmtTime, longDate, monthGrid, parseLocal, sameMonth } from '../../lib/calendarLogic'
import { toLocalISO } from '../../lib/dates'
import { CalendarDay } from '../ui/CalendarDay'
import { DerivedChip } from './TimeGrid'
import { typeMeta } from './eventMeta'
import { useKeyboardMove } from './useKeyboardMove'
import type { DerivedItem, ScheduleEvent } from '../../types'

// Month view: 6 weeks, events as chips (as many as fit, then "+N more"), today as the purple circle, drag a chip to another day to move it.
export interface MonthViewProps {
  date: string
  events: ScheduleEvent[]
  derived: DerivedItem[]
  selectedId: string | null
  slotDay: string | null
  anchorRef: (el: HTMLElement | null) => void
  onOpenEvent: (id: string, el: HTMLElement) => void
  onCreateAt: (day: string, el: HTMLElement) => void
  onOpenMore: (day: string, el: HTMLElement) => void
  onMove: (e: ScheduleEvent, start: string, end: string) => void
  onDelete: (e: ScheduleEvent) => void
  onAnnounce: (msg: string) => void
  onGoDay: (day: string) => void
  onDerivedOpen: (item: DerivedItem) => void
  onDerivedContacted: (item: DerivedItem) => void
}

// Cell geometry: padding 8 + day header 32 + gap; a chip line is 21px with a 2px gap; the "+N more" button is 24px.
const CELL_CHROME = 8 + 32 + 2
const CHIP_GAP = 2
const CHIP_STEP = 21 + CHIP_GAP
const MORE_H = 24
const HEAD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const shiftDays = (iso: string, d: number): string => toLocalISO(new Date(parseLocal(iso).getTime() + d * 86_400_000))

export function MonthView({ date, events, derived, selectedId, slotDay, anchorRef, onOpenEvent, onCreateAt, onOpenMore, onMove, onDelete, onAnnounce, onGoDay, onDerivedOpen, onDerivedContacted }: MonthViewProps) {
  const days = monthGrid(date)
  const [focusDay, setFocusDay] = useState(DEMO_TODAY.slice(0, 7) === date.slice(0, 7) ? DEMO_TODAY : date)
  const [drag, setDrag] = useState<{ id: string; over: string | null; x: number; y: number; moved: boolean } | null>(null)
  const dragRef = useRef(drag)
  const suppress = useRef(false)
  const commit = (e: ScheduleEvent, start: string, end: string) => onMove(e, start, end)
  const kb = useKeyboardMove('day', commit, onAnnounce)
  const grid = useRef<HTMLDivElement>(null)
  const firstRow = useRef<HTMLDivElement>(null)
  const [rowH, setRowH] = useState(120)
  useEffect(() => {
    const el = firstRow.current
    if (!el) return undefined
    const ro = new ResizeObserver(() => setRowH(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const pickedId = kb.picked?.id
  const pickedStart = kb.picked?.start
  useEffect(() => { if (pickedId) grid.current?.querySelector<HTMLElement>(`[data-event-id="${pickedId}"]`)?.focus({ preventScroll: true }) }, [pickedId, pickedStart])

  useEffect(() => {
    if (!drag) return undefined
    const move = (ev: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      if (!d.moved && Math.hypot(ev.clientX - d.x, ev.clientY - d.y) < 5) return
      const over = (document.elementFromPoint(ev.clientX, ev.clientY) as HTMLElement | null)?.closest<HTMLElement>('[data-day]')?.dataset.day ?? null
      const next = { ...d, over, moved: true, x: d.moved ? ev.clientX : d.x, y: d.moved ? ev.clientY : d.y }
      dragRef.current = next
      setDrag(next)
    }
    const up = () => {
      const d = dragRef.current
      dragRef.current = null
      setDrag(null)
      if (!d || !d.moved) return
      suppress.current = true
      setTimeout(() => { suppress.current = false }, 0)
      const e = events.find((x) => x.id === d.id)
      if (!e || !d.over || d.over === dateOf(e.start)) return
      const delta = Math.round((parseLocal(`${d.over}T00:00:00`).getTime() - parseLocal(`${dateOf(e.start)}T00:00:00`).getTime()) / 86_400_000)
      onMove(e, shiftDays(e.start, delta), shiftDays(e.end, delta))
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.id])

  const shown = events.map((e) => (kb.picked?.id === e.id ? { ...e, start: kb.picked.start, end: kb.picked.end } : e))
  const onCellKey = (ev: KeyboardEvent<HTMLDivElement>, day: string) => {
    if (ev.target !== ev.currentTarget) return
    const step = ev.key === 'ArrowLeft' ? -1 : ev.key === 'ArrowRight' ? 1 : ev.key === 'ArrowUp' ? -7 : ev.key === 'ArrowDown' ? 7 : 0
    if (step) {
      ev.preventDefault()
      const next = addDays(day, step)
      if (days.includes(next)) { setFocusDay(next); grid.current?.querySelector<HTMLElement>(`[data-day="${next}"]`)?.focus() }
    } else if (ev.key === 'Enter') { ev.preventDefault(); onCreateAt(day, ev.currentTarget) }
  }

  return (
    <div ref={grid} role="grid" aria-label={`Month of ${date.slice(0, 7)}`} className="grid h-full min-h-0 grid-rows-[auto_repeat(6,minmax(120px,1fr))] overflow-auto rounded-lg border border-border bg-surface shadow-card" data-month-grid>
      <div role="row" className="grid grid-cols-7 border-b border-border bg-surface-subtle">
        {HEAD.map((h) => <div key={h} role="columnheader" className="px-3 py-2 text-xs font-medium text-text-secondary">{h}</div>)}
      </div>
      {Array.from({ length: 6 }, (_, w) => (
        <div key={w} role="row" className="grid grid-cols-7" ref={w === 1 ? firstRow : undefined}>
          {days.slice(w * 7, w * 7 + 7).map((d) => {
            const list = eventsOn(shown, d)
            const items = derived.filter((x) => x.date === d)
            const total = list.length + items.length
            const muted = !sameMonth(d, date)
            const over = drag?.moved && drag.over === d
            // As many lines as the cell is tall; when there are more, the last line is the "+N more" button (24px, 13px text).
            const fits = Math.max(0, Math.floor((rowH - CELL_CHROME + CHIP_GAP) / CHIP_STEP))
            const slots = total <= fits ? total : Math.max(0, Math.floor((rowH - CELL_CHROME - MORE_H - CHIP_GAP + CHIP_GAP) / CHIP_STEP))
            const vis = list.slice(0, slots)
            const visItems = items.slice(0, Math.max(0, slots - vis.length))
            const hiddenCount = total - vis.length - visItems.length
            return (
              <div
                key={d}
                role="gridcell"
                data-day={d}
                tabIndex={d === focusDay ? 0 : -1}
                aria-label={`${longDate(d)}, ${total} ${total === 1 ? 'event' : 'events'}`}
                ref={slotDay === d ? anchorRef : undefined}
                onFocus={(e) => { if (e.target === e.currentTarget) setFocusDay(d) }}
                onKeyDown={(e) => onCellKey(e, d)}
                onClick={(e) => { if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.blank) onCreateAt(d, e.currentTarget) }}
                className={cn('flex min-h-0 cursor-pointer flex-col gap-0.5 overflow-hidden border-b border-l border-border p-1 outline-none transition-colors duration-hover ease-out first:border-l-0 focus-visible:ring-[1.5px] focus-visible:ring-inset focus-visible:ring-primary motion-reduce:transition-none', muted && 'bg-surface-subtle', slotDay === d && 'bg-primary-soft', over && 'bg-primary-soft ring-2 ring-inset ring-primary')}
              >
                <div data-blank="1" className="flex items-center justify-between">
                  <CalendarDay size="sm" day={Number(d.slice(8))} today={d === DEMO_TODAY} muted={muted} label={longDate(d)} onClick={() => onGoDay(d)} tabIndex={-1} />
                </div>
                {vis.map((e) => {
                  const meta = typeMeta[e.type]
                  const Icon = meta.icon
                  const lifting = drag?.id === e.id && drag.moved
                  return (
                    <div
                      key={e.id}
                      role="button"
                      tabIndex={0}
                      data-event-id={e.id}
                      aria-roledescription="draggable event"
                      aria-label={`${e.title}, ${e.type}, ${eventTimeText(e)}${e.status === 'Cancelled' ? ', cancelled' : ''}. Press Enter to pick up and move, Space to open details.`}
                      onPointerDown={(ev) => { if (ev.button !== 0) return; const d0 = { id: e.id, over: null, x: ev.clientX, y: ev.clientY, moved: false }; dragRef.current = d0; setDrag(d0) }}
                      onClick={(ev) => { if (!suppress.current && !kb.picked) onOpenEvent(e.id, ev.currentTarget) }}
                      onKeyDown={(ev) => { if (!kb.onKeyDown(ev, e)) { if (ev.key === ' ') { ev.preventDefault(); onOpenEvent(e.id, ev.currentTarget) } else if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); onDelete(e) } } }}
                      className={cn('flex min-w-0 cursor-grab touch-none select-none items-center gap-1 rounded-sm border-l-[3px] px-1.5 py-0.5 text-xs font-medium leading-3.75 text-text-primary outline-none transition-[box-shadow,translate] duration-hover ease-out focus-ring motion-reduce:transition-none', meta.bar, meta.chip, 'animate-fade-in', lifting || kb.picked?.id === e.id ? 'z-30 -translate-y-px cursor-grabbing shadow-drag ring-2 ring-primary motion-reduce:translate-y-0' : 'hover:shadow-hover', selectedId === e.id && 'ring-2 ring-primary')}
                    >
                      <Icon aria-hidden className={cn('size-3.5 shrink-0', meta.text)} strokeWidth={1.75} />
                      {!e.allDay && <span className="shrink-0 font-normal text-text-secondary">{fmtTime(e.start).replace(':00', '').replace(' ', '').toLowerCase()}</span>}
                      <span className={cn('truncate', e.status === 'Cancelled' && 'line-through')}>{e.title}</span>
                    </div>
                  )
                })}
                {visItems.map((x) => <DerivedChip key={x.id} item={x} onOpen={onDerivedOpen} onContacted={onDerivedContacted} />)}
                {hiddenCount > 0 && (
                  <button type="button" onClick={(ev) => onOpenMore(d, ev.currentTarget)} aria-label={`${hiddenCount} more on ${longDate(d)}`} className="flex h-6 w-fit shrink-0 items-center rounded-sm px-2 text-left text-compact font-medium text-primary outline-none transition-colors duration-hover ease-out hover:bg-primary-soft focus-ring motion-reduce:transition-none">
                    +{hiddenCount} more
                  </button>
                )}
              </div>
            )
          })}
        </div>
      ))}
      {drag?.moved && drag.over && <div aria-hidden className="pointer-events-none fixed z-[95] rounded-md bg-text-primary px-2 py-1 text-xs font-medium text-primary-foreground shadow-hover" style={{ left: drag.x + 12, top: drag.y + 12 }}>Move to {longDate(drag.over)}</div>}
    </div>
  )
}

import type { AttendeeRef, CalendarViewMode, EventRange, ScheduleEvent } from '../types'
import { addDays, DEMO_TODAY, formatShort, toISODate, toLocalISO } from './dates'

// Date and layout helpers for the calendar. All times are local wall-clock strings ("2025-10-20T09:30:00");
// the page shows the Asia/Manila (GMT+8) label, there is no timezone arithmetic.
export const SNAP = 15
export const HOUR_PX = 48
export const TZ_LABEL = 'Asia/Manila · GMT+8'

export const parseLocal = (iso: string): Date => {
  const [d, t = '00:00:00'] = iso.split('T')
  const [y, m, day] = d.split('-').map(Number)
  const [hh, mm, ss] = t.split(':').map(Number)
  return new Date(y, m - 1, day, hh, mm, ss || 0)
}
export const dateOf = (iso: string): string => iso.slice(0, 10)
export const minutesOf = (iso: string): number => { const [h, m] = iso.slice(11, 16).split(':').map(Number); return h * 60 + m }
export const withMinutes = (dayIso: string, minutes: number): string => `${dayIso}T${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:00`
export const snap = (minutes: number): number => Math.round(minutes / SNAP) * SNAP
export const clampMin = (m: number): number => Math.max(0, Math.min(24 * 60, m))

export const startOfWeek = (iso: string): string => { const d = parseLocal(`${iso}T00:00:00`); return addDays(iso, -d.getDay()) }
export const weekDays = (iso: string): string[] => { const s = startOfWeek(iso); return Array.from({ length: 7 }, (_, i) => addDays(s, i)) }
export const monthStart = (iso: string): string => `${iso.slice(0, 7)}-01`
/** Six weeks starting on the Sunday on or before the 1st. */
export const monthGrid = (iso: string): string[] => { const s = startOfWeek(monthStart(iso)); return Array.from({ length: 42 }, (_, i) => addDays(s, i)) }
export const addMonths = (iso: string, n: number): string => { const d = parseLocal(`${iso}T00:00:00`); const t = new Date(d.getFullYear(), d.getMonth() + n, 1); const dim = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate(); return toISODate(new Date(t.getFullYear(), t.getMonth(), Math.min(d.getDate(), dim))) }
export const sameMonth = (a: string, b: string): boolean => a.slice(0, 7) === b.slice(0, 7)
export const isToday = (iso: string): boolean => iso === DEMO_TODAY

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const weekdayShort = (iso: string): string => WEEKDAYS[parseLocal(`${iso}T00:00:00`).getDay()].slice(0, 3)
export const weekdayLong = (iso: string): string => WEEKDAYS[parseLocal(`${iso}T00:00:00`).getDay()]
export const monthName = (iso: string): string => MONTHS[Number(iso.slice(5, 7)) - 1]
export const longDate = (iso: string): string => `${weekdayLong(iso)}, ${monthName(iso)} ${Number(iso.slice(8, 10))}, ${iso.slice(0, 4)}`

/** "9:00 AM" */
export function fmtTime(iso: string): string {
  const m = minutesOf(iso)
  const h = Math.floor(m / 60)
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}
/** "9.00 am" (the Dashboard card's style) */
export function dashTime(iso: string): string {
  const m = minutesOf(iso)
  const h = Math.floor(m / 60)
  return `${h % 12 === 0 ? 12 : h % 12}.${String(m % 60).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`
}
export const hourLabel = (h: number): string => `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? 'AM' : 'PM'}`

export function eventTimeText(e: Pick<ScheduleEvent, 'start' | 'end' | 'allDay'>): string {
  if (e.allDay) return dateOf(e.start) === dateOf(e.end) ? 'All day' : `${formatShort(dateOf(e.start))} – ${formatShort(dateOf(e.end))}`
  return `${fmtTime(e.start)} – ${fmtTime(e.end)}`
}
export const durationMin = (e: Pick<ScheduleEvent, 'start' | 'end'>): number => Math.round((parseLocal(e.end).getTime() - parseLocal(e.start).getTime()) / 60000)

/** Range the views need for a view mode and anchor date. */
export function rangeFor(view: CalendarViewMode, date: string): EventRange {
  if (view === 'day') return { from: date, to: date }
  if (view === 'week') { const d = weekDays(date); return { from: d[0], to: d[6] } }
  if (view === 'agenda') return { from: monthStart(date), to: addDays(addMonths(monthStart(date), 1), -1) }
  const g = monthGrid(date)
  return { from: g[0], to: g[41] }
}
export function shiftDate(view: CalendarViewMode, date: string, dir: 1 | -1): string {
  if (view === 'day') return addDays(date, dir)
  if (view === 'week') return addDays(date, 7 * dir)
  return addMonths(date, dir)
}
export function rangeTitle(view: CalendarViewMode, date: string): string {
  if (view === 'day') return longDate(date)
  if (view === 'week') { const d = weekDays(date); const a = d[0], b = d[6]; return sameMonth(a, b) ? `${monthName(a)} ${Number(a.slice(8))} – ${Number(b.slice(8))}, ${b.slice(0, 4)}` : `${monthName(a).slice(0, 3)} ${Number(a.slice(8))} – ${monthName(b).slice(0, 3)} ${Number(b.slice(8))}, ${b.slice(0, 4)}` }
  return `${monthName(date)} ${date.slice(0, 4)}`
}

export const occursOn = (e: Pick<ScheduleEvent, 'start' | 'end' | 'allDay'>, day: string): boolean => dateOf(e.start) <= day && (e.allDay ? dateOf(e.end) >= day : dateOf(e.end) >= day && !(dateOf(e.end) === day && minutesOf(e.end) === 0 && dateOf(e.start) < day))
export const eventsOn = (events: ScheduleEvent[], day: string): ScheduleEvent[] => events.filter((e) => occursOn(e, day)).sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.localeCompare(b.start))

// ---- overlapping events side by side (each overlap cluster is split into equal columns)
export interface Placed { event: ScheduleEvent; col: number; cols: number }
export function layoutDay(timed: ScheduleEvent[], day: string): Placed[] {
  const seg = (e: ScheduleEvent) => ({ s: dateOf(e.start) < day ? 0 : minutesOf(e.start), e: dateOf(e.end) > day ? 24 * 60 : Math.max(minutesOf(e.end), minutesOf(e.start) + SNAP) })
  const list = [...timed].sort((a, b) => seg(a).s - seg(b).s || seg(b).e - seg(a).e)
  const out: Placed[] = []
  let cluster: Placed[] = []
  let clusterEnd = -1
  const flush = () => { const cols = Math.max(1, ...cluster.map((p) => p.col + 1)); for (const p of cluster) p.cols = cols; out.push(...cluster); cluster = [] }
  const colEnds: number[] = []
  for (const e of list) {
    const { s, e: end } = seg(e)
    if (s >= clusterEnd && cluster.length) { flush(); colEnds.length = 0 }
    let col = colEnds.findIndex((x) => x <= s)
    if (col < 0) { col = colEnds.length; colEnds.push(end) } else colEnds[col] = end
    cluster.push({ event: e, col, cols: 1 })
    clusterEnd = Math.max(clusterEnd, end)
  }
  if (cluster.length) flush()
  return out
}
export const segmentOf = (e: ScheduleEvent, day: string): { top: number; height: number } => {
  const s = dateOf(e.start) < day ? 0 : minutesOf(e.start)
  const end = dateOf(e.end) > day ? 24 * 60 : Math.max(minutesOf(e.end), s + SNAP)
  return { top: (s / 60) * HOUR_PX, height: Math.max(((end - s) / 60) * HOUR_PX, 18) }
}

// ---- conflicts: overlapping timed events that share an attendee (the owner counts as one)
const people = (e: Pick<ScheduleEvent, 'attendees' | 'ownerId'>): Set<string> => new Set([`owner:${e.ownerId}`, ...e.attendees.map((a: AttendeeRef) => `${a.kind}:${a.id}`)])
export function findConflicts(draft: Pick<ScheduleEvent, 'id' | 'start' | 'end' | 'allDay' | 'attendees' | 'ownerId'> , others: ScheduleEvent[]): ScheduleEvent[] {
  if (draft.allDay) return []
  const a = people(draft)
  const s = parseLocal(draft.start).getTime(), e = parseLocal(draft.end).getTime()
  return others.filter((o) => {
    if (o.id === draft.id || o.allDay || o.status === 'Cancelled' || o.deletedAt) return false
    const os = parseLocal(o.start).getTime(), oe = parseLocal(o.end).getTime()
    if (!(os < e && oe > s)) return false
    for (const p of people(o)) if (a.has(p)) return true
    return false
  })
}

export { toLocalISO, toISODate }

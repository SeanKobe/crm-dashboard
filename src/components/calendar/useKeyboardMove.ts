import { useCallback, useState, type KeyboardEvent } from 'react'
import { fmtTime, parseLocal, longDate } from '../../lib/calendarLogic'
import { toLocalISO } from '../../lib/dates'
import type { ScheduleEvent } from '../../types'

// Keyboard alternative to dragging: Enter picks an event up, arrows move it, Space (or Enter) drops it, Escape cancels.
// In a time grid Up / Down move by 15 minutes and Left / Right by a day (Shift + Up / Down resizes); in the month grid Left / Right
// move by a day and Up / Down by a week. Every step is announced.
export interface Picked { id: string; start: string; end: string; orig: { start: string; end: string } }
export type MoveMode = 'time' | 'day'

const describe = (mode: MoveMode, e: ScheduleEvent, start: string, end: string): string =>
  e.allDay || mode === 'day' ? `${e.title} on ${longDate(start.slice(0, 10))}.` : `${e.title}, ${longDate(start.slice(0, 10))}, ${fmtTime(start)} to ${fmtTime(end)}.`

const shift = (iso: string, minutes: number): string => toLocalISO(new Date(parseLocal(iso).getTime() + minutes * 60_000))

export function useKeyboardMove(mode: MoveMode, onCommit: (event: ScheduleEvent, start: string, end: string) => void, announce: (msg: string) => void) {
  const [picked, setPicked] = useState<Picked | null>(null)

  /** Returns true when the key was used (the caller should not treat it as a click). */
  const onKeyDown = useCallback((ev: KeyboardEvent, e: ScheduleEvent): boolean => {
    if (picked && picked.id === e.id) {
      const k = ev.key
      let dMin = 0
      let resize = 0
      if (mode === 'time') {
        if (k === 'ArrowUp') { if (ev.shiftKey) resize = -15; else dMin = -15 }
        else if (k === 'ArrowDown') { if (ev.shiftKey) resize = 15; else dMin = 15 }
        else if (k === 'ArrowLeft') dMin = -1440
        else if (k === 'ArrowRight') dMin = 1440
      } else {
        if (k === 'ArrowLeft') dMin = -1440
        else if (k === 'ArrowRight') dMin = 1440
        else if (k === 'ArrowUp') dMin = -7 * 1440
        else if (k === 'ArrowDown') dMin = 7 * 1440
      }
      if (dMin || resize) {
        ev.preventDefault()
        const start = dMin ? shift(picked.start, dMin) : picked.start
        let end = dMin ? shift(picked.end, dMin) : shift(picked.end, resize)
        if (resize && parseLocal(end).getTime() <= parseLocal(start).getTime()) end = picked.end
        setPicked({ ...picked, start, end })
        announce(describe(mode, e, start, end))
        return true
      }
      if (k === ' ' || k === 'Enter') {
        ev.preventDefault()
        ev.stopPropagation()
        const moved = picked.start !== picked.orig.start || picked.end !== picked.orig.end
        setPicked(null)
        // `e` may already show the previewed time: hand over the original so Undo goes back to where it started
        if (moved) onCommit({ ...e, start: picked.orig.start, end: picked.orig.end }, picked.start, picked.end)
        else announce(`${e.title} dropped where it was.`)
        return true
      }
      if (k === 'Escape') {
        ev.preventDefault()
        ev.stopPropagation()
        setPicked(null)
        announce(`Move cancelled. ${e.title} stays where it was.`)
        return true
      }
      return false
    }
    if (ev.key === 'Enter') {
      ev.preventDefault()
      setPicked({ id: e.id, start: e.start, end: e.end, orig: { start: e.start, end: e.end } })
      announce(`Picked up ${describe(mode, e, e.start, e.end)} Use the arrow keys to move it, Space to drop, Escape to cancel.`)
      return true
    }
    return false
  }, [picked, mode, onCommit, announce])

  return { picked, onKeyDown, cancel: () => setPicked(null) }
}

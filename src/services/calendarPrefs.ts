import { mirrorPref } from './userPrefs'
import { DEMO_TODAY } from '../lib/dates'
import type { CalendarLayers, CalendarPrefs, CalendarViewMode } from '../types'

// Calendar page preferences (view, current date, layer toggles, scroll position). Stays on the device.
const KEY = 'crm.calendar.prefs.v1'
export const defaultLayers: CalendarLayers = { mine: true, team: true, dealCloses: true, followUps: true }
const VIEWS: CalendarViewMode[] = ['month', 'week', 'day', 'agenda']

/** `narrow` picks Agenda instead of Month when nothing was saved yet (below 1024px). */
export function loadCalendarPrefs(narrow = false): CalendarPrefs {
  const base: CalendarPrefs = { view: narrow ? 'agenda' : 'month', date: DEMO_TODAY, layers: defaultLayers, scrollTop: -1 }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return base
    const p = JSON.parse(raw) as Partial<CalendarPrefs>
    return {
      view: p.view && VIEWS.includes(p.view) ? p.view : base.view,
      date: typeof p.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.date) ? p.date : base.date,
      layers: { ...defaultLayers, ...p.layers },
      scrollTop: typeof p.scrollTop === 'number' ? p.scrollTop : -1,
    }
  } catch {
    return base
  }
}

export function saveCalendarPrefs(patch: Partial<CalendarPrefs>): void {
  try { localStorage.setItem(KEY, JSON.stringify({ ...loadCalendarPrefs(), ...patch })) } catch { /* ignore */ }
  mirrorPref('calendar')
}

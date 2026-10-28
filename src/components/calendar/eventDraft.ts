import { DEMO_TODAY } from '../../lib/dates'
import { dateOf, withMinutes } from '../../lib/calendarLogic'
import type { AttendeeRef, EventLink, EventPlatform, EventStatus, EventType, NewEventInput, ScheduleEvent } from '../../types'
import { CURRENT_USER_ID } from '../../services/session'

// The form's working copy of an event: date and times are separate fields, which is how people edit them.
export interface EventDraft {
  title: string
  type: EventType
  date: string
  /** Last day, only used for all-day events. */
  endDate: string
  /** "HH:MM" */
  startTime: string
  endTime: string
  allDay: boolean
  platform: EventPlatform | null
  location: string
  attendees: AttendeeRef[]
  links: EventLink[]
  description: string
  status: EventStatus
  ownerId: string
}

const hhmm = (iso: string): string => iso.slice(11, 16)
export const toDraft = (e: ScheduleEvent): EventDraft => ({ title: e.title, type: e.type, date: dateOf(e.start), endDate: dateOf(e.end), startTime: hhmm(e.start), endTime: hhmm(e.end), allDay: e.allDay, platform: e.platform, location: e.location, attendees: e.attendees, links: e.links, description: e.description, status: e.status, ownerId: e.ownerId })

export function blankDraft(over: Partial<EventDraft> = {}): EventDraft {
  return { title: '', type: 'Meeting', date: DEMO_TODAY, endDate: DEMO_TODAY, startTime: '09:00', endTime: '10:00', allDay: false, platform: 'Google Meet', location: '', attendees: [], links: [], description: '', status: 'Scheduled', ownerId: CURRENT_USER_ID, ...over }
}

export interface DraftErrors { title?: string; date?: string; endDate?: string; startTime?: string; endTime?: string }

export function validateDraft(d: EventDraft): DraftErrors {
  const e: DraftErrors = {}
  if (!d.title.trim()) e.title = 'Enter a title for the event.'
  else if (d.title.trim().length > 120) e.title = 'Keep the title under 120 characters.'
  if (!d.date) e.date = 'Pick a date.'
  if (d.allDay) {
    if (!d.endDate) e.endDate = 'Pick the last day.'
    else if (d.date && d.endDate < d.date) e.endDate = 'The last day can’t be before the first day.'
  } else {
    if (!d.startTime) e.startTime = 'Pick a start time.'
    if (!d.endTime) e.endTime = 'Pick an end time.'
    else if (d.startTime && d.endTime <= d.startTime) e.endTime = 'End time must be after the start time.'
  }
  return e
}

/** The event fields a draft stands for (the draft must be valid). */
export function draftToPatch(d: EventDraft): NewEventInput {
  const start = d.allDay ? `${d.date}T00:00:00` : `${d.date}T${d.startTime}:00`
  const end = d.allDay ? `${d.endDate || d.date}T23:59:00` : `${d.date}T${d.endTime}:00`
  return { title: d.title.trim(), type: d.type, start, end, allDay: d.allDay, platform: d.platform, location: d.location.trim(), attendees: d.attendees, links: d.links, description: d.description, status: d.status, ownerId: d.ownerId }
}

/** A draft for a slot: `minutes` is the start, the event runs for `length` minutes. */
export function slotDraft(day: string, minutes: number, length = 30, over: Partial<EventDraft> = {}): EventDraft {
  const start = Math.min(minutes, 23 * 60 + 30)
  const end = Math.min(start + length, 24 * 60 - 1)
  return blankDraft({ date: day, endDate: day, startTime: withMinutes(day, start).slice(11, 16), endTime: withMinutes(day, end).slice(11, 16), ...over })
}
/** Default new event for a day: 1 hour, at 11:00 on the fixed today (the clock is 10:00), otherwise 09:00. */
export const defaultNewDraftFor = (day: string): EventDraft => slotDraft(day, day === DEMO_TODAY ? 11 * 60 : 9 * 60, 60)

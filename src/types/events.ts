import type { RecordType } from './notes'

export type EventType = 'Meeting' | 'Call' | 'Task' | 'Follow-up'
export type EventPlatform = 'Google Meet' | 'Slack' | 'Zoom' | 'In person' | 'Phone'
export type EventStatus = 'Scheduled' | 'Completed' | 'Cancelled'

/** An attendee is an owner (team member) or a contact, by id. Names are resolved when shown. */
export interface AttendeeRef {
  kind: 'owner' | 'contact'
  id: string
}

/** A record an event is linked to ({ type, id } only; the current name comes from services/records.ts). */
export interface EventLink {
  type: RecordType
  id: string
}

export interface ScheduleEvent {
  id: string
  title: string
  type: EventType
  /** Local date-time (YYYY-MM-DDTHH:mm:ss). For all-day events the time part is 00:00:00 on the first day. */
  start: string
  /** Local date-time. For all-day events: 23:59:00 on the last day. */
  end: string
  allDay: boolean
  platform: EventPlatform | null
  /** Free text: a room, an address or a dial-in. */
  location: string
  attendees: AttendeeRef[]
  links: EventLink[]
  description: string
  status: EventStatus
  /** Whose calendar it is on ("My events" vs "Team events"). */
  ownerId: string
  createdAt: string
  updatedAt: string
  /** Set while soft-deleted; restorable with `restore`. */
  deletedAt: string | null
}

export type NewEventInput = Partial<Omit<ScheduleEvent, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>> & Pick<ScheduleEvent, 'title' | 'start' | 'end'>
export type EventPatch = Partial<Omit<ScheduleEvent, 'id' | 'createdAt' | 'deletedAt'>>

export interface EventRange {
  /** ISO dates (YYYY-MM-DD), both inclusive. */
  from: string
  to: string
}

export type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda'
export interface CalendarLayers {
  mine: boolean
  team: boolean
  dealCloses: boolean
  followUps: boolean
}
export interface CalendarPrefs {
  view: CalendarViewMode
  /** ISO date the views are centred on. */
  date: string
  layers: CalendarLayers
  scrollTop: number
}

/** Read-only calendar items derived from deals (close dates) and contacts (follow-ups due). */
export interface DerivedItem {
  kind: 'deal-close' | 'follow-up'
  id: string
  /** ISO date (YYYY-MM-DD). */
  date: string
  title: string
  /** The linked deal or contact. */
  recordId: string
  recordType: 'deal' | 'contact'
  overdue: boolean
}

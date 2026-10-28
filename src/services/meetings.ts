import { companyId } from '../data/records'
import type { EventPlatform, EventStatus, RecordType, ScheduleEvent } from '../types'
import { contactsService } from './contacts'
import { dealsService } from './deals'
import { eventsService, subscribeEvents } from './events'
import { listRecords, subscribeRecords } from './records'
import { DEMO_TODAY } from '../lib/dates'

// The Meetings page: every Meeting-type event of the Calendar, each with the company or contact it belongs to. Reads the events, records, contacts and
// deals services, so a sales rep only gets their own meetings and the names they may see.
export interface MeetingLink { type: RecordType; id: string; name: string }
export interface Meeting {
  event: ScheduleEvent
  /** The company if one is linked (or follows from a linked deal or an attendee), else the linked contact. */
  linked: MeetingLink | null
}
export interface MeetingGroups { upcoming: Meeting[]; past: Meeting[] }
export const MEETING_STATUSES: EventStatus[] = ['Scheduled', 'Completed', 'Cancelled']
export const MEETING_PLATFORMS: EventPlatform[] = ['Google Meet', 'Zoom', 'Slack', 'In person', 'Phone']

export async function list(): Promise<Meeting[]> {
  const [events, records, contacts, deals] = await Promise.all([eventsService.listMeetings(), listRecords(), contactsService.all(), dealsService.list()])
  const byKey = new Map(records.map((r) => [`${r.type}:${r.id}`, r]))
  const contactCompany = new Map(contacts.map((c) => [c.id, c.company]))
  const dealCompany = new Map(deals.map((d) => [d.id, d.company]))
  const company = (name: string | undefined): MeetingLink | null => (name?.trim() ? { type: 'company', id: companyId(name), name: name.trim() } : null)
  const named = (type: RecordType, id: string): MeetingLink | null => { const r = byKey.get(`${type}:${id}`); return r && !r.deleted ? { type, id, name: r.name } : null }
  return events.map((event) => {
    const links = event.links
    const contactLink = links.find((l) => l.type === 'contact')
    const attendee = event.attendees.find((a) => a.kind === 'contact')
    const linked =
      (() => { const l = links.find((x) => x.type === 'company'); return l ? named('company', l.id) : null })() ??
      company(links.map((l) => (l.type === 'deal' ? dealCompany.get(l.id) : l.type === 'contact' ? contactCompany.get(l.id) : undefined)).find(Boolean)) ??
      company(attendee ? contactCompany.get(attendee.id) : undefined) ??
      (contactLink ? named('contact', contactLink.id) : null) ??
      (attendee ? named('contact', attendee.id) : null)
    return { event, linked }
  })
}

/** Upcoming = starts today (the app's fixed today, 2025-10-20) or later, soonest first. Past = earlier, most recent first. */
export function groupMeetings(meetings: Meeting[]): MeetingGroups {
  const up = meetings.filter((m) => m.event.start.slice(0, 10) >= DEMO_TODAY)
  const past = meetings.filter((m) => m.event.start.slice(0, 10) < DEMO_TODAY)
  return { upcoming: up.sort((a, b) => a.event.start.localeCompare(b.event.start)), past: past.sort((a, b) => b.event.start.localeCompare(a.event.start)) }
}

export function subscribeMeetings(fn: () => void): () => void {
  const a = subscribeEvents(fn)
  const b = subscribeRecords(fn)
  return () => { a(); b() }
}

export const meetingsService = { list, group: groupMeetings }

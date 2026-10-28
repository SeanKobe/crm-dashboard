import type { AttendeeRef, EventLink, EventPlatform, EventType, ScheduleEvent } from '../types'
import { contactId } from './records'

// 43 sample events from early October to late November 2025 around the fixed "today" (2025-10-20): the three Dashboard events
// plus meetings, calls, tasks and follow-ups. Attendees are owners (o1..o4) and contacts from the Contacts data.
const o = (id: string): AttendeeRef => ({ kind: 'owner', id })
const c = (name: string): AttendeeRef => ({ kind: 'contact', id: contactId(name) })
const deal = (id: string): EventLink => ({ type: 'deal', id })
const contact = (name: string): EventLink => ({ type: 'contact', id: contactId(name) })
const note = (id: string): EventLink => ({ type: 'note', id })

interface Seed {
  id: string
  date: string
  /** "HH:MM-HH:MM", or "all-day" / "all-day:YYYY-MM-DD" (last day). */
  time: string
  type: EventType
  title: string
  platform?: EventPlatform
  owner: string
  who?: AttendeeRef[]
  links?: EventLink[]
  desc?: string
  location?: string
  done?: boolean
  cancelled?: boolean
}

const MORE_ATTENDEES = ['Elena Fischer', 'Marcus Lee', 'Dana Whitfield', 'Tomás Rivera', 'Mina Park', 'Ravi Menon', 'Hannah Cho']

const seeds: Seed[] = [
  // the Dashboard calendar card's events (kept)
  { id: 'weekly', date: '2025-10-08', time: '09:00-10:00', type: 'Meeting', title: 'Mesh Weekly Meeting', platform: 'Google Meet', owner: 'o1', who: [o('o1'), o('o2'), o('o3'), ...MORE_ATTENDEES.map(c)], desc: 'Weekly sync on pipeline, blockers and next steps.', done: true },
  { id: 'demo', date: '2025-10-08', time: '10:45-11:45', type: 'Meeting', title: 'Gamification Demo', platform: 'Slack', owner: 'o4', who: [o('o4'), o('o3'), o('o2')], desc: 'Walk the team through the new gamification flow.', done: true },
  { id: 'sync', date: '2025-10-09', time: '13:00-13:30', type: 'Meeting', title: 'Pipeline Review', platform: 'Zoom', owner: 'o1', who: [o('o1'), o('o2'), c('Ingrid Larsen'), c('Grace Okafor'), c('Oliver Grant')], desc: 'Review the proposal stage.', done: true },
  // early October
  { id: 'e-01', date: '2025-10-01', time: '14:00-14:30', type: 'Call', title: 'Intro call with Elena Fischer', platform: 'Phone', owner: 'o2', who: [o('o2'), c('Elena Fischer')], links: [deal('d-101'), contact('Elena Fischer')], done: true },
  { id: 'e-02', date: '2025-10-02', time: 'all-day', type: 'Task', title: 'Quarter-end forecast', owner: 'o1', who: [o('o1')], desc: 'Update the forecast spreadsheet.', done: true },
  { id: 'e-03', date: '2025-10-03', time: '11:00-12:00', type: 'Meeting', title: 'Kestrel discovery', platform: 'Google Meet', owner: 'o1', who: [o('o1'), c('Dana Whitfield')], links: [deal('d-103')], done: true },
  { id: 'e-04', date: '2025-10-06', time: '10:00-10:30', type: 'Follow-up', title: 'Follow up: Harbor Logistics quote', platform: 'Phone', owner: 'o2', who: [o('o2'), c('Mina Park')], links: [deal('d-106')], done: true },
  { id: 'e-05', date: '2025-10-07', time: '15:00-16:00', type: 'Meeting', title: 'Sales enablement', platform: 'In person', owner: 'o3', who: [o('o3'), o('o4'), o('o1')], location: 'Room 4B, HQ', done: true },
  // week of the 13th
  { id: 'e-06', date: '2025-10-13', time: '09:30-10:00', type: 'Call', title: 'Cobalt Marine check-in', platform: 'Phone', owner: 'o4', who: [o('o4'), c('Ingrid Larsen')], links: [deal('d-116'), note('n-006')], done: true },
  { id: 'e-07', date: '2025-10-14', time: '13:00-14:00', type: 'Meeting', title: 'Pinecrest security review', platform: 'Zoom', owner: 'o2', who: [o('o2'), c('Alma Reyes'), o('o1')], links: [deal('d-111'), note('n-005')], done: true },
  { id: 'e-08', date: '2025-10-15', time: 'all-day:2025-10-16', type: 'Task', title: 'Prepare Q4 pricing deck', owner: 'o1', who: [o('o1'), o('o3')], desc: 'Two-day push to get the deck ready for the board.', done: true },
  { id: 'e-09', date: '2025-10-16', time: '16:00-16:30', type: 'Call', title: 'Orchid Foods intro', platform: 'Phone', owner: 'o1', who: [o('o1'), c('Kenji Sato')], links: [deal('d-113')], done: true },
  { id: 'e-10', date: '2025-10-17', time: '10:00-11:00', type: 'Meeting', title: 'Team retro', platform: 'Slack', owner: 'o3', who: [o('o1'), o('o2'), o('o3'), o('o4')], done: true },
  // today (2025-10-20) and the days around it, with conflicts
  { id: 'e-11', date: '2025-10-20', time: '10:00-10:30', type: 'Call', title: 'Acme renewal call', platform: 'Phone', owner: 'o1', who: [o('o1'), c('Avery Brooks')], links: [deal('d-105'), contact('Avery Brooks'), note('n-001')], desc: 'Confirm quarterly billing and the updated DPA.' },
  { id: 'e-12', date: '2025-10-20', time: '10:15-11:15', type: 'Meeting', title: 'Quarterly planning', platform: 'Google Meet', owner: 'o1', who: [o('o1'), o('o2'), o('o4')], desc: 'Plan Q4 targets by region.' },
  { id: 'e-13', date: '2025-10-20', time: '14:00-15:00', type: 'Meeting', title: 'Globex stakeholder workshop', platform: 'Zoom', owner: 'o1', who: [o('o1'), c('Jonas Weber')], links: [deal('d-109'), note('n-002')] },
  { id: 'e-14', date: '2025-10-20', time: '16:30-17:00', type: 'Task', title: 'Send Atlas redlines to legal', owner: 'o2', who: [o('o2')], links: [deal('d-114'), note('n-004')] },
  { id: 'e-15', date: '2025-10-21', time: '09:00-09:30', type: 'Follow-up', title: 'Follow up: Meridian sandbox terms', platform: 'Phone', owner: 'o1', who: [o('o1'), c('Oliver Grant')], links: [deal('d-117'), note('n-008')] },
  { id: 'e-16', date: '2025-10-21', time: '11:00-12:00', type: 'Meeting', title: 'Product demo for Brightside Schools', platform: 'Zoom', owner: 'o3', who: [o('o3'), c('Tom Hargrove')], links: [deal('d-115')] },
  { id: 'e-17', date: '2025-10-22', time: '14:00-15:00', type: 'Call', title: 'Atlas Freight legal call', platform: 'Phone', owner: 'o2', who: [o('o2'), c('Grace Okafor')], links: [deal('d-114')] },
  { id: 'e-18', date: '2025-10-22', time: '14:30-15:30', type: 'Meeting', title: 'Cobalt Marine contract review', platform: 'Google Meet', owner: 'o2', who: [o('o2'), c('Ingrid Larsen')], links: [deal('d-116')] },
  { id: 'e-19', date: '2025-10-23', time: 'all-day', type: 'Task', title: 'Pipeline hygiene day', owner: 'o4', who: [o('o4')], desc: 'Clean up stale deals and update next steps.' },
  { id: 'e-20', date: '2025-10-23', time: '13:00-13:45', type: 'Call', title: 'Vertex Mobility reset call', platform: 'Phone', owner: 'o4', who: [o('o4'), c('Chloe Martin')], links: [deal('d-112')] },
  { id: 'e-21', date: '2025-10-24', time: '10:00-11:00', type: 'Meeting', title: 'Lumen Retail discovery', platform: 'Google Meet', owner: 'o4', who: [o('o4'), o('o1'), c('Tomás Rivera')], links: [deal('d-104')] },
  { id: 'e-22', date: '2025-10-24', time: '15:30-16:00', type: 'Follow-up', title: 'Follow up: Quill Studio quote', platform: 'Phone', owner: 'o3', who: [o('o3'), c('Ravi Menon')], links: [deal('d-107')] },
  // late October
  { id: 'e-23', date: '2025-10-27', time: '09:30-10:30', type: 'Meeting', title: 'Mesh Weekly Meeting', platform: 'Google Meet', owner: 'o1', who: [o('o1'), o('o2'), o('o3'), o('o4')] },
  { id: 'e-24', date: '2025-10-28', time: '11:00-12:00', type: 'Meeting', title: 'Initech pilot kickoff', platform: 'In person', owner: 'o3', who: [o('o3'), c('Peter Gibbons')], links: [deal('d-110')], location: 'Initech HQ, Austin' },
  { id: 'e-25', date: '2025-10-28', time: '11:30-12:00', type: 'Call', title: 'Harbor Logistics expansion call', platform: 'Phone', owner: 'o2', who: [o('o2'), c('Mina Park'), o('o3')], links: [deal('d-106')] },
  { id: 'e-26', date: '2025-10-29', time: '15:00-16:00', type: 'Meeting', title: 'Board prep', platform: 'Slack', owner: 'o1', who: [o('o1'), o('o4')] },
  { id: 'e-27', date: '2025-10-30', time: 'all-day', type: 'Task', title: 'Month-end reporting', owner: 'o1', who: [o('o1')] },
  { id: 'e-28', date: '2025-10-31', time: '13:30-14:00', type: 'Follow-up', title: 'Follow up: Solstice audit review', platform: 'Phone', owner: 'o4', who: [o('o4'), c('Hannah Cho')], links: [deal('d-108')] },
  // November
  { id: 'e-29', date: '2025-11-03', time: '10:00-11:00', type: 'Meeting', title: 'Atlas Freight contract signing', platform: 'Zoom', owner: 'o2', who: [o('o2'), c('Grace Okafor'), o('o1')], links: [deal('d-114')] },
  { id: 'e-30', date: '2025-11-04', time: '14:00-14:30', type: 'Call', title: 'Kestrel pricing call', platform: 'Phone', owner: 'o1', who: [o('o1'), c('Dana Whitfield')], links: [deal('d-103')] },
  { id: 'e-31', date: '2025-11-05', time: '09:00-10:00', type: 'Meeting', title: 'Mesh Weekly Meeting', platform: 'Google Meet', owner: 'o1', who: [o('o1'), o('o2'), o('o3'), o('o4')] },
  { id: 'e-32', date: '2025-11-06', time: '11:00-12:00', type: 'Meeting', title: 'Meridian Bank sandbox walkthrough', platform: 'Zoom', owner: 'o1', who: [o('o1'), c('Oliver Grant')], links: [deal('d-117')] },
  { id: 'e-33', date: '2025-11-07', time: 'all-day', type: 'Task', title: 'Team offsite planning', owner: 'o3', who: [o('o3'), o('o4')] },
  { id: 'e-34', date: '2025-11-10', time: '10:00-10:45', type: 'Call', title: 'Globex term negotiation', platform: 'Phone', owner: 'o1', who: [o('o1'), c('Jonas Weber')], links: [deal('d-109')] },
  { id: 'e-35', date: '2025-11-12', time: '13:00-14:30', type: 'Meeting', title: 'Brightside Schools board presentation', platform: 'In person', owner: 'o3', who: [o('o3'), c('Tom Hargrove'), o('o1')], links: [deal('d-115')], location: 'Brightside District Office' },
  { id: 'e-36', date: '2025-11-13', time: '16:00-16:30', type: 'Follow-up', title: 'Follow up: Pinecrest security sign-off', platform: 'Phone', owner: 'o2', who: [o('o2'), c('Alma Reyes')], links: [deal('d-111')] },
  { id: 'e-37', date: '2025-11-17', time: '09:30-10:30', type: 'Meeting', title: 'Mesh Weekly Meeting', platform: 'Google Meet', owner: 'o1', who: [o('o1'), o('o2'), o('o3'), o('o4')] },
  { id: 'e-38', date: '2025-11-18', time: '14:00-15:00', type: 'Meeting', title: 'Lumen Retail pilot review', platform: 'Google Meet', owner: 'o4', who: [o('o4'), c('Tomás Rivera')], links: [deal('d-104')] },
  { id: 'e-39', date: '2025-11-20', time: '11:00-11:30', type: 'Call', title: 'Orchid Foods integration call', platform: 'Phone', owner: 'o1', who: [o('o1'), c('Kenji Sato')], links: [deal('d-113')] },
  { id: 'e-40', date: '2025-11-24', time: 'all-day:2025-11-25', type: 'Task', title: 'Year-end pipeline cleanup', owner: 'o4', who: [o('o4'), o('o2')] },
  { id: 'e-41', date: '2025-11-26', time: '10:00-11:00', type: 'Meeting', title: 'Q4 results preview', platform: 'Slack', owner: 'o1', who: [o('o1'), o('o2'), o('o3'), o('o4')] },
  { id: 'e-42', date: '2025-11-27', time: '15:00-15:30', type: 'Follow-up', title: 'Follow up: Quill Studio renewal', platform: 'Phone', owner: 'o3', who: [o('o3'), c('Ravi Menon')], links: [deal('d-107')], cancelled: true },
]

export function seedEvents(): ScheduleEvent[] {
  return seeds.map((s) => {
    const allDay = s.time.startsWith('all-day')
    const [from, to] = allDay ? ['00:00', '23:59'] : s.time.split('-')
    const endDate = s.time.startsWith('all-day:') ? s.time.split(':')[1] : s.date
    const stamp = `${s.date.slice(0, 8)}01T08:00:00`
    return {
      id: s.id,
      title: s.title,
      type: s.type,
      start: `${s.date}T${from}:00`,
      end: `${endDate}T${to}:00`,
      allDay,
      platform: s.platform ?? null,
      location: s.location ?? '',
      attendees: s.who ?? [],
      links: s.links ?? [],
      description: s.desc ?? '',
      status: s.cancelled ? 'Cancelled' : s.done ? 'Completed' : 'Scheduled',
      ownerId: s.owner,
      createdAt: stamp,
      updatedAt: stamp,
      deletedAt: null,
    }
  })
}

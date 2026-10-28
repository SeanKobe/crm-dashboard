import type { Note, NoteLink } from '../types'
import { DEMO_TODAY, addDays } from '../lib/dates'
import { companyId, contactId } from './records'

// 14 sample notes spread over the weeks before the fixed demo "today" (2025-10-20), linked to deals, contacts and companies from the mock data.
const at = (daysAgo: number, time: string): string => `${addDays(DEMO_TODAY, -daysAgo)}T${time}:00`
const deal = (id: string): NoteLink => ({ type: 'deal', id })
const contact = (name: string): NoteLink => ({ type: 'contact', id: contactId(name) })
const company = (name: string): NoteLink => ({ type: 'company', id: companyId(name) })
const ul = (items: string[]): string => `<ul>${items.map((i) => `<li><p>${i}</p></li>`).join('')}</ul>`
const ol = (items: string[]): string => `<ol>${items.map((i) => `<li><p>${i}</p></li>`).join('')}</ol>`
const tasks = (items: [string, boolean][]): string => `<ul data-type="taskList">${items.map(([t, done]) => `<li data-checked="${done}" data-type="taskItem"><p>${t}</p></li>`).join('')}</ul>`

interface Seed {
  n: number
  title: string
  body: string
  tags: string[]
  pinned?: boolean
  link: NoteLink | null
  created: [number, string]
  updated: [number, string]
}

const seeds: Seed[] = [
  { n: 1, title: 'Acme renewal call', pinned: true, tags: ['call', 'renewal'], link: deal('d-105'), created: [6, '14:10'], updated: [0, '09:42'],
    body: `<h2>Summary</h2><p>Avery confirmed Acme wants to renew, but the quarterly billing option is a must.</p><h2>Discussion</h2>${ul(['Current seat count is 120, growing to 150 by January', 'Legal needs the updated DPA before signing', 'Decision expected by Friday'])}<h2>Next steps</h2>${tasks([['Send the quarterly billing quote', true], ['Share the updated DPA', false], ['Book a check-in for Thursday', false]])}` },
  { n: 2, title: 'Globex upsell: stakeholder map', pinned: true, tags: ['meeting', 'strategy'], link: deal('d-109'), created: [9, '11:00'], updated: [1, '16:20'],
    body: `<h2>Who decides</h2>${ul(['Jonas Weber, VP Operations (sponsor)', 'Finance lead signs off above $40,000', 'IT only needs to review SSO'])}<h2>Risks</h2><p>The 12 month term is the sticking point. Offer a 6 month ramp with an option to extend.</p>` },
  { n: 3, title: 'Pricing objections playbook', pinned: true, tags: ['idea', 'pricing'], link: null, created: [21, '10:30'], updated: [4, '13:05'],
    body: `<h2>Common objections</h2>${ol(['It is too expensive: anchor on time saved per rep', 'We already have a tool: show the migration plan', 'Not this quarter: offer a ramped start'])}<p>Review with the team on Monday.</p>` },
  { n: 4, title: 'Atlas Freight legal redlines', tags: ['follow-up', 'legal'], link: deal('d-114'), created: [5, '15:45'], updated: [0, '08:05'],
    body: `<p>Grace sent back the MSA with redlines on liability and data retention.</p>${tasks([['Ask legal to review clause 9', false], ['Confirm the 30 day data retention window', false], ['Reply to Grace by Wednesday', false]])}` },
  { n: 5, title: 'Pinecrest security review prep', tags: ['security', 'meeting'], link: deal('d-111'), created: [8, '09:15'], updated: [2, '17:30'],
    body: `<h2>Agenda</h2>${ul(['SOC 2 report walkthrough', 'Data residency options', 'Audit log retention'])}<p>Bring the HIPAA addendum. Dr. Reyes wants to see the breach notification process.</p>` },
  { n: 6, title: 'Call with Ingrid Larsen', tags: ['call'], link: contact('Ingrid Larsen'), created: [3, '10:20'], updated: [3, '10:55'],
    body: `<p>Verbal yes on the telemetry package. Waiting on procurement paperwork.</p>${ul(['PO expected within the week', 'Wants onsite training in November'])}` },
  { n: 7, title: 'Lumen Retail rollout ideas', tags: ['idea'], link: company('Lumen Retail'), created: [2, '12:00'], updated: [2, '12:40'],
    body: `<p>Start with 5 pilot stores, then roll out by region. A store manager dashboard could be the hook.</p>${ul(['Pilot: Northeast region', 'Success metric: weekly active managers', 'Training: 30 minute video'])}` },
  { n: 8, title: 'Meridian Bank sandbox terms', tags: ['meeting', 'legal'], link: deal('d-117'), created: [2, '15:00'], updated: [1, '09:10'],
    body: `<h2>Decisions</h2>${ul(['Sandbox runs for 60 days', 'No production data in the sandbox', 'Weekly check-in with Oliver'])}<h2>Action items</h2>${tasks([['Send the sandbox agreement', true], ['Provision the test tenant', false]])}` },
  { n: 9, title: 'Quarterly pipeline review', tags: ['meeting', 'strategy'], link: null, created: [13, '16:00'], updated: [13, '16:50'],
    body: `<p>Pipeline coverage is 3.1x for Q4. Proposal stage is the bottleneck.</p>${ul(['Add a proposal template with pricing tiers', 'Shorten legal review with pre-approved clauses', 'Target 20% more demos in November'])}` },
  { n: 10, title: 'Avery Brooks intro notes', tags: ['call', 'onboarding'], link: contact('Avery Brooks'), created: [19, '11:30'], updated: [12, '14:00'],
    body: `<p>Avery runs procurement at Acme. Prefers short emails and a single point of contact.</p>${ul(['Timezone: US Central', 'Best time to call: mornings', 'Reports to the COO'])}` },
  { n: 11, title: 'Webinar follow-up list', tags: ['follow-up', 'idea'], link: null, created: [15, '09:00'], updated: [11, '17:15'],
    body: `${tasks([['Email the 14 attendees with the recording', true], ['Tag hot leads in the CRM', true], ['Book 3 demos from the Q&A', false]])}<p>Attendance was higher than expected. Run the next one with a customer speaker.</p>` },
  { n: 12, title: 'Pinecrest Health account plan', tags: ['strategy'], link: company('Pinecrest Health'), created: [25, '13:20'], updated: [18, '10:10'],
    body: `<h2>Goals for the year</h2>${ol(['Land the platform deal', 'Expand to two more clinics', 'Reference customer by Q3'])}<p>Executive sponsor: Dr. Alma Reyes.</p>` },
  { n: 13, title: 'Cobalt Marine objections', tags: ['pricing', 'call'], link: deal('d-116'), created: [26, '14:40'], updated: [22, '11:25'],
    body: `<p>Ingrid thinks the hardware add-on is overpriced. We can bundle sensors at cost if they commit to two years.</p>${ul(['Offer: sensors at cost', 'Condition: 24 month term', 'Approval needed from finance'])}` },
  { n: 14, title: 'Onboarding checklist draft', tags: ['idea', 'onboarding'], link: null, created: [33, '10:00'], updated: [30, '15:30'],
    body: `<p>A shared checklist for new customers in the first 30 days.</p>${tasks([['Kickoff call within 3 days', false], ['Admin training session', false], ['First report delivered by day 14', false], ['30 day review', false]])}` },
]

export const seedNotes = (): Note[] =>
  seeds.map((s) => ({
    id: `n-${String(s.n).padStart(3, '0')}`,
    title: s.title,
    body: s.body,
    tags: s.tags,
    pinned: Boolean(s.pinned),
    link: s.link,
    createdAt: at(...s.created),
    updatedAt: at(...s.updated),
    deletedAt: null,
  }))

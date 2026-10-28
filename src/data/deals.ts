import type { ActivityKind, DealActivity, DealFilters, DealOwner, DealSort, LostReason, PipelineDeal, Priority, Stage, StageMeta } from '../types'
import { DEMO_TODAY, addDays } from '../lib/dates'
import { money } from '../lib/dealsLogic'
import { contactId } from './records'

export const owners: DealOwner[] = [
  { id: 'o1', name: 'Jordan Diaz', initial: 'J', tone: 'purple' },
  { id: 'o2', name: 'Priya Nair', initial: 'P', tone: 'green' },
  { id: 'o3', name: 'Luis Ortega', initial: 'L', tone: 'orange' },
  { id: 'o4', name: 'Sam Carter', initial: 'S', tone: 'amber' },
]

export const stages: StageMeta[] = [
  { id: 'new', label: 'New', hint: 'Fresh leads nobody has contacted yet' },
  { id: 'contacted', label: 'Contacted', hint: 'First conversation started' },
  { id: 'qualified', label: 'Qualified', hint: 'Budget, need and timing confirmed' },
  { id: 'proposal', label: 'Proposal', hint: 'Pricing proposal sent' },
  { id: 'won', label: 'Won', hint: 'Signed and closed' },
  { id: 'lost', label: 'Lost', hint: 'Closed without a deal' },
]
export const stageLabel = (id: Stage): string => stages.find((s) => s.id === id)?.label ?? id
export const OPEN_STAGES: Stage[] = ['new', 'contacted', 'qualified', 'proposal']
export const LOST_REASONS: LostReason[] = ['Price', 'Timing', 'Competitor', 'No response', 'Other']
export const priorityLabel: Record<Priority, string> = { high: 'High', medium: 'Medium', low: 'Low' }

export const defaultFilters: DealFilters = { query: '', owners: [], priorities: [], minValue: '', maxValue: '', closeFrom: '', closeTo: '', overdue: false, stages: [], stageFrom: '', stageTo: '' }
export const defaultSort: DealSort = { key: 'closeDate', dir: 'asc' }

// ---- Seed: compact rows expanded into full records below
const POOL: Record<Exclude<ActivityKind, 'stage' | 'won'>, string[]> = {
  call: ['Discussed renewal terms and next steps.', 'Walked through budget and timeline.', 'Left a voicemail and followed up by email.', 'Confirmed decision makers and process.'],
  email: ['Sent the updated proposal and pricing.', 'Shared the security questionnaire.', 'Followed up on the open questions.', 'Sent a recap with agreed next steps.'],
  meeting: ['Walked the team through the pipeline view.', 'Reviewed requirements with stakeholders.', 'Demoed reporting and integrations.'],
  note: ['Prefers quarterly billing. Decision by Friday.', 'Champion is on leave until next week.', 'Procurement needs a signed NDA first.', 'Budget approved for this quarter.'],
}

type Touch = [kind: Exclude<ActivityKind, 'stage' | 'won'>, daysAgo: number, hour: number]
interface Seed {
  n: number
  name: string
  company: string
  contact: string
  value: number
  stage: Stage
  owner: string
  close: string
  priority: Priority
  since: string
  next: string
  notes: string
  touches: Touch[]
  lost?: LostReason
}

const seeds: Seed[] = [
  { n: 101, name: 'Northwind pilot program', company: 'Northwind Traders', contact: 'Elena Fischer', value: 4800, stage: 'new', owner: 'o2', close: '2025-11-14', priority: 'medium', since: '2025-10-18', next: 'Book an intro call', notes: 'Inbound from the webinar. Small team, wants a 30 day pilot.', touches: [['email', 2, 15]] },
  { n: 102, name: 'Bluepeak onboarding', company: 'Bluepeak Labs', contact: 'Marcus Lee', value: 1200, stage: 'new', owner: 'o3', close: '2025-10-17', priority: 'low', since: '2025-10-08', next: 'Send the starter pricing', notes: 'Asked about the starter plan only.', touches: [['email', 11, 11], ['note', 9, 16]] },
  { n: 103, name: 'Kestrel analytics seats', company: 'Kestrel Analytics', contact: 'Dana Whitfield', value: 9600, stage: 'new', owner: 'o1', close: '2025-11-28', priority: 'medium', since: '2025-10-16', next: 'Qualify budget owner', notes: 'Referred by an existing customer.', touches: [['call', 3, 10], ['note', 3, 11]] },
  { n: 104, name: 'Lumen Retail rollout', company: 'Lumen Retail', contact: 'Tomás Rivera', value: 22000, stage: 'new', owner: 'o4', close: '2025-12-10', priority: 'high', since: '2025-10-19', next: 'Prepare discovery questions', notes: '40 stores, wants a phased rollout.', touches: [['email', 1, 14]] },
  { n: 105, name: 'Acme renewal', company: 'Acme Corp', contact: 'Avery Brooks', value: 24000, stage: 'contacted', owner: 'o1', close: '2025-10-12', priority: 'high', since: '2025-10-06', next: 'Get the renewal signed', notes: 'Prefers quarterly billing. Decision by Friday.', touches: [['call', 2, 9], ['email', 5, 13], ['meeting', 12, 15]] },
  { n: 106, name: 'Harbor Logistics expansion', company: 'Harbor Logistics', contact: 'Mina Park', value: 15500, stage: 'contacted', owner: 'o2', close: '2025-11-07', priority: 'medium', since: '2025-10-14', next: 'Share the case study', notes: 'Expanding to two new depots in Q1.', touches: [['email', 4, 10], ['call', 6, 16]] },
  { n: 107, name: 'Quill Studio retainer', company: 'Quill Studio', contact: 'Ravi Menon', value: 3400, stage: 'contacted', owner: 'o3', close: '2025-10-19', priority: 'low', since: '2025-10-15', next: 'Follow up on the quote', notes: 'Freelance collective, price sensitive.', touches: [['email', 5, 12]] },
  { n: 108, name: 'Solstice Energy audit', company: 'Solstice Energy', contact: 'Hannah Cho', value: 12900, stage: 'contacted', owner: 'o4', close: '2025-11-21', priority: 'medium', since: '2025-10-10', next: 'Schedule a technical review', notes: 'Compliance driven. Needs audit logs.', touches: [['call', 7, 11], ['note', 7, 12], ['email', 10, 9]] },
  { n: 109, name: 'Globex upsell', company: 'Globex', contact: 'Jonas Weber', value: 48000, stage: 'qualified', owner: 'o1', close: '2025-11-30', priority: 'high', since: '2025-10-09', next: 'Draft the multi-year proposal', notes: 'Sponsor is the VP of Operations. Wants 12 month term.', touches: [['meeting', 1, 14], ['call', 4, 10], ['email', 8, 16]] },
  { n: 110, name: 'Initech pilot', company: 'Initech', contact: 'Peter Gibbons', value: 12400, stage: 'qualified', owner: 'o3', close: '2025-11-12', priority: 'medium', since: '2025-10-12', next: 'Confirm pilot success criteria', notes: 'Pilot starts next sprint.', touches: [['call', 2, 13], ['note', 2, 14]] },
  { n: 111, name: 'Pinecrest Health platform', company: 'Pinecrest Health', contact: 'Alma Reyes', value: 36500, stage: 'qualified', owner: 'o2', close: '2025-12-05', priority: 'high', since: '2025-10-03', next: 'Security review with IT', notes: 'HIPAA review required before signing.', touches: [['email', 3, 9], ['meeting', 6, 11], ['call', 13, 15]] },
  { n: 112, name: 'Vertex Mobility fleet plan', company: 'Vertex Mobility', contact: 'Chloe Martin', value: 18200, stage: 'qualified', owner: 'o4', close: '2025-10-14', priority: 'medium', since: '2025-09-30', next: 'Reset the close date with the buyer', notes: 'Budget cycle slipped by two weeks.', touches: [['call', 8, 10], ['note', 8, 11]] },
  { n: 113, name: 'Orchid Foods supply link', company: 'Orchid Foods', contact: 'Kenji Sato', value: 7300, stage: 'qualified', owner: 'o1', close: '2025-12-18', priority: 'low', since: '2025-10-17', next: 'Send the integration guide', notes: 'Needs an ERP connector.', touches: [['email', 2, 17]] },
  { n: 114, name: 'Atlas Freight contract', company: 'Atlas Freight', contact: 'Grace Okafor', value: 41000, stage: 'proposal', owner: 'o2', close: '2025-11-05', priority: 'high', since: '2025-10-11', next: 'Legal review of the MSA', notes: 'Legal is redlining the MSA.', touches: [['email', 1, 10], ['meeting', 5, 14], ['call', 9, 9]] },
  { n: 115, name: 'Brightside Schools license', company: 'Brightside Schools', contact: 'Tom Hargrove', value: 27800, stage: 'proposal', owner: 'o3', close: '2025-11-26', priority: 'medium', since: '2025-10-13', next: 'Present to the school board', notes: 'Board meets on the 12th of each month.', touches: [['meeting', 3, 13], ['email', 6, 11]] },
  { n: 116, name: 'Cobalt Marine telemetry', company: 'Cobalt Marine', contact: 'Ingrid Larsen', value: 16400, stage: 'proposal', owner: 'o4', close: '2025-10-18', priority: 'medium', since: '2025-10-02', next: 'Chase the signature', notes: 'Verbal yes, waiting on paperwork.', touches: [['call', 2, 15], ['email', 4, 9], ['note', 4, 10]] },
  { n: 117, name: 'Meridian Bank sandbox', company: 'Meridian Bank', contact: 'Oliver Grant', value: 33000, stage: 'proposal', owner: 'o1', close: '2025-12-12', priority: 'high', since: '2025-10-18', next: 'Walk through the sandbox terms', notes: 'Compliance sandbox first, production later.', touches: [['meeting', 1, 11], ['email', 2, 9]] },
  { n: 118, name: 'Summit Outdoors annual plan', company: 'Summit Outdoors', contact: 'Rae Thompson', value: 19500, stage: 'won', owner: 'o2', close: '2025-10-15', priority: 'medium', since: '2025-10-15', next: 'Kick off onboarding', notes: 'Signed for 12 months, billed annually.', touches: [['call', 6, 10], ['email', 8, 14]] },
  { n: 119, name: 'Foxglove Pharma seats', company: 'Foxglove Pharma', contact: 'Leo Marchetti', value: 28600, stage: 'won', owner: 'o1', close: '2025-10-09', priority: 'high', since: '2025-10-09', next: 'Schedule training', notes: '120 seats, rollout in two waves.', touches: [['meeting', 12, 15], ['email', 14, 10]] },
  { n: 120, name: 'Tidewater Co-op', company: 'Tidewater Co-op', contact: 'Nina Alvarez', value: 5900, stage: 'won', owner: 'o3', close: '2025-10-02', priority: 'low', since: '2025-10-02', next: 'Send the welcome pack', notes: 'Small co-op, monthly billing.', touches: [['call', 19, 11]] },
  { n: 121, name: 'Ironwood Builders pilot', company: 'Ironwood Builders', contact: 'Carl Dempsey', value: 11200, stage: 'won', owner: 'o4', close: '2025-10-17', priority: 'medium', since: '2025-10-17', next: 'Hand over to support', notes: 'Pilot converted early.', touches: [['email', 3, 16], ['call', 5, 10]] },
  { n: 122, name: 'Zenith Telecom bundle', company: 'Zenith Telecom', contact: 'Aisha Rahman', value: 44000, stage: 'lost', owner: 'o3', close: '2025-10-08', priority: 'high', since: '2025-10-08', next: 'Check back in Q2', notes: 'Went with an incumbent vendor.', touches: [['call', 14, 14], ['meeting', 17, 10]], lost: 'Competitor' },
  { n: 123, name: 'Maple & Co. starter', company: 'Maple & Co.', contact: 'Ben Fischer', value: 2100, stage: 'lost', owner: 'o2', close: '2025-10-11', priority: 'low', since: '2025-10-11', next: 'Archive', notes: 'Stopped replying after the proposal.', touches: [['email', 12, 13]], lost: 'No response' },
  { n: 124, name: 'Redwood Capital advisory', company: 'Redwood Capital', contact: 'Sofia Marin', value: 31500, stage: 'lost', owner: 'o4', close: '2025-10-16', priority: 'medium', since: '2025-10-16', next: 'Revisit with a smaller scope', notes: 'Loved the product, budget was the blocker.', touches: [['meeting', 7, 11], ['email', 9, 15]], lost: 'Price' },
]

const ORDER: Stage[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']
const at = (daysAgo: number, hour: number): string => `${addDays(DEMO_TODAY, -daysAgo)}T${String(hour).padStart(2, '0')}:00:00`

function build(s: Seed): PipelineDeal {
  const activity: DealActivity[] = s.touches.map(([kind, ago, hour], i) => ({
    id: `${s.n}-a${i}`,
    kind,
    title: kind === 'call' ? `Call with ${s.contact}` : kind === 'email' ? `Email sent to ${s.contact}` : kind === 'meeting' ? (i % 2 ? `Meeting with ${s.contact}` : 'Product demo') : 'Note added',
    description: POOL[kind][(s.n + i) % POOL[kind].length],
    ownerId: s.owner,
    at: at(ago, hour),
  }))
  const prev = ORDER[Math.max(0, ORDER.indexOf(s.stage) - 1)]
  if (s.stage !== 'new') {
    const lost = s.stage === 'lost'
    activity.push({
      id: `${s.n}-stage`,
      kind: s.stage === 'won' ? 'won' : 'stage',
      title: s.stage === 'won' ? `Deal won: ${s.name}` : `Moved to ${stageLabel(s.stage)}`,
      description: s.stage === 'won' ? `Closed at ${money(s.value)}.` : lost ? `Lost to ${s.lost}. From Proposal to Lost.` : `From ${stageLabel(prev)} to ${stageLabel(s.stage)}.`,
      ownerId: s.owner,
      at: `${s.since}T09:00:00`,
    })
  }
  activity.sort((a, b) => b.at.localeCompare(a.at))
  return {
    id: `d-${s.n}`,
    group: 'Deals',
    icon: 'handshake',
    title: s.name,
    hint: `${s.company} · ${money(s.value)}`,
    company: s.company,
    contact: s.contact,
    contactId: contactId(s.contact),
    value: s.value,
    stage: s.stage,
    ownerId: s.owner,
    closeDate: s.close,
    priority: s.priority,
    stageSince: `${s.since}T09:00:00`,
    nextStep: s.next,
    notes: s.notes,
    lostReason: s.lost,
    activity,
  }
}

export const seedDeals = (): PipelineDeal[] => seeds.map(build)

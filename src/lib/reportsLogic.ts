import { owners, stageLabel } from '../data/deals'
import type { Contact, FunnelRow, KpiKey, OwnerRow, PipelineDeal, ReportData, ReportKpi, ReportPeriod, ReportPrefs, ReportRangeId, RevenueBucket, ScheduleEvent, SourceRow, Stage } from '../types'
import { FOLLOW_UP_DAYS } from './contactsLogic'
import { DEMO_TODAY, addDays, daysBetween, formatShort } from './dates'
import { isOpen } from './dealsLogic'

// Pure report maths. The numbers come from the same records the Deals and Contacts pages show, with the same rules
// (open = not Won or Lost; a contact needs follow-up after more than 14 days without contact), so the pages always agree.
export const RANGE_LABELS: Record<ReportRangeId, string> = { month: 'This month', '30d': 'Last 30 days', quarter: 'Last quarter', year: 'This year', custom: 'Custom' }
export const RANGE_IDS: ReportRangeId[] = ['month', '30d', 'quarter', 'year', 'custom']

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = (n: number): string => String(n).padStart(2, '0')
const monthStartOf = (iso: string): string => `${iso.slice(0, 7)}-01`
const monthEndOf = (iso: string): string => addDays(`${Number(iso.slice(5, 7)) === 12 ? Number(iso.slice(0, 4)) + 1 : iso.slice(0, 4)}-${pad(Number(iso.slice(5, 7)) === 12 ? 1 : Number(iso.slice(5, 7)) + 1)}-01`, -1)

/** The period for a range, relative to the fixed demo "today". */
export function resolvePeriod(prefs: Pick<ReportPrefs, 'range' | 'from' | 'to'>): ReportPeriod {
  const y = Number(DEMO_TODAY.slice(0, 4))
  const m = Number(DEMO_TODAY.slice(5, 7))
  switch (prefs.range) {
    case 'month': return { from: monthStartOf(DEMO_TODAY), to: DEMO_TODAY }
    case '30d': return { from: addDays(DEMO_TODAY, -29), to: DEMO_TODAY }
    case 'year': return { from: `${y}-01-01`, to: DEMO_TODAY }
    case 'quarter': {
      const q = Math.floor((m - 1) / 3)
      const startMonth = q === 0 ? 10 : (q - 1) * 3 + 1
      const startYear = q === 0 ? y - 1 : y
      const from = `${startYear}-${pad(startMonth)}-01`
      return { from, to: monthEndOf(`${startYear}-${pad(startMonth + 2)}-01`) }
    }
    default: return prefs.from && prefs.to && prefs.from <= prefs.to ? { from: prefs.from, to: prefs.to } : { from: monthStartOf(DEMO_TODAY), to: DEMO_TODAY }
  }
}
export const periodDays = (p: ReportPeriod): number => daysBetween(p.from, p.to) + 1
/** The same number of days immediately before the period. */
export function previousPeriod(p: ReportPeriod): ReportPeriod {
  const n = periodDays(p)
  const to = addDays(p.from, -1)
  return { from: addDays(to, -(n - 1)), to }
}
export const formatPeriod = (p: ReportPeriod): string => {
  const sameYear = p.from.slice(0, 4) === p.to.slice(0, 4)
  const y = (iso: string) => `${formatShort(iso).replace(/, \d{4}$/, '')}, ${iso.slice(0, 4)}`
  return sameYear ? `${formatShort(p.from).replace(/, \d{4}$/, '')} – ${y(p.to)}` : `${y(p.from)} – ${y(p.to)}`
}
const within = (iso: string, p: ReportPeriod): boolean => { const d = iso.slice(0, 10); return d >= p.from && d <= p.to }

// ---- deal dates
/** The day a deal moved to its current stage. */
export const stageDay = (d: PipelineDeal): string => d.stageSince.slice(0, 10)
/** The first thing recorded about a deal (its oldest activity), or the day it entered its stage. */
export function createdDay(d: PipelineDeal): string {
  let first = stageDay(d)
  for (const a of d.activity) if (a.at.slice(0, 10) < first) first = a.at.slice(0, 10)
  return first
}
const wonIn = (deals: PipelineDeal[], p: ReportPeriod): PipelineDeal[] => deals.filter((d) => d.stage === 'won' && within(d.stageSince, p))
const lostIn = (deals: PipelineDeal[], p: ReportPeriod): PipelineDeal[] => deals.filter((d) => d.stage === 'lost' && within(d.stageSince, p))
const sum = (deals: PipelineDeal[]): number => deals.reduce((s, d) => s + d.value, 0)

/** Deals still open at the end of the period: open now, or closed after it, and already started by then. */
function openAt(deals: PipelineDeal[], end: string): PipelineDeal[] {
  return deals.filter((d) => createdDay(d) <= end && (isOpen(d) || stageDay(d) > end))
}

// ---- contacts
const CONTACT_KINDS = new Set(['call', 'email', 'meeting'])
/** The day a contact was last reached as of `asOf` (today: the stored last-contacted date, exactly like the Contacts page). */
function lastReached(c: Contact, asOf: string): string {
  const stored = (c.lastContactedAt ?? c.createdAt).slice(0, 10)
  if (asOf >= DEMO_TODAY || stored <= asOf) return stored
  const past = c.activity.filter((a) => CONTACT_KINDS.has(a.kind) && a.at.slice(0, 10) <= asOf).map((a) => a.at.slice(0, 10)).sort()
  return past.length ? past[past.length - 1] : c.createdAt.slice(0, 10)
}
export function followUpsAt(contacts: Contact[], asOf: string): Contact[] {
  const end = asOf > DEMO_TODAY ? DEMO_TODAY : asOf
  return contacts.filter((c) => c.createdAt.slice(0, 10) <= end && c.status !== 'Customer' && c.status !== 'Unqualified' && daysBetween(lastReached(c, end), end) > FOLLOW_UP_DAYS)
}

// ---- KPIs
interface KpiValues { pipeline: number; won: number; winRate: number; avgDeal: number; cycle: number; followUps: number }
function kpiValues(deals: PipelineDeal[], contacts: Contact[], p: ReportPeriod): KpiValues {
  const won = wonIn(deals, p)
  const lost = lostIn(deals, p)
  const cycles = won.map((d) => Math.max(0, daysBetween(createdDay(d), stageDay(d))))
  return {
    pipeline: sum(openAt(deals, p.to)),
    won: sum(won),
    winRate: won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : 0,
    avgDeal: won.length ? Math.round(sum(won) / won.length) : 0,
    cycle: cycles.length ? Math.round(cycles.reduce((s, n) => s + n, 0) / cycles.length) : 0,
    followUps: followUpsAt(contacts, p.to).length,
  }
}
const KPI_DEFS: { id: KpiKey; label: string; unit: ReportKpi['unit']; lowerIsBetter: boolean; info: string }[] = [
  { id: 'pipeline', label: 'Open pipeline value', unit: 'usd', lowerIsBetter: false, info: 'Total value of deals that are still open (New, Contacted, Qualified or Proposal) at the end of the period. Deals started after the period ends are left out.' },
  { id: 'won', label: 'Won revenue', unit: 'usd', lowerIsBetter: false, info: 'Total value of deals moved to Won during the period.' },
  { id: 'winRate', label: 'Win rate', unit: 'percent', lowerIsBetter: false, info: 'Deals won divided by deals won plus deals lost, counting only deals closed during the period.' },
  { id: 'avgDeal', label: 'Average deal size', unit: 'usd', lowerIsBetter: false, info: 'Won revenue divided by the number of deals won in the period.' },
  { id: 'cycle', label: 'Average sales cycle', unit: 'days', lowerIsBetter: true, info: 'Average days from a deal’s first recorded activity to the day it was won, for deals won in the period.' },
  { id: 'followUps', label: 'Overdue follow-ups', unit: 'count', lowerIsBetter: true, info: `Contacts not reached for more than ${FOLLOW_UP_DAYS} days (customers and unqualified leads excluded), counted at the end of the period.` },
]

// ---- funnel
const FUNNEL_STAGES: Stage[] = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']
function funnelAt(deals: PipelineDeal[], p: ReportPeriod): { count: number; value: number }[] {
  return FUNNEL_STAGES.map((stage) => {
    const list = deals.filter((d) => d.stage === stage && createdDay(d) <= p.to && (isOpen(d) || within(d.stageSince, p)))
    return { count: list.length, value: sum(list) }
  })
}

// ---- revenue over time
interface Slot { from: string; to: string; label: string; title: string; pFrom: string; pTo: string }
function slots(p: ReportPeriod, prev: ReportPeriod): Slot[] {
  const span = periodDays(p)
  const out: Slot[] = []
  if (span <= 45) {
    const n = Math.ceil(span / 7)
    for (let i = 0; i < n; i++) {
      const from = addDays(p.from, i * 7)
      const to = addDays(from, 6) > p.to ? p.to : addDays(from, 6)
      const pFrom = addDays(prev.from, i * 7)
      out.push({ from, to, label: formatShort(from).replace(/, \d{4}$/, ''), title: `${formatShort(from)} – ${formatShort(to)}`, pFrom, pTo: addDays(pFrom, 6) > prev.to ? prev.to : addDays(pFrom, 6) })
    }
    return out
  }
  // One bar per month (per quarter when the range covers more than a year), up to 12 bars.
  const step = span > 366 ? 3 : 1
  let cursor = monthStartOf(p.from)
  while (cursor <= p.to) {
    const lastMonth = step === 1 ? cursor : `${cursor.slice(0, 4)}-${pad(Number(cursor.slice(5, 7)) + 2 > 12 ? 12 : Number(cursor.slice(5, 7)) + 2)}-01`
    const from = cursor < p.from ? p.from : cursor
    const end = monthEndOf(lastMonth)
    const to = end > p.to ? p.to : end
    const m = Number(from.slice(5, 7))
    out.push({ from, to, label: step === 1 ? `${MONTHS[m - 1]}${span > 300 ? ` ${from.slice(2, 4)}` : ''}` : `Q${Math.floor((m - 1) / 3) + 1} ${from.slice(2, 4)}`, title: step === 1 ? `${MONTHS[m - 1]} ${from.slice(0, 4)}` : `${formatShort(from)} – ${formatShort(to)}`, pFrom: '', pTo: '' })
    cursor = addDays(end, 1)
  }
  const limited = out.slice(-12)
  const pn = periodDays(prev)
  return limited.map((s, i) => ({ ...s, pFrom: addDays(prev.from, Math.floor((i * pn) / limited.length)), pTo: addDays(prev.from, Math.floor(((i + 1) * pn) / limited.length) - 1) }))
}

function revenue(deals: PipelineDeal[], p: ReportPeriod, prev: ReportPeriod): ReportData['revenue'] {
  const won = wonIn(deals, p)
  const pWon = wonIn(deals, prev)
  const buckets: RevenueBucket[] = slots(p, prev).map((s) => {
    const inSlot = won.filter((d) => stageDay(d) >= s.from && stageDay(d) <= s.to)
    const inPrev = pWon.filter((d) => stageDay(d) >= s.pFrom && stageDay(d) <= s.pTo)
    return { label: s.label, title: s.title, from: s.from, to: s.to, value: sum(inSlot), deals: inSlot.length, previousValue: sum(inPrev) }
  })
  return { buckets, total: sum(won), previousTotal: sum(pWon), deals: won.length, previousDeals: pWon.length }
}

// ---- sources and owners
function sources(contacts: Contact[], p: ReportPeriod, prev: ReportPeriod): ReportData['sources'] {
  const cur = contacts.filter((c) => within(c.createdAt, p))
  const before = contacts.filter((c) => within(c.createdAt, prev))
  const names = [...new Set(contacts.map((c) => c.source))]
  const rows: SourceRow[] = names.map((source) => {
    const mine = cur.filter((c) => c.source === source)
    const customers = mine.filter((c) => c.status === 'Customer').length
    return { source, leads: mine.length, customers, conversion: mine.length ? Math.round((customers / mine.length) * 1000) / 10 : 0, previousLeads: before.filter((c) => c.source === source).length }
  })
  rows.sort((a, b) => b.leads - a.leads || a.source.localeCompare(b.source))
  return { rows, total: cur.length, previousTotal: before.length }
}

function leaderboard(deals: PipelineDeal[], events: ScheduleEvent[], p: ReportPeriod, prev: ReportPeriod): OwnerRow[] {
  const won = wonIn(deals, p)
  const pWon = wonIn(deals, prev)
  const rows: OwnerRow[] = owners.map((o) => ({
    ownerId: o.id,
    name: o.name,
    wonValue: sum(won.filter((d) => d.ownerId === o.id)),
    closed: won.filter((d) => d.ownerId === o.id).length,
    meetings: events.filter((e) => e.type === 'Meeting' && e.status !== 'Cancelled' && e.deletedAt === null && within(e.start, p) && (e.ownerId === o.id || e.attendees.some((a) => a.kind === 'owner' && a.id === o.id))).length,
    previousWonValue: sum(pWon.filter((d) => d.ownerId === o.id)),
  }))
  rows.sort((a, b) => b.wonValue - a.wonValue || b.closed - a.closed || b.meetings - a.meetings || a.name.localeCompare(b.name))
  return rows
}

export function buildReport(input: { deals: PipelineDeal[]; contacts: Contact[]; events: ScheduleEvent[] }, period: ReportPeriod, compare: boolean): ReportData {
  const { deals, contacts, events } = input
  const prev = previousPeriod(period)
  const now = kpiValues(deals, contacts, period)
  const before = kpiValues(deals, contacts, prev)
  const funnelNow = funnelAt(deals, period)
  const funnelPrev = funnelAt(deals, prev)
  const funnel: FunnelRow[] = FUNNEL_STAGES.map((stage, i) => ({ stage, label: stageLabel(stage), count: funnelNow[i].count, value: funnelNow[i].value, previousCount: funnelPrev[i].count, previousValue: funnelPrev[i].value }))
  const src = sources(contacts, period, prev)
  const rev = revenue(deals, period, prev)
  return {
    period,
    previous: prev,
    compare,
    empty: now.pipeline === 0 && rev.deals === 0 && lostIn(deals, period).length === 0 && src.total === 0,
    kpis: KPI_DEFS.map((d) => ({ ...d, value: now[d.id], previous: before[d.id] })),
    funnel,
    revenue: rev,
    sources: src,
    leaderboard: leaderboard(deals, events, period, prev),
  }
}

// ---- wording and formatting shared by the page, tooltips, tables and CSV
export const usd = (n: number): string => `$${Math.round(n).toLocaleString('en-US')}`
export function formatKpi(unit: ReportKpi['unit'], v: number): string {
  if (unit === 'usd') return usd(v)
  if (unit === 'percent') return `${Math.round(v)}%`
  if (unit === 'days') return `${Math.round(v)} ${Math.round(v) === 1 ? 'day' : 'days'}`
  return String(Math.round(v))
}
export interface ChangeInfo { direction: 'up' | 'down'; text: string; tone: 'good' | 'bad' | 'neutral'; /** Plain words for screen readers and summaries. */ words: string }
/** Change from `previous` to `value`. `lowerIsBetter` only affects the colour; the arrow always shows the direction. */
export function changeInfo(value: number, previous: number, lowerIsBetter = false, unit: ReportKpi['unit'] | 'plain' = 'plain'): ChangeInfo {
  if (value === previous) return { direction: 'up', text: '0%', tone: 'neutral', words: 'unchanged' }
  const up = value > previous
  const tone = up !== lowerIsBetter ? 'good' : 'bad'
  if (unit === 'percent') { const pts = Math.abs(Math.round(value - previous)); return { direction: up ? 'up' : 'down', text: `${pts} pts`, tone, words: `${up ? 'up' : 'down'} ${pts} points` } }
  if (previous === 0) return { direction: 'up', text: 'New', tone, words: 'new this period' }
  const pct = Math.round((Math.abs(value - previous) / previous) * 100)
  return { direction: up ? 'up' : 'down', text: `${pct}%`, tone, words: `${up ? 'up' : 'down'} ${pct}%` }
}
/** "up 12% vs the previous period", "new this period (none in the previous one)", "unchanged vs the previous period". */
export function vsPrevious(value: number, previous: number): string {
  const c = changeInfo(value, previous)
  if (c.words === 'unchanged') return 'unchanged vs the previous period'
  if (c.words === 'new this period') return 'new this period, with none in the previous period'
  return `${c.words} vs the previous period`
}
export const dealsLink = (params: Record<string, string>): string => `/deals?${new URLSearchParams(params).toString()}`
export const contactsLink = (params: Record<string, string>): string => `/contacts?${new URLSearchParams(params).toString()}`

/** "Won revenue is up 12% vs the previous period. $82,400 from 4 deals." (or just the detail when comparison is off). */
export function trendSentence(subject: string, value: number, previous: number, compare: boolean, detail: string): string {
  return compare ? `${subject} is ${vsPrevious(value, previous)}. ${detail}` : `${subject}: ${detail}`
}
export const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`

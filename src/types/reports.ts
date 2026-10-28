import type { Stage } from './deals'

// ---- Reports page. Everything here is derived from the deals, contacts and events services when the page asks for it.
export type ReportRangeId = 'month' | '30d' | 'quarter' | 'year' | 'custom'

/** Inclusive ISO dates (YYYY-MM-DD). */
export interface ReportPeriod { from: string; to: string }

export interface ReportPrefs {
  range: ReportRangeId
  /** Used when `range` is 'custom'. */
  from: string
  to: string
  compare: boolean
}

export type KpiUnit = 'usd' | 'percent' | 'days' | 'count'
export type KpiKey = 'pipeline' | 'won' | 'winRate' | 'avgDeal' | 'cycle' | 'followUps'

export interface ReportKpi {
  id: KpiKey
  label: string
  /** How it is calculated, shown in the info tooltip. */
  info: string
  unit: KpiUnit
  value: number
  previous: number
  /** For "up is bad" metrics (sales cycle, overdue follow-ups) the badge colour flips; the arrow still shows the direction. */
  lowerIsBetter: boolean
}

export interface FunnelRow {
  stage: Stage
  label: string
  count: number
  value: number
  previousCount: number
  previousValue: number
}

export interface RevenueBucket {
  /** Axis label ("Oct 1", "Oct"). */
  label: string
  /** Tooltip title ("Oct 1 – Oct 7"). */
  title: string
  from: string
  to: string
  value: number
  deals: number
  /** Same slot of the previous period. */
  previousValue: number
}

export interface SourceRow {
  source: string
  leads: number
  customers: number
  /** 0–100, one decimal. */
  conversion: number
  previousLeads: number
}

export interface OwnerRow {
  ownerId: string
  name: string
  wonValue: number
  closed: number
  meetings: number
  previousWonValue: number
}

export interface ReportData {
  period: ReportPeriod
  previous: ReportPeriod
  compare: boolean
  /** Nothing at all happened in the period: no pipeline, no closed deals and no new leads. */
  empty: boolean
  kpis: ReportKpi[]
  funnel: FunnelRow[]
  revenue: { buckets: RevenueBucket[]; total: number; previousTotal: number; deals: number; previousDeals: number }
  sources: { rows: SourceRow[]; total: number; previousTotal: number }
  leaderboard: OwnerRow[]
}

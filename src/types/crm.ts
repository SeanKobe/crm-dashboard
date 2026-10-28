import type { ChangeDirection, ChartRange, IconComponent, Tone } from './common'

// ---- Accounts, navigation, sidebar
export interface Account {
  id: string
  email: string
  tone: Tone
}

export type NavId = 'dashboard' | 'deals' | 'notes' | 'calendar' | 'reports' | 'projects'

export interface NavEntry {
  id: NavId
  label: string
  icon: IconComponent
}

export type FavoriteType = 'Company' | 'Contact' | 'Meeting'

export interface FavoriteSeed {
  label: string
  count: string
}

export interface Favorite {
  id: string
  label: string
  icon: IconComponent
  count: string
  /** Plays the row-in animation (rows added from the "+" menu). */
  fresh?: boolean
}

export interface StorageInfo {
  usedPercent: number
  upgradeLabel: string
  upgradeNote: string
}

export interface Brand {
  title: string
  subtitle: string
}

// ---- Search entities (header search groups them as Leads, Contacts, Deals)
export type SearchIcon = 'user' | 'mail' | 'handshake'

interface SearchEntity {
  id: string
  title: string
  hint: string
}

export interface Lead extends SearchEntity {
  group: 'Leads'
  icon: 'user'
}
export interface ContactResult extends SearchEntity {
  group: 'Contacts'
  icon: 'mail'
}
export interface Deal extends SearchEntity {
  group: 'Deals'
  icon: 'handshake'
}
export type SearchResult = Lead | ContactResult | Deal

// ---- KPI row
export type KpiId = 'leads' | 'clv' | 'conversion' | 'revenue'

export interface KpiMetric {
  id: KpiId
  info: string
  label: string
  icon: IconComponent
  value: string
  change: string
  direction: ChangeDirection
  comparison: string
}

// ---- Revenue chart (series are in thousands of dollars; `trend` is the dotted overlay line)
export type ChartMetric = 'Revenue' | 'Deals' | 'Leads'

export interface RangeData {
  previous: number
  titles: string[]
  amount: string
  delta: string
  compare: string
  labels: string[]
  values: number[]
  trend: number[]
}

export interface MetricRangeData extends RangeData {
  /** Axis suffix: "k" for revenue, empty for counts. */
  unit: string
  /** Word after the value in tooltips ("deals", "leads"); empty for revenue. */
  noun: string
}

export interface RevenueData {
  title: string
  defaultRange: ChartRange
  ranges: Record<ChartRange, RangeData>
}

// ---- Calendar
export interface EventPerson {
  initial: string
  tone: Tone
}

export interface CalendarEvent {
  id: string
  title: string
  time: string
  extra: string | null
  platform: string
  people: EventPerson[]
}

export interface CalendarData {
  title: string
  /** ISO date (YYYY-MM-DD) of the first day shown. */
  startWeek: string
  selected: string
}

// ---- Leads management
export type LeadsTab = 'Status' | 'Sources' | 'Qualification'

export interface LeadBreakdownRow {
  label: string
  count: number
  /** Signed percent change vs the previous period. */
  change: number
}

export interface LeadsManagementData {
  title: string
  tabs: LeadsTab[]
  defaultTab: LeadsTab
  rows: Record<LeadsTab, LeadBreakdownRow[]>
}

// ---- Top country
export type CountryKey = 'australia' | 'malaysia' | 'indonesia' | 'singapore'

export interface CountryRow {
  rank: number
  /** Key shared with the map dots and the flag. */
  country: CountryKey
  name: string
  value: string
}

export interface TopCountryData {
  title: string
  viewMore: string
  rows: CountryRow[]
}

// ---- Retention
export type RetentionSeriesKey = 'smes' | 'startups' | 'enterprises'

export interface RetentionSeries {
  key: RetentionSeriesKey
  label: string
}

/** One month column. Months without data yet have `null` values. */
export interface RetentionPoint {
  month: string
  title: string
  smes: number | null
  startups: number | null
  enterprises: number | null
}

export interface RetentionData {
  title: string
  amount: string
  delta: string
  activeMonth: string
  previousTotal: number
  series: RetentionSeries[]
  months: RetentionPoint[]
}

// ---- Header dropdowns
export interface NotificationData {
  id: string
  title: string
  message: string
  time: string
  initial: string
  tone: Tone
  unread: boolean
}

export type WidgetId = `kpi-${KpiId}` | 'revenue' | 'calendar' | 'leads' | 'country' | 'retention'

export interface WidgetInfo {
  id: WidgetId
  label: string
}

export type ExportFormat = 'CSV' | 'Excel' | 'PDF'

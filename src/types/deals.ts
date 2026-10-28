import type { Deal } from './crm'
import type { IconComponent, Tone } from './common'

// ---- Deals page (extends the search-result `Deal` so the Dashboard search keeps working with the same shape)
export type Stage = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost'
export type Priority = 'high' | 'medium' | 'low'
export type LostReason = 'Price' | 'Timing' | 'Competitor' | 'No response' | 'Other'
export type ActivityKind = 'call' | 'email' | 'meeting' | 'note' | 'stage' | 'won'
export type DealView = 'board' | 'list'

export interface DealOwner {
  id: string
  name: string
  initial: string
  tone: Tone
}

export interface DealActivity {
  id: string
  kind: ActivityKind
  title: string
  description: string
  ownerId: string
  /** ISO date-time. */
  at: string
}

export interface PipelineDeal extends Deal {
  company: string
  /** Contact name as typed (kept for deals whose contact is not in Contacts). */
  contact: string
  /** Linked contact, resolved to its current name when shown. */
  contactId?: string
  /** Whole US dollars. */
  value: number
  stage: Stage
  ownerId: string
  /** ISO date (YYYY-MM-DD). */
  closeDate: string
  priority: Priority
  /** ISO date-time the deal entered its current stage. */
  stageSince: string
  nextStep: string
  notes: string
  lostReason?: LostReason
  /** Newest first. */
  activity: DealActivity[]
}

export interface StageMeta {
  id: Stage
  label: string
  /** Accessible, human description of what the stage means. */
  hint: string
  icon?: IconComponent
}

export type SortKey = 'name' | 'company' | 'stage' | 'value' | 'owner' | 'closeDate' | 'lastActivity'
export type SortDir = 'asc' | 'desc'
export interface DealSort {
  key: SortKey
  dir: SortDir
}

export interface DealFilters {
  query: string
  owners: string[]
  priorities: Priority[]
  /** Whole dollars, empty string = no bound. */
  minValue: string
  maxValue: string
  /** ISO dates, empty string = no bound. */
  closeFrom: string
  closeTo: string
  /** Only open deals whose close date has passed. */
  overdue: boolean
  /** Only deals in these stages (set by links from Reports; no toolbar control). */
  stages: Stage[]
  /** ISO dates: only deals that entered their current stage between these days. Empty = no bound. */
  stageFrom: string
  stageTo: string
}

export interface DealsState {
  deals: PipelineDeal[]
  filters: DealFilters
  view: DealView
  sort: DealSort
  collapsed: Stage[]
}

export interface NewDealInput {
  name: string
  company: string
  contact?: string
  contactId?: string
  value: number
  stage: Stage
  ownerId?: string
  closeDate?: string
  priority?: Priority
}

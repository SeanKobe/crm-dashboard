import type { DealActivity, DealFilters, DealSort, PipelineDeal, Stage } from '../types'
import { DEMO_TODAY, daysBetween, dateRangeError } from './dates'
import { makeId } from './ids'

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
export const money = (n: number): string => usd.format(n)

export const isOpen = (d: PipelineDeal): boolean => d.stage !== 'won' && d.stage !== 'lost'
export const isOverdue = (d: PipelineDeal): boolean => isOpen(d) && daysBetween(DEMO_TODAY, d.closeDate) < 0
export const lastActivityAt = (d: PipelineDeal): string => d.activity[0]?.at ?? d.stageSince

export const hasActiveFilters = (f: DealFilters): boolean =>
  Boolean(f.query.trim() || f.owners.length || f.priorities.length || f.minValue || f.maxValue || f.closeFrom || f.closeTo || f.overdue || f.stages.length || f.stageFrom || f.stageTo)

/** `contactName` lets the caller supply a linked contact's current name instead of the typed one. */
export function filterDeals(deals: PipelineDeal[], f: DealFilters, contactName: (d: PipelineDeal) => string = (d) => d.contact): PipelineDeal[] {
  const q = f.query.trim().toLowerCase()
  const min = f.minValue ? Number(f.minValue) : null
  const max = f.maxValue ? Number(f.maxValue) : null
  // A To date before the From date is flagged in the filter; until it is fixed the dates don't filter anything.
  const badRange = Boolean(dateRangeError(f.closeFrom, f.closeTo))
  const badStageRange = Boolean(dateRangeError(f.stageFrom, f.stageTo))
  return deals.filter((d) => {
    if (q && !`${d.title} ${d.company} ${contactName(d)}`.toLowerCase().includes(q)) return false
    if (f.owners.length && !f.owners.includes(d.ownerId)) return false
    if (f.priorities.length && !f.priorities.includes(d.priority)) return false
    if (min !== null && d.value < min) return false
    if (max !== null && d.value > max) return false
    if (!badRange && f.closeFrom && d.closeDate < f.closeFrom) return false
    if (!badRange && f.closeTo && d.closeDate > f.closeTo) return false
    if (f.overdue && !isOverdue(d)) return false
    if (f.stages.length && !f.stages.includes(d.stage)) return false
    if (!badStageRange && f.stageFrom && d.stageSince.slice(0, 10) < f.stageFrom) return false
    if (!badStageRange && f.stageTo && d.stageSince.slice(0, 10) > f.stageTo) return false
    return true
  })
}

const STAGE_RANK: Record<Stage, number> = { new: 0, contacted: 1, qualified: 2, proposal: 3, won: 4, lost: 5 }

export function sortDeals(deals: PipelineDeal[], sort: DealSort, ownerName: (id: string) => string): PipelineDeal[] {
  const dir = sort.dir === 'asc' ? 1 : -1
  const cmp = (a: PipelineDeal, b: PipelineDeal): number => {
    switch (sort.key) {
      case 'name': return a.title.localeCompare(b.title)
      case 'company': return a.company.localeCompare(b.company)
      case 'stage': return STAGE_RANK[a.stage] - STAGE_RANK[b.stage]
      case 'value': return a.value - b.value
      case 'owner': return ownerName(a.ownerId).localeCompare(ownerName(b.ownerId))
      case 'closeDate': return a.closeDate.localeCompare(b.closeDate)
      case 'lastActivity': return lastActivityAt(a).localeCompare(lastActivityAt(b))
    }
  }
  return [...deals].sort((a, b) => dir * cmp(a, b) || a.title.localeCompare(b.title))
}

export const sumValue = (deals: PipelineDeal[]): number => deals.reduce((n, d) => n + d.value, 0)

/** Parses "12,000" / "$12000" / "12000.50". Returns null for anything that is not a positive number. */
export function parseMoney(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, '')
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null
  const n = Number(cleaned)
  return n > 0 ? Math.round(n) : null
}

export function validateName(name: string, others: PipelineDeal[] = [], ownId?: string): string | null {
  const t = name.trim()
  if (!t) return 'Enter a deal name.'
  if (t.length > 80) return 'Keep the name under 80 characters.'
  if (others.some((d) => d.id !== ownId && d.title.toLowerCase() === t.toLowerCase())) return 'A deal with this name already exists. Add a detail to tell them apart.'
  return null
}

export function validateValue(raw: string): string | null {
  const t = raw.trim()
  if (!t) return 'Enter a deal value, for example 12000.'
  if (!/^[$\d,.\s]+$/.test(t)) return 'Use numbers only, for example 12000.'
  const n = parseMoney(t)
  if (n === null) return 'Enter a value greater than $0.'
  if (n > 10_000_000) return 'That value looks too large. Enter up to $10,000,000.'
  return null
}

let seq = 0
export const newId = (prefix: string): string => makeId(prefix, () => `${Date.now().toString(36)}${(seq++).toString(36)}`)

export const sortActivity = (list: DealActivity[]): DealActivity[] => [...list].sort((a, b) => b.at.localeCompare(a.at))

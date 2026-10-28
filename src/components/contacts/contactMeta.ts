import type { ContactColumn, ContactFilters, ContactSort, ContactSource, SavedContactView, Tone } from '../../types'
import { DEMO_TODAY, addDays } from '../../lib/dates'
import { emptyContactFilters } from '../../lib/contactsLogic'

export const SOURCES: ContactSource[] = ['Website', 'Referral', 'LinkedIn', 'Event', 'Cold outreach']
export const COLUMN_LABELS: Record<ContactColumn, string> = { company: 'Company', status: 'Status', source: 'Source', owner: 'Owner', lastContacted: 'Last contacted', created: 'Created' }
export const ALL_COLUMNS = Object.keys(COLUMN_LABELS) as ContactColumn[]

const TONES: Tone[] = ['purple', 'green', 'orange', 'amber', 'red']
export const toneFor = (name: string): Tone => TONES[[...name].reduce((n, ch) => n + ch.charCodeAt(0), 0) % TONES.length]

export interface BuiltInView { id: string; name: string; filters: ContactFilters }
export const builtInViews = (currentUserId: string): BuiltInView[] => [
  { id: 'all', name: 'All', filters: emptyContactFilters },
  { id: 'mine', name: 'My contacts', filters: { ...emptyContactFilters, ownerIds: [currentUserId] } },
  { id: 'new-week', name: 'New this week', filters: { ...emptyContactFilters, createdFrom: addDays(DEMO_TODAY, -6) } },
  { id: 'follow-up', name: 'Needs follow-up', filters: { ...emptyContactFilters, followUp: true } },
]

const sameList = (a: readonly string[], b: readonly string[]): boolean => a.length === b.length && a.every((x) => b.includes(x))
export const sameFilters = (a: ContactFilters, b: ContactFilters): boolean =>
  a.query.trim() === b.query.trim() && sameList(a.statuses, b.statuses) && sameList(a.sources, b.sources) && sameList(a.ownerIds, b.ownerIds) && sameList(a.tags, b.tags) && a.createdFrom === b.createdFrom && a.createdTo === b.createdTo && a.followUp === b.followUp
export const sameSort = (a: ContactSort | null, b: ContactSort | null): boolean => (a?.key ?? '') === (b?.key ?? '') && (a?.dir ?? '') === (b?.dir ?? '')

/** The built-in or saved view whose filters match the current ones, or null for a custom combination. */
export function activeViewId(filters: ContactFilters, sort: ContactSort | null, builtIn: BuiltInView[], saved: SavedContactView[]): string | null {
  const s = saved.find((v) => sameFilters(v.filters, filters) && sameSort(v.sort, sort))
  if (s) return s.id
  return builtIn.find((v) => sameFilters(v.filters, filters))?.id ?? null
}

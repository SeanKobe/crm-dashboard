import type { Contact, ContactFilters, ContactQuery, ContactSort, LeadStatus } from '../types'
import { DEMO_TODAY, daysBetween, dateRangeError } from './dates'

export const LEAD_STATUSES: LeadStatus[] = ['New', 'Contacted', 'Qualified', 'Unqualified', 'Customer']
export const FOLLOW_UP_DAYS = 14

export const emptyContactFilters: ContactFilters = { query: '', statuses: [], sources: [], ownerIds: [], tags: [], createdFrom: '', createdTo: '', followUp: false }

export const hasContactFilters = (f: ContactFilters): boolean =>
  Boolean(f.query.trim() || f.statuses.length || f.sources.length || f.ownerIds.length || f.tags.length || f.createdFrom || f.createdTo || f.followUp)

/** Days since the contact was last reached (or created, if never). */
export const daysSinceContact = (c: Contact): number => daysBetween((c.lastContactedAt ?? c.createdAt).slice(0, 10), DEMO_TODAY)
/** Over 14 days without contact. Customers and unqualified leads are not chased. */
export const needsFollowUp = (c: Contact): boolean => c.status !== 'Customer' && c.status !== 'Unqualified' && daysSinceContact(c) > FOLLOW_UP_DAYS

export function filterContacts(all: Contact[], f: ContactFilters): Contact[] {
  const terms = f.query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const badRange = Boolean(dateRangeError(f.createdFrom, f.createdTo))
  return all.filter((c) => {
    if (terms.length) { const hay = `${c.name} ${c.email} ${c.company}`.toLowerCase(); if (!terms.every((t) => hay.includes(t))) return false }
    if (f.statuses.length && !f.statuses.includes(c.status)) return false
    if (f.sources.length && !f.sources.includes(c.source)) return false
    if (f.ownerIds.length && !f.ownerIds.includes(c.ownerId)) return false
    if (f.tags.length && !f.tags.some((t) => c.tags.includes(t))) return false
    const created = c.createdAt.slice(0, 10)
    if (!badRange && f.createdFrom && created < f.createdFrom) return false
    if (!badRange && f.createdTo && created > f.createdTo) return false
    if (f.followUp && !needsFollowUp(c)) return false
    return true
  })
}

export function sortContacts(list: Contact[], sort: ContactSort | null, ownerName: (id: string) => string): Contact[] {
  const s: ContactSort = sort ?? { key: 'created', dir: 'desc' }
  const dir = s.dir === 'asc' ? 1 : -1
  const val = (c: Contact): string | number => {
    switch (s.key) {
      case 'name': return c.name.toLowerCase()
      case 'company': return c.company.toLowerCase()
      case 'status': return LEAD_STATUSES.indexOf(c.status)
      case 'source': return c.source
      case 'owner': return ownerName(c.ownerId)
      case 'lastContacted': return c.lastContactedAt ?? ''
      case 'created': return c.createdAt
    }
  }
  return [...list].sort((a, b) => {
    const x = val(a), y = val(b)
    const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))
    return dir * cmp || a.name.localeCompare(b.name)
  })
}

export const matchesQuery = (all: Contact[], q: ContactQuery, ownerName: (id: string) => string): Contact[] => sortContacts(filterContacts(all, q.filters), q.sort, ownerName)

// ---- validation
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const isEmail = (s: string): boolean => EMAIL.test(s.trim())
export function validateEmail(s: string): string | null {
  const t = s.trim()
  if (!t) return 'Enter an email address.'
  return isEmail(t) ? null : 'Enter a valid email, for example name@company.com.'
}
/** Optional. Digits with spaces, dots, dashes, parentheses and a leading +, 7 to 15 digits. */
export function validatePhone(s: string): string | null {
  const t = s.trim()
  if (!t) return null
  if (!/^\+?[\d\s().-]+$/.test(t)) return 'Use digits, spaces and + ( ) - only, for example +1 415 555 0132.'
  const digits = t.replace(/\D/g, '').length
  return digits >= 7 && digits <= 15 ? null : 'A phone number has 7 to 15 digits.'
}
export function validateContactName(s: string): string | null {
  const t = s.trim()
  if (!t) return 'Enter a name.'
  return t.length > 80 ? 'Keep the name under 80 characters.' : null
}

/** Query-string keys the Contacts page reads (links from Reports). */
export const CONTACT_URL_KEYS = ['source', 'status', 'owner', 'createdFrom', 'createdTo', 'followUp']
/** Filters described by the address (?source=Website&createdFrom=2025-10-01), or null when it has none of them. */
export function contactFiltersFromParams(params: URLSearchParams): ContactFilters | null {
  if (!CONTACT_URL_KEYS.some((k) => params.has(k))) return null
  const day = (v: string | null): string => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '')
  const list = (k: string): string[] => (params.get(k) ?? '').split(',').filter(Boolean)
  return {
    ...emptyContactFilters,
    sources: list('source') as ContactFilters['sources'],
    statuses: list('status').filter((s): s is LeadStatus => LEAD_STATUSES.includes(s as LeadStatus)),
    ownerIds: list('owner'),
    createdFrom: day(params.get('createdFrom')),
    createdTo: day(params.get('createdTo')),
    followUp: params.get('followUp') === '1',
  }
}

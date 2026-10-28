import type { ActivityKind } from './deals'

export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Unqualified' | 'Customer'
export type ContactSource = 'Website' | 'Referral' | 'LinkedIn' | 'Event' | 'Cold outreach'
export type ContactActivityKind = ActivityKind | 'status' | 'deal'

export interface ContactActivity {
  id: string
  kind: ContactActivityKind
  title: string
  description: string
  ownerId: string
  /** Local date-time (YYYY-MM-DDTHH:mm:ss). */
  at: string
}

export interface Contact {
  id: string
  name: string
  email: string
  phone: string
  company: string
  jobTitle: string
  status: LeadStatus
  source: ContactSource
  ownerId: string
  tags: string[]
  createdAt: string
  /** Null when the contact has never been contacted. */
  lastContactedAt: string | null
  /** Linked deals and notes, by id. */
  dealIds: string[]
  noteIds: string[]
  /** Newest first. */
  activity: ContactActivity[]
  /** Set while the contact is soft-deleted; restorable. */
  deletedAt: string | null
}

export type ContactSortKey = 'name' | 'company' | 'status' | 'source' | 'owner' | 'lastContacted' | 'created'
export interface ContactSort { key: ContactSortKey; dir: 'asc' | 'desc' }

export interface ContactFilters {
  query: string
  statuses: LeadStatus[]
  sources: ContactSource[]
  ownerIds: string[]
  tags: string[]
  /** ISO dates (YYYY-MM-DD), empty string = no bound. */
  createdFrom: string
  createdTo: string
  /** Open follow-up: not contacted for more than 14 days (customers and unqualified leads excluded). */
  followUp: boolean
}

export interface ContactQuery {
  filters: ContactFilters
  /** Null = default order (newest first). */
  sort: ContactSort | null
  page: number
  pageSize: number
}

export interface ContactPage {
  items: Contact[]
  /** Contacts matching the filters (all pages). */
  total: number
  /** All contacts, ignoring filters. */
  totalAll: number
  page: number
  pageSize: number
  /** Ids of every match, for "select all", previous / next contact and exports. */
  matchingIds: string[]
  /** Every tag in use, for the tag filter. */
  allTags: string[]
}

export type NewContactInput = Partial<Pick<Contact, 'phone' | 'company' | 'jobTitle' | 'status' | 'source' | 'ownerId' | 'tags' | 'dealIds' | 'noteIds'>> & Pick<Contact, 'name' | 'email'>
export type ContactPatch = Partial<Pick<Contact, 'name' | 'email' | 'phone' | 'company' | 'jobTitle' | 'status' | 'source' | 'ownerId' | 'tags' | 'lastContactedAt' | 'dealIds' | 'noteIds' | 'activity'>>

export interface SavedContactView { id: string; name: string; filters: ContactFilters; sort: ContactSort | null }
export type ContactColumn = 'company' | 'status' | 'source' | 'owner' | 'lastContacted' | 'created'
export type ContactDensity = 'comfortable' | 'compact'
export interface ContactPrefs {
  filters: ContactFilters
  sort: ContactSort | null
  density: ContactDensity
  hiddenColumns: ContactColumn[]
  page: number
  pageSize: number
  savedViews: SavedContactView[]
  selectedId: string | null
}

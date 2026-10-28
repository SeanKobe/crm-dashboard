import { companyId } from '../data/records'
import { isOpen } from '../lib/dealsLogic'
import type { Contact, Note, PipelineDeal } from '../types'
import { contactsService, subscribeContacts } from './contacts'
import { dealsService, subscribeDeals } from './deals'
import { notesService, subscribeNotes } from './notes'

// Companies have no table: a company is the name written on contacts and deals, identified by its slug (companyId). This service builds
// the list from the contacts, deals and notes services, so it shows exactly what the signed-in role may read and nothing else.
export interface Company {
  id: string
  name: string
  contacts: Contact[]
  deals: PipelineDeal[]
  /** Notes linked to the company itself, to one of its contacts or to one of its deals. */
  notes: Note[]
  /** Sum of the deals that are not won or lost, in whole dollars. */
  openValue: number
  openDeals: number
  /** Newest of: a deal's last timeline entry or stage change, a contact's last contact or timeline entry, a linked note's last edit. Local date-time. */
  lastActivity: string | null
}

const newest = (a: string | null, b: string | null | undefined): string | null => (b && (!a || b > a) ? b : a)

export function buildCompanies(contacts: Contact[], deals: PipelineDeal[], notes: Note[]): Company[] {
  const map = new Map<string, Company>()
  const entry = (name: string): Company | null => {
    const clean = name.trim()
    if (!clean) return null
    const id = companyId(clean)
    let c = map.get(id)
    if (!c) { c = { id, name: clean, contacts: [], deals: [], notes: [], openValue: 0, openDeals: 0, lastActivity: null }; map.set(id, c) }
    return c
  }
  for (const ct of contacts) {
    const c = entry(ct.company)
    if (!c) continue
    c.contacts.push(ct)
    c.lastActivity = newest(newest(c.lastActivity, ct.lastContactedAt), ct.activity[0]?.at)
  }
  for (const d of deals) {
    const c = entry(d.company)
    if (!c) continue
    c.deals.push(d)
    if (isOpen(d)) { c.openValue += d.value; c.openDeals += 1 }
    c.lastActivity = newest(newest(c.lastActivity, d.activity[0]?.at), d.stageSince)
  }
  const ownerOf = new Map<string, Company>()
  for (const c of map.values()) { ownerOf.set(c.id, c); for (const ct of c.contacts) ownerOf.set(ct.id, c); for (const d of c.deals) ownerOf.set(d.id, c) }
  for (const n of notes) {
    const c = n.link ? ownerOf.get(n.link.id) : undefined
    if (!c || !n.link || (n.link.type !== 'company' && n.link.type !== 'contact' && n.link.type !== 'deal')) continue
    c.notes.push(n)
    c.lastActivity = newest(c.lastActivity, n.updatedAt)
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export async function list(): Promise<Company[]> {
  const [contacts, deals, notes] = await Promise.all([contactsService.all(), dealsService.list(), notesService.list()])
  return buildCompanies(contacts, deals, notes)
}

/** One company by id (`co-<slug>`), or null when no contact or deal of the signed-in user mentions it. */
export async function get(id: string): Promise<Company | null> {
  return (await list()).find((c) => c.id === id) ?? null
}

/** Number of distinct companies: the sidebar Favorites "Companies" count, always equal to the length of `list()`. */
export async function count(): Promise<number> {
  return (await list()).length
}

/** Calls `fn` whenever contacts, deals or notes change. */
export function subscribeCompanies(fn: () => void): () => void {
  const a = subscribeContacts(fn)
  const b = subscribeDeals(fn)
  const c = subscribeNotes(fn)
  return () => { a(); b(); c() }
}

export const companiesService = { list, get, count }

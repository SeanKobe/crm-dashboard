import { companyId, contactId } from '../data/records'
import { stageLabel } from '../data/deals'
import type { RecordType } from '../types'
import { contactsService, subscribeContacts } from './contacts'
import { dealsService, subscribeDeals } from './deals'
import { notesService, subscribeNotes } from './notes'
import { projectsService, subscribeProjects } from './projects'

// One lookup for everything notes and deals can link to (deals, contacts, companies). Links store only { type, id };
// names come from here every time they are shown, so a rename shows up everywhere. Reads the deals and contacts services.
export interface RecordEntry {
  type: RecordType
  id: string
  name: string
  hint: string
  /** The record exists but is soft-deleted. */
  deleted: boolean
  /** A deleted record that can be brought back (contacts are soft-deleted; deals and companies are not). */
  canRestore: boolean
}

export async function listRecords(): Promise<RecordEntry[]> {
  const [deals, contacts, notes, projects] = await Promise.all([dealsService.list(), contactsService.directory(), notesService.list(), projectsService.list()])
  const out: RecordEntry[] = deals.map((d) => ({ type: 'deal', id: d.id, name: d.title, hint: `${d.company || 'No company'} · ${stageLabel(d.stage)}`, deleted: false, canRestore: false }))
  const companies = new Map<string, string>()
  for (const c of contacts) {
    out.push({ type: 'contact', id: c.id, name: c.name, hint: c.company || 'No company', deleted: c.deletedAt !== null, canRestore: c.deletedAt !== null })
    if (c.deletedAt === null && c.company) companies.set(companyId(c.company), c.company)
  }
  for (const n of notes) out.push({ type: 'note', id: n.id, name: n.title || 'Untitled note', hint: 'Note', deleted: false, canRestore: false })
  for (const p of projects) out.push({ type: 'project', id: p.id, name: p.name, hint: `${p.status}${p.archivedAt ? ' · Archived' : ''}`, deleted: false, canRestore: false })
  for (const d of deals) if (d.company) companies.set(companyId(d.company), d.company)
  for (const [id, name] of companies) out.push({ type: 'company', id, name, hint: 'Company', deleted: false, canRestore: false })
  return out
}

/** Brings a soft-deleted record back. Resolves false when that kind of record cannot be restored. */
export async function restoreRecord(type: RecordType, id: string): Promise<boolean> {
  if (type !== 'contact') return false
  await contactsService.restore([id])
  return true
}

/** Calls `fn` whenever deals or contacts change (any of them can change a name or delete a record). */
export function subscribeRecords(fn: () => void): () => void {
  const a = subscribeDeals(fn)
  const b = subscribeContacts(fn)
  const n = subscribeNotes(fn)
  const p = subscribeProjects(fn)
  return () => { a(); b(); n(); p() }
}

export const recordsService = { list: listRecords, restore: restoreRecord }
export { contactId }

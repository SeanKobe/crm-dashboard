import { seedContacts } from '../data/contacts'
import { owners } from '../data/deals'
import { demoNow, toLocalISO } from '../lib/dates'
import { toCsv } from '../lib/csv'
import { filterContacts, matchesQuery } from '../lib/contactsLogic'
import { makeId, remoteData } from '../lib/ids'
import type { Contact, ContactActivity, ContactPage, ContactPatch, ContactQuery, NewContactInput } from '../types'
import { createContactsStore } from './remote/contactsStore'
import { CURRENT_USER_ID, canReassign } from './session'

// Contacts data service (same pattern as notes and deals): async list / get / create / update / bulk update / delete / restore /
// import / export, backed by localStorage with a small simulated delay. Filtering, sorting and paging happen here, as an API would
// do them, so the page only asks for what it shows. Writes land immediately; only the response is delayed.

const STORAGE_KEY = 'crm.contacts.v1'
let delayMs = remoteData ? 0 : 150
let failReads = false

export interface ContactsServiceConfig { delayMs?: number; failReads?: boolean }
export function configureContactsService(c: ContactsServiceConfig): void {
  if (c.delayMs !== undefined) delayMs = c.delayMs
  if (c.failReads !== undefined) failReads = c.failReads
}

export class ContactsServiceError extends Error {
  constructor(message: string) { super(message); this.name = 'ContactsServiceError' }
}
/** Thrown by create / update / import when the email already belongs to another contact. */
export class DuplicateEmailError extends ContactsServiceError {
  constructor(public existingId: string) { super('A contact with this email already exists.'); this.name = 'DuplicateEmailError' }
}

export type ContactEvent = { type: 'upsert'; contacts: Contact[] }
const listeners = new Set<(e: ContactEvent) => void>()
export function subscribeContacts(fn: (e: ContactEvent) => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}
const emit = (contacts: Contact[]): void => listeners.forEach((l) => l({ type: 'upsert', contacts }))

// Supabase mode: contacts live in the database and this cache writes itself back (see services/remote). Demo mode: localStorage as before.
const store = remoteData ? createContactsStore((contacts) => emit(contacts)) : null
const ready = async (): Promise<void> => { if (store) await store.ensure() }
const assertCanAssign = (ownerId: string | undefined, current?: string): void => {
  if (ownerId !== undefined && ownerId !== (current ?? CURRENT_USER_ID) && !canReassign()) throw new ContactsServiceError('Only a manager or an admin can give a contact to someone else.')
}
/** Forget what was loaded (a different person signed in). */
export function resetContactsCache(): void { store?.reset() }

// ---- storage (the only place that knows about localStorage for contacts)
function read(): Contact[] {
  if (store) return store.get()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) { const parsed = JSON.parse(raw) as { contacts?: Contact[] }; if (Array.isArray(parsed.contacts)) return parsed.contacts }
  } catch { /* fall through to the seed */ }
  const seeded = seedContacts()
  write(seeded)
  return seeded
}
function write(contacts: Contact[]): void {
  if (store) { store.set(contacts); return }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ contacts })) } catch { /* storage blocked: stay in memory only */ }
}
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))
const respond = async <T,>(v: T): Promise<T> => { if (store) await store.flush(); await sleep(delayMs); return v }
const stamp = (): string => toLocalISO(demoNow())
const ownerName = (id: string): string => owners.find((o) => o.id === id)?.name ?? ''
let seq = 0
const actId = (): string => (remoteData ? crypto.randomUUID() : `${newId()}-a`)
const newId = (): string => makeId('ct', () => `${Date.now().toString(36)}${(seq++).toString(36)}`)
const live = (all: Contact[]): Contact[] => all.filter((c) => c.deletedAt === null)
const sameEmail = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase()

/** Replaces the given contacts in storage (by id) and notifies listeners. */
function save(changed: Contact[]): void {
  const byId = new Map(changed.map((c) => [c.id, c]))
  write(read().map((c) => byId.get(c.id) ?? c))
  emit(changed)
}

// ---- reads
export async function list(query: ContactQuery): Promise<ContactPage> {
  await ready()
  await sleep(delayMs)
  if (failReads) throw new ContactsServiceError('Could not load contacts.')
  const all = live(read())
  const matches = matchesQuery(all, query, ownerName)
  const pageSize = Math.max(1, query.pageSize)
  const pages = Math.max(1, Math.ceil(matches.length / pageSize))
  const page = Math.min(Math.max(1, query.page), pages)
  return { items: matches.slice((page - 1) * pageSize, page * pageSize), total: matches.length, totalAll: all.length, page, pageSize, matchingIds: matches.map((c) => c.id), allTags: [...new Set(all.flatMap((c) => c.tags))].sort() }
}

/** Every contact that is not soft-deleted (for reports and exports that need the whole set). */
export async function all(): Promise<Contact[]> {
  await ready()
  await sleep(delayMs)
  if (failReads) throw new ContactsServiceError('Could not load contacts.')
  return live(read())
}

/** Returns the contact even when soft-deleted (check `deletedAt`), or null when it does not exist. */
export async function get(id: string): Promise<Contact | null> {
  await ready()
  await sleep(delayMs)
  if (failReads) throw new ContactsServiceError('Could not load the contact.')
  return read().find((c) => c.id === id) ?? null
}

export async function findByEmail(email: string, excludeId?: string): Promise<Contact | null> {
  await ready()
  await sleep(delayMs / 2)
  return live(read()).find((c) => c.id !== excludeId && sameEmail(c.email, email)) ?? null
}

// ---- writes
export async function create(input: NewContactInput): Promise<Contact> {
  await ready()
  const dup = live(read()).find((c) => sameEmail(c.email, input.email))
  if (dup) throw new DuplicateEmailError(dup.id)
  assertCanAssign(input.ownerId)
  const at = stamp()
  const contact: Contact = {
    id: newId(), name: input.name.trim(), email: input.email.trim(), phone: input.phone?.trim() ?? '', company: input.company?.trim() ?? '', jobTitle: input.jobTitle?.trim() ?? '',
    status: input.status ?? 'New', source: input.source ?? 'Website', ownerId: input.ownerId ?? CURRENT_USER_ID, tags: input.tags ?? [], createdAt: at, lastContactedAt: null,
    dealIds: input.dealIds ?? [], noteIds: input.noteIds ?? [],
    activity: [{ id: actId(), kind: 'note', title: 'Contact created', description: 'Added to the CRM.', ownerId: input.ownerId ?? CURRENT_USER_ID, at }],
    deletedAt: null,
  }
  write([contact, ...read()])
  emit([contact])
  return respond(contact)
}

export async function update(id: string, patch: ContactPatch): Promise<Contact> {
  await ready()
  const all = read()
  const current = all.find((c) => c.id === id)
  if (!current) throw new ContactsServiceError('This contact no longer exists.')
  if (patch.email !== undefined) {
    const dup = live(all).find((c) => c.id !== id && sameEmail(c.email, patch.email ?? ''))
    if (dup) throw new DuplicateEmailError(dup.id)
  }
  assertCanAssign(patch.ownerId, current.ownerId)
  const next: Contact = { ...current, ...patch }
  save([next])
  return respond(next)
}

/** Adds a timeline entry (newest first). */
export async function addActivity(id: string, entry: Pick<ContactActivity, 'kind' | 'title' | 'description'>, ownerId = CURRENT_USER_ID): Promise<Contact> {
  await ready()
  const current = read().find((c) => c.id === id)
  if (!current) throw new ContactsServiceError('This contact no longer exists.')
  const a: ContactActivity = { ...entry, id: actId(), ownerId, at: stamp() }
  return update(id, { activity: [a, ...current.activity] })
}

export interface BulkResult { updated: Contact[]; /** The same contacts before the change, for Undo. */ previous: Contact[] }

/** Applies one patch to many contacts. A status change also adds a timeline entry to each. */
export async function bulkUpdate(ids: string[], patch: ContactPatch | ((c: Contact) => ContactPatch)): Promise<BulkResult> {
  await ready()
  const previous = read().filter((c) => ids.includes(c.id))
  const updated = previous.map((c) => {
    const p = typeof patch === 'function' ? patch(c) : patch
    assertCanAssign(p.ownerId, c.ownerId)
    const activity = p.status && p.status !== c.status ? [{ id: actId(), kind: 'status' as const, title: `Status changed to ${p.status}`, description: `From ${c.status} to ${p.status}.`, ownerId: CURRENT_USER_ID, at: stamp() }, ...(p.activity ?? c.activity)] : p.activity
    return { ...c, ...p, ...(activity ? { activity } : {}) }
  })
  save(updated)
  return respond({ updated, previous })
}

/** Puts contacts back exactly as they were (used by Undo after a bulk change or an import). */
export async function bulkRestoreValues(previous: Contact[]): Promise<void> {
  await ready()
  save(previous)
  await respond(undefined)
}

/** Soft delete: contacts leave `list` but can be brought back with `restore`. */
async function remove(ids: string[]): Promise<void> {
  await ready()
  const at = stamp()
  save(read().filter((c) => ids.includes(c.id)).map((c) => ({ ...c, deletedAt: at })))
  await respond(undefined)
}

export async function restore(ids: string[]): Promise<void> {
  await ready()
  save(read().filter((c) => ids.includes(c.id)).map((c) => ({ ...c, deletedAt: null })))
  await respond(undefined)
}

export interface ImportOutcome { created: Contact[]; skipped: { row: number; reason: string }[] }
/** Creates many contacts at once. Rows whose email already exists (or repeats inside the file) are skipped with a reason. */
export async function importContacts(rows: NewContactInput[]): Promise<ImportOutcome> {
  await ready()
  const existing = live(read())
  const seen = new Set(existing.map((c) => c.email.toLowerCase()))
  const created: Contact[] = []
  const skipped: ImportOutcome['skipped'] = []
  const at = stamp()
  rows.forEach((r, i) => {
    const key = r.email.trim().toLowerCase()
    if (seen.has(key)) { skipped.push({ row: i + 1, reason: 'A contact with this email already exists.' }); return }
    seen.add(key)
    created.push({
      id: newId(), name: r.name.trim(), email: r.email.trim(), phone: r.phone?.trim() ?? '', company: r.company?.trim() ?? '', jobTitle: r.jobTitle?.trim() ?? '', status: r.status ?? 'New', source: r.source ?? 'Website',
      ownerId: r.ownerId ?? CURRENT_USER_ID, tags: r.tags ?? [], createdAt: at, lastContactedAt: null, dealIds: [], noteIds: [],
      activity: [{ id: actId(), kind: 'note', title: 'Imported from CSV', description: 'Added by a CSV import.', ownerId: CURRENT_USER_ID, at }], deletedAt: null,
    })
  })
  write([...created, ...read()])
  emit(created)
  return respond({ created, skipped })
}

export const EXPORT_COLUMNS = ['Name', 'Email', 'Phone', 'Company', 'Job title', 'Status', 'Source', 'Owner', 'Tags', 'Created', 'Last contacted'] as const

/** CSV text for the contacts matching a query, or for specific ids. The caller decides how to hand it to the user (download). */
export async function exportContacts(target: { query: ContactQuery } | { ids: string[] }): Promise<string> {
  await ready()
  await sleep(delayMs)
  const all = live(read())
  const rows = 'ids' in target ? all.filter((c) => target.ids.includes(c.id)) : filterContacts(all, target.query.filters)
  return toCsv([[...EXPORT_COLUMNS], ...rows.map((c) => [c.name, c.email, c.phone, c.company, c.jobTitle, c.status, c.source, ownerName(c.ownerId), c.tags.join('; '), c.createdAt.slice(0, 10), c.lastContactedAt?.slice(0, 10) ?? ''])])
}

/** Every contact, soft-deleted ones included, with only what a lookup needs (name, company, deleted flag). */
export interface ContactDirectoryEntry { id: string; name: string; company: string; deletedAt: string | null }
export async function directory(): Promise<ContactDirectoryEntry[]> {
  await ready()
  await sleep(delayMs / 2)
  return read().map((c) => ({ id: c.id, name: c.name, company: c.company, deletedAt: c.deletedAt }))
}

/** Which of these emails already belong to a contact (lower-cased). Used by the CSV import preview. */
export async function existingEmails(emails: string[]): Promise<string[]> {
  await ready()
  await sleep(delayMs / 2)
  const have = new Set(live(read()).map((c) => c.email.toLowerCase()))
  return [...new Set(emails.map((e) => e.trim().toLowerCase()))].filter((e) => have.has(e))
}

export { remove as delete }
export const contactsService = { list, all, get, findByEmail, existingEmails, directory, create, update, addActivity, bulkUpdate, bulkRestoreValues, delete: remove, restore, importContacts, export: exportContacts }
export type ContactsService = typeof contactsService

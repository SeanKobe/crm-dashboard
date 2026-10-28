import { defaultFilters, defaultSort, seedDeals, stageLabel } from '../data/deals'
import { contactId } from '../data/records'
import { DEMO_TODAY, addDays, demoNow, toLocalISO } from '../lib/dates'
import { money, newId } from '../lib/dealsLogic'
import { remoteData } from '../lib/ids'
import type { DealActivity, DealFilters, DealSort, DealView, LostReason, NewDealInput, PipelineDeal, Stage } from '../types'
import { createDealsStore } from './remote/dealsStore'
import { mirrorPref } from './userPrefs'
import { CURRENT_USER_ID, canReassign } from './session'

// Deals data service (same pattern as services/notes.ts). Every read and write goes through these async functions;
// components never touch storage. Today: localStorage plus a small simulated delay. To go full stack, keep the signatures
// and replace the bodies with fetch calls (GET /deals, POST /deals, PATCH /deals/:id, POST /deals/:id/move, ...).
// Writes happen immediately and only the response is delayed, so nothing is lost if the page closes mid-request.

const STORAGE_KEY = 'crm.deals.v1'
export { CURRENT_USER_ID }
let delayMs = remoteData ? 0 : 150

export interface DealsServiceConfig { delayMs?: number }
export function configureDealsService(config: DealsServiceConfig): void {
  if (config.delayMs !== undefined) delayMs = config.delayMs
}

export class DealsServiceError extends Error {
  constructor(message: string) { super(message); this.name = 'DealsServiceError' }
}

// ---- change events
export interface DealPrefs {
  filters: DealFilters
  view: DealView
  sort: DealSort
  collapsed: Stage[]
}
export type DealEvent = { type: 'deals'; deals: PipelineDeal[] } | { type: 'reset'; deals: PipelineDeal[]; prefs: DealPrefs }
const listeners = new Set<(e: DealEvent) => void>()
export function subscribeDeals(fn: (e: DealEvent) => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}
const emit = (e: DealEvent): void => listeners.forEach((l) => l(e))

// Supabase mode: the deals live in the database and this cache writes itself back (see services/remote). Demo mode: localStorage as before.
const store = remoteData ? createDealsStore((deals) => emit({ type: 'deals', deals })) : null
const ready = async (): Promise<void> => { if (store) await store.ensure() }
const assertCanAssign = (ownerId: string, current?: string): void => {
  if (ownerId !== (current ?? CURRENT_USER_ID) && !canReassign()) throw new DealsServiceError('Only a manager or an admin can give a deal to someone else.')
}
/** Forget what was loaded (a different person signed in). */
export function resetDealsCache(): void { store?.reset() }

// ---- storage (the only place that knows about localStorage for deals)
const defaultPrefs = (): DealPrefs => ({ filters: defaultFilters, view: 'board', sort: defaultSort, collapsed: ['lost'] })
// Versions: 1 (no field) kept the contact only as a typed name; 2 adds `contactId` for contacts that exist in Contacts.
const STORAGE_VERSION = 2
type Stored = Partial<DealPrefs> & { version?: number; deals?: PipelineDeal[] }

/** Brings deals saved by an older version of the app up to the current shape. */
export function migrateDeals(version: number, deals: PipelineDeal[]): PipelineDeal[] {
  if (version >= 2) return deals
  const known = new Set(seedDeals().map((d) => d.contact))
  return deals.map((d) => (d.contactId || !d.contact || !known.has(d.contact) ? d : { ...d, contactId: contactId(d.contact) }))
}

function readStored(): Stored | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Stored) : null
  } catch {
    return null
  }
}
function writeStored(patch: Stored): void {
  try {
    const prev = readStored() ?? {}
    // Only a write that carries deals may stamp the current version; a preferences-only write must not mark old deals as migrated.
    const version = 'deals' in patch ? STORAGE_VERSION : prev.version
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prev, ...(version !== undefined ? { version } : {}), ...patch }))
  } catch { /* storage blocked: keep working in memory */ }
}
function readDeals(): PipelineDeal[] {
  if (store) return store.get()
  const s = readStored()
  if (s && Array.isArray(s.deals) && s.deals.every((d) => d && typeof d.id === 'string' && typeof d.stage === 'string')) {
    const version = typeof s.version === 'number' ? s.version : 1
    if (version >= STORAGE_VERSION) return s.deals
    const migrated = migrateDeals(version, s.deals)
    writeStored({ deals: migrated })
    return migrated
  }
  const seeded = seedDeals()
  writeStored({ deals: seeded })
  return seeded
}
function writeDeals(deals: PipelineDeal[]): void {
  if (store) { store.set(deals); emit({ type: 'deals', deals }); return }
  writeStored({ deals })
  emit({ type: 'deals', deals })
}

/** UI preferences stored next to the deals: filters, view, sort and collapsed columns. */
export function loadDealPrefs(): DealPrefs {
  const s = readStored()
  const base = defaultPrefs()
  if (!s) return base
  return {
    filters: { ...defaultFilters, ...s.filters },
    view: s.view === 'list' ? 'list' : 'board',
    sort: s.sort && typeof s.sort.key === 'string' ? s.sort : defaultSort,
    collapsed: Array.isArray(s.collapsed) ? s.collapsed : base.collapsed,
  }
}
export function saveDealPrefs(patch: Partial<DealPrefs>): void { writeStored(patch); mirrorPref('deals') }

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))
async function respond<T>(value: T): Promise<T> {
  if (store) await store.flush()
  await sleep(delayMs)
  return value
}

// ---- reads
export async function list(): Promise<PipelineDeal[]> {
  await ready()
  await sleep(delayMs)
  return readDeals()
}
export async function get(id: string): Promise<PipelineDeal | null> {
  await ready()
  await sleep(delayMs)
  return readDeals().find((d) => d.id === id) ?? null
}

// ---- writes
const hintFor = (d: { company: string; value: number }): string => `${d.company || 'No company'} · ${money(d.value)}`

export async function create(input: NewDealInput): Promise<PipelineDeal> {
  await ready()
  assertCanAssign(input.ownerId ?? CURRENT_USER_ID)
  const at = toLocalISO(demoNow())
  const deal: PipelineDeal = {
    id: newId('d'), group: 'Deals', icon: 'handshake', title: input.name.trim(), hint: hintFor({ company: input.company.trim(), value: input.value }),
    company: input.company.trim(), contact: input.contact?.trim() ?? '', value: input.value, stage: input.stage, ownerId: input.ownerId ?? CURRENT_USER_ID,
    closeDate: input.closeDate || addDays(DEMO_TODAY, 30), contactId: input.contactId, priority: input.priority ?? 'medium', stageSince: at, nextStep: '', notes: '', lostReason: input.stage === 'lost' ? 'Other' : undefined,
    activity: [{ id: newId('a'), kind: 'note', title: 'Deal created', description: `Added to ${stageLabel(input.stage)}.`, ownerId: CURRENT_USER_ID, at }],
  }
  writeDeals([deal, ...readDeals()])
  return respond(deal)
}

export async function update(id: string, patch: Partial<PipelineDeal>): Promise<PipelineDeal> {
  await ready()
  const all = readDeals()
  const current = all.find((d) => d.id === id)
  if (!current) throw new DealsServiceError('This deal no longer exists.')
  if (patch.ownerId !== undefined) assertCanAssign(patch.ownerId, current.ownerId)
  const merged = { ...current, ...patch }
  const deal: PipelineDeal = { ...merged, hint: hintFor(merged) }
  writeDeals(all.map((d) => (d.id === id ? deal : d)))
  return respond(deal)
}

export async function addActivity(id: string, entry: Pick<DealActivity, 'kind' | 'title' | 'description'>): Promise<PipelineDeal> {
  await ready()
  const current = readDeals().find((d) => d.id === id)
  if (!current) throw new DealsServiceError('This deal no longer exists.')
  const activity: DealActivity = { ...entry, id: newId('a'), ownerId: CURRENT_USER_ID, at: toLocalISO(demoNow()) }
  return update(id, { activity: [activity, ...current.activity] })
}

/** What `undoMove` needs to put a deal back exactly where it was. */
export interface MoveUndo { stage: Stage; stageSince: string; lostReason?: LostReason; entryId: string; index: number }
export interface MoveOutcome { deal: PipelineDeal; from: Stage; to: Stage; undo: MoveUndo }

function stageEntry(d: PipelineDeal, to: Stage, reason: LostReason | undefined): DealActivity {
  const at = toLocalISO(demoNow())
  if (to === 'won') return { id: newId('a'), kind: 'won', title: `Deal won: ${d.title}`, description: `Closed at ${money(d.value)}.`, ownerId: CURRENT_USER_ID, at }
  if (to === 'lost') return { id: newId('a'), kind: 'stage', title: 'Moved to Lost', description: `Reason: ${reason ?? 'Other'}. From ${stageLabel(d.stage)} to Lost.`, ownerId: CURRENT_USER_ID, at }
  return { id: newId('a'), kind: 'stage', title: `Moved to ${stageLabel(to)}`, description: `From ${stageLabel(d.stage)} to ${stageLabel(to)}.`, ownerId: CURRENT_USER_ID, at }
}

/** Moves a deal to another stage: it lands at the top of the column and gets a timeline entry. Null when it is already there. */
export async function moveStage(id: string, stage: Stage, reason?: LostReason): Promise<MoveOutcome | null> {
  await ready()
  const all = readDeals()
  const d = all.find((x) => x.id === id)
  if (!d || d.stage === stage) return null
  const entry = stageEntry(d, stage, reason)
  const undo: MoveUndo = { stage: d.stage, stageSince: d.stageSince, lostReason: d.lostReason, entryId: entry.id, index: all.indexOf(d) }
  const moved: PipelineDeal = { ...d, stage, stageSince: entry.at, lostReason: stage === 'lost' ? reason : undefined, activity: [entry, ...d.activity] }
  writeDeals([moved, ...all.filter((x) => x.id !== id)])
  return respond({ deal: d, from: d.stage, to: stage, undo })
}

export async function undoMove(id: string, undo: MoveUndo): Promise<void> {
  await ready()
  const all = readDeals()
  const d = all.find((x) => x.id === id)
  if (!d) return
  const back: PipelineDeal = { ...d, stage: undo.stage, stageSince: undo.stageSince, lostReason: undo.lostReason, activity: d.activity.filter((e) => e.id !== undo.entryId) }
  const rest = all.filter((x) => x.id !== id)
  rest.splice(Math.min(undo.index, rest.length), 0, back)
  writeDeals(rest)
  await respond(undefined)
}

/** What `restore` needs to put deleted deals back at their old positions. */
export interface DeletedDeals { items: { deal: PipelineDeal; index: number }[] }

async function remove(ids: string[]): Promise<DeletedDeals> {
  await ready()
  const all = readDeals()
  const items = all.map((deal, index) => ({ deal, index })).filter((x) => ids.includes(x.deal.id))
  writeDeals(all.filter((d) => !ids.includes(d.id)))
  return respond({ items })
}

export async function restore(deleted: DeletedDeals): Promise<void> {
  await ready()
  const deals = [...readDeals()]
  for (const it of [...deleted.items].sort((a, b) => a.index - b.index)) if (!deals.some((d) => d.id === it.deal.id)) deals.splice(Math.min(it.index, deals.length), 0, it.deal)
  writeDeals(deals)
  await respond(undefined)
}

/** Restores the 24 sample deals and the default preferences. */
export async function reset(): Promise<void> {
  // With a database there is no sample data to restore from the browser: only the view settings go back to their defaults.
  const deals = store ? (await ready(), store.get()) : seedDeals()
  const prefs = defaultPrefs()
  writeStored(store ? prefs : { deals, ...prefs })
  emit({ type: 'reset', deals, prefs })
  await respond(undefined)
}

export { remove as delete }
export const dealsService = { list, get, create, update, moveStage, undoMove, delete: remove, restore, reset, addActivity }
export type DealsService = typeof dealsService

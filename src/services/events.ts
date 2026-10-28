import { seedEvents } from '../data/events'
import { dateOf } from '../lib/calendarLogic'
import { demoNow, toLocalISO } from '../lib/dates'
import { makeId, remoteData } from '../lib/ids'
import type { EventPatch, EventRange, NewEventInput, ScheduleEvent } from '../types'
import { createEventsStore } from './remote/eventsStore'
import { CURRENT_USER_ID, canReassign } from './session'

// Calendar events service (same pattern as notes, deals and contacts): async list by date range / get / create / update / delete (soft) / restore,
// localStorage plus a small simulated delay, writes land immediately and only the response is delayed. The Dashboard calendar card and the sidebar
// Meetings count read from here too. To go full stack keep the signatures and swap the bodies for fetch calls.

const STORAGE_KEY = 'crm.events.v1'
let delayMs = remoteData ? 0 : 150
let failReads = false

export interface EventsServiceConfig { delayMs?: number; failReads?: boolean }
export function configureEventsService(c: EventsServiceConfig): void {
  if (c.delayMs !== undefined) delayMs = c.delayMs
  if (c.failReads !== undefined) failReads = c.failReads
}
export class EventsServiceError extends Error {
  constructor(message: string) { super(message); this.name = 'EventsServiceError' }
}

export type EventsEvent = { type: 'upsert'; events: ScheduleEvent[] }
const listeners = new Set<(e: EventsEvent) => void>()
export function subscribeEvents(fn: (e: EventsEvent) => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}
const emit = (events: ScheduleEvent[]): void => listeners.forEach((l) => l({ type: 'upsert', events }))

// Supabase mode: events live in the database and this cache writes itself back (see services/remote). Demo mode: localStorage as before.
const store = remoteData ? createEventsStore((events) => emit(events)) : null
const ready = async (): Promise<void> => { if (store) await store.ensure() }
const assertCanAssign = (ownerId: string | undefined, current?: string): void => {
  if (ownerId !== undefined && ownerId !== (current ?? CURRENT_USER_ID) && !canReassign()) throw new EventsServiceError('Only a manager or an admin can give an event to someone else.')
}
/** Forget what was loaded (a different person signed in). */
export function resetEventsCache(): void { store?.reset() }

// ---- storage. Versions: 0 (no field) may lack newer fields; 1 is complete.
const STORAGE_VERSION = 1

/** Brings events saved by an older version of the app up to the current shape (missing fields get defaults). */
export function migrateEvents(version: number, events: Partial<ScheduleEvent>[]): ScheduleEvent[] {
  if (version >= STORAGE_VERSION) return events as ScheduleEvent[]
  return events.map((e) => ({
    id: String(e.id), title: e.title ?? 'Untitled event', type: e.type ?? 'Meeting', start: e.start ?? '', end: e.end ?? e.start ?? '', allDay: e.allDay ?? false,
    platform: e.platform ?? null, location: e.location ?? '', attendees: e.attendees ?? [], links: e.links ?? [], description: e.description ?? '', status: e.status ?? 'Scheduled',
    ownerId: e.ownerId ?? 'o1', createdAt: e.createdAt ?? e.start ?? '', updatedAt: e.updatedAt ?? e.start ?? '', deletedAt: e.deletedAt ?? null,
  }))
}

function read(): ScheduleEvent[] {
  if (store) return store.get()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { version?: number; events?: Partial<ScheduleEvent>[] }
      if (Array.isArray(parsed.events)) {
        const version = typeof parsed.version === 'number' ? parsed.version : 0
        if (version >= STORAGE_VERSION) return parsed.events as ScheduleEvent[]
        const migrated = migrateEvents(version, parsed.events)
        write(migrated)
        return migrated
      }
    }
  } catch { /* fall through to the seed */ }
  const seeded = seedEvents()
  write(seeded)
  return seeded
}
function write(events: ScheduleEvent[]): void {
  if (store) { store.set(events); return }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, events })) } catch { /* storage blocked: stay in memory only */ }
}
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))
const respond = async <T,>(v: T): Promise<T> => { if (store) await store.flush(); await sleep(delayMs); return v }
const stamp = (): string => toLocalISO(demoNow())
let seq = 0
const newId = (): string => makeId('ev', () => `${Date.now().toString(36)}${(seq++).toString(36)}`)
const live = (all: ScheduleEvent[]): ScheduleEvent[] => all.filter((e) => e.deletedAt === null)
const overlaps = (e: ScheduleEvent, r: EventRange): boolean => dateOf(e.start) <= r.to && dateOf(e.end) >= r.from

function save(changed: ScheduleEvent[]): void {
  const byId = new Map(changed.map((e) => [e.id, e]))
  write(read().map((e) => byId.get(e.id) ?? e))
  emit(changed)
}

export interface EventListOptions {
  /** Only events linked to this record id. */
  linkId?: string
  /** Only events with this attendee id (owner or contact). */
  attendeeId?: string
}

/** Events (not deleted) that touch the date range, ordered by start. */
export async function list(range: EventRange, options: EventListOptions = {}): Promise<ScheduleEvent[]> {
  await ready()
  await sleep(delayMs)
  if (failReads) throw new EventsServiceError('Could not load events.')
  return live(read())
    .filter((e) => overlaps(e, range) && (!options.linkId || e.links.some((l) => l.id === options.linkId)) && (!options.attendeeId || e.attendees.some((a) => a.id === options.attendeeId)))
    .sort((a, b) => a.start.localeCompare(b.start))
}

/** Returns the event even when soft-deleted (check `deletedAt`), or null when it does not exist. */
export async function get(id: string): Promise<ScheduleEvent | null> {
  await ready()
  await sleep(delayMs)
  if (failReads) throw new EventsServiceError('Could not load the event.')
  return read().find((e) => e.id === id) ?? null
}

export async function create(input: NewEventInput): Promise<ScheduleEvent> {
  await ready()
  assertCanAssign(input.ownerId)
  const at = stamp()
  const event: ScheduleEvent = {
    id: newId(), title: input.title.trim(), type: input.type ?? 'Meeting', start: input.start, end: input.end, allDay: input.allDay ?? false, platform: input.platform ?? null, location: input.location ?? '',
    attendees: input.attendees ?? [], links: input.links ?? [], description: input.description ?? '', status: input.status ?? 'Scheduled', ownerId: input.ownerId ?? CURRENT_USER_ID, createdAt: at, updatedAt: at, deletedAt: null,
  }
  write([event, ...read()])
  emit([event])
  return respond(event)
}

export async function update(id: string, patch: EventPatch): Promise<ScheduleEvent> {
  await ready()
  const current = read().find((e) => e.id === id)
  if (!current) throw new EventsServiceError('This event no longer exists.')
  assertCanAssign(patch.ownerId, current.ownerId)
  const next: ScheduleEvent = { ...current, ...patch, updatedAt: stamp() }
  save([next])
  return respond(next)
}

/** Soft delete: the event leaves `list` but can be brought back with `restore`. */
async function remove(id: string): Promise<ScheduleEvent> {
  await ready()
  const current = read().find((e) => e.id === id)
  if (!current) throw new EventsServiceError('This event no longer exists.')
  const next: ScheduleEvent = { ...current, deletedAt: stamp() }
  save([next])
  return respond(next)
}

export async function restore(id: string): Promise<ScheduleEvent> {
  await ready()
  const current = read().find((e) => e.id === id)
  if (!current) throw new EventsServiceError('This event no longer exists.')
  const next: ScheduleEvent = { ...current, deletedAt: null }
  save([next])
  return respond(next)
}

/** Number of meetings (type Meeting, not deleted): the sidebar Favorites "Meetings" count. */
export async function countMeetings(): Promise<number> {
  await ready()
  await sleep(delayMs / 2)
  return live(read()).filter((e) => e.type === 'Meeting').length
}

export { remove as delete }
export const eventsService = { list, listMeetings, get, create, update, delete: remove, restore, countMeetings }
export type EventsService = typeof eventsService

/** Every meeting (type Meeting, not deleted), ordered by start. The Meetings page and the sidebar count read the same rows. */
export async function listMeetings(): Promise<ScheduleEvent[]> {
  await ready()
  await sleep(delayMs)
  if (failReads) throw new EventsServiceError('Could not load meetings.')
  return live(read()).filter((e) => e.type === 'Meeting').sort((a, b) => a.start.localeCompare(b.start))
}

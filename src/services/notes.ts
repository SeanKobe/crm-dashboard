import { seedNotes } from '../data/notes'
import { demoNow, toLocalISO } from '../lib/dates'
import { makeId, remoteData } from '../lib/ids'
import type { Note, NoteInput, NoteListOptions, NotePatch } from '../types'
import { createNotesStore } from './remote/notesStore'

// Notes data service. Every read and write goes through these async functions; components never touch storage.
// Today they use localStorage with a small simulated network delay. To go full stack, keep the signatures and replace the
// bodies (and `STORAGE`/`delay`) with fetch calls, for example GET /notes, POST /notes, PATCH /notes/:id, DELETE /notes/:id,
// POST /notes/:id/restore. Soft delete means `delete` only marks `deletedAt`; `restore` clears it.

const STORAGE_KEY = 'crm.notes.v1'
let delayMs = remoteData ? 0 : 150
let failReads = false
let failWritesLeft = 0

export interface NotesServiceConfig {
  /** Simulated latency in milliseconds. */
  delayMs?: number
  /** Make `list` / `get` reject (used by the ?error=1 test hook). */
  failReads?: boolean
  /** Make the next N `update` calls reject (used by the ?saveError=1 test hook). */
  failNextUpdates?: number
}

export function configureNotesService(config: NotesServiceConfig): void {
  if (config.delayMs !== undefined) delayMs = config.delayMs
  if (config.failReads !== undefined) failReads = config.failReads
  if (config.failNextUpdates !== undefined) failWritesLeft = config.failNextUpdates
}

export class NotesServiceError extends Error {
  constructor(message: string) { super(message); this.name = 'NotesServiceError' }
}

// ---- change events (so several components can stay in sync)
export type NoteEvent = { type: 'upsert'; note: Note } | { type: 'reset' }
type Listener = (e: NoteEvent) => void
const listeners = new Set<Listener>()
export function subscribeNotes(fn: Listener): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}
const emit = (e: NoteEvent): void => listeners.forEach((l) => l(e))

// Supabase mode: notes live in the database and this cache writes itself back (see services/remote). Demo mode: localStorage as before.
const store = remoteData ? createNotesStore(() => emit({ type: 'reset' })) : null
const ready = async (): Promise<void> => { if (store) await store.ensure() }
/** Forget what was loaded (a different person signed in). */
export function resetNotesCache(): void { store?.reset() }

// ---- storage (the only place that knows about localStorage)
// Versions: 1 (no field) stored a name snapshot inside each link; 2 stores only { type, id }.
const STORAGE_VERSION = 2

/** Brings notes saved by an older version of the app up to the current shape. */
export function migrateNotes(version: number, notes: Note[]): Note[] {
  let out = notes
  if (version < 2) out = out.map((n) => (n.link ? { ...n, link: { type: n.link.type, id: n.link.id } } : n))
  return out
}

function read(): Note[] {
  if (store) return store.get()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { version?: number; notes?: Note[] }
      if (Array.isArray(parsed.notes)) {
        const version = typeof parsed.version === 'number' ? parsed.version : 1
        if (version >= STORAGE_VERSION) return parsed.notes
        const migrated = migrateNotes(version, parsed.notes)
        write(migrated)
        return migrated
      }
    }
  } catch { /* fall through to the seed */ }
  const seeded = seedNotes()
  write(seeded)
  return seeded
}
function write(notes: Note[]): void {
  if (store) { store.set(notes); return }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, notes })) } catch { /* storage blocked: stay in memory only */ }
}
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))
const now = (): string => toLocalISO(demoNow())
let seq = 0
const newId = (): string => makeId('n', () => `${Date.now().toString(36)}${(seq++).toString(36)}`)

/** Writes happen immediately and only the response is delayed, so work is never lost if the page closes mid-request. */
async function respond<T>(value: T): Promise<T> {
  if (store) await store.flush()
  await sleep(delayMs)
  return value
}

export async function list(options: NoteListOptions = {}): Promise<Note[]> {
  await ready()
  await sleep(delayMs)
  if (failReads) throw new NotesServiceError('Could not load notes.')
  const all = read().filter((n) => n.deletedAt === null)
  return options.linkId ? all.filter((n) => n.link?.id === options.linkId) : all
}

/** Returns the note even when it is soft-deleted (check `deletedAt`), or null when it does not exist. */
export async function get(id: string): Promise<Note | null> {
  await ready()
  await sleep(delayMs)
  if (failReads) throw new NotesServiceError('Could not load the note.')
  return read().find((n) => n.id === id) ?? null
}

export async function create(input: NoteInput = {}): Promise<Note> {
  await ready()
  const stamp = now()
  const note: Note = { id: newId(), title: input.title ?? '', body: input.body ?? '', tags: input.tags ?? [], pinned: input.pinned ?? false, link: input.link ?? null, createdAt: stamp, updatedAt: stamp, deletedAt: null }
  write([note, ...read()])
  emit({ type: 'upsert', note })
  return respond(note)
}

export async function update(id: string, patch: NotePatch): Promise<Note> {
  await ready()
  if (failWritesLeft > 0) { failWritesLeft -= 1; await sleep(delayMs); throw new NotesServiceError('Could not save the note.') }
  const all = read()
  const current = all.find((n) => n.id === id)
  if (!current) throw new NotesServiceError('This note no longer exists.')
  const note: Note = { ...current, ...patch, updatedAt: now() }
  write(all.map((n) => (n.id === id ? note : n)))
  emit({ type: 'upsert', note })
  return respond(note)
}

/** Soft delete: the note disappears from `list` but can be brought back with `restore`. */
async function remove(id: string): Promise<Note> {
  await ready()
  const all = read()
  const current = all.find((n) => n.id === id)
  if (!current) throw new NotesServiceError('This note no longer exists.')
  const note: Note = { ...current, deletedAt: now() }
  write(all.map((n) => (n.id === id ? note : n)))
  emit({ type: 'upsert', note })
  return respond(note)
}

export async function restore(id: string): Promise<Note> {
  await ready()
  const all = read()
  const current = all.find((n) => n.id === id)
  if (!current) throw new NotesServiceError('This note no longer exists.')
  const note: Note = { ...current, deletedAt: null }
  write(all.map((n) => (n.id === id ? note : n)))
  emit({ type: 'upsert', note })
  return respond(note)
}

export { remove as delete }

export const notesService = { list, get, create, update, delete: remove, restore }
export type NotesService = typeof notesService

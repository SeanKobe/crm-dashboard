import { seedProjects } from '../data/projects'
import { demoNow, toLocalISO } from '../lib/dates'
import { remoteData } from '../lib/ids'
import { createProjectsStore } from './remote/projectsStore'
import { CURRENT_USER_ID, canReassign } from './session'
import type { NewProjectInput, NewTaskInput, Project, ProjectActivity, ProjectActivityKind, ProjectPatch, ProjectTask, TaskPatch } from '../types'

// Projects service (same pattern as notes, deals, contacts and events): async list / get / create / update / delete (soft) / restore / archive,
// plus the task operations, backed by localStorage with a small simulated delay. Writes land immediately and only the response is delayed.
// The sidebar Projects group, the Projects page and the Deal and Contact drawers all read from here. To go full stack keep the signatures
// and swap the bodies for fetch calls.
const STORAGE_KEY = 'crm.projects.v1'
let delayMs = remoteData ? 0 : 150
let failReads = false

export interface ProjectsServiceConfig { delayMs?: number; failReads?: boolean }
export function configureProjectsService(c: ProjectsServiceConfig): void {
  if (c.delayMs !== undefined) delayMs = c.delayMs
  if (c.failReads !== undefined) failReads = c.failReads
}
export class ProjectsServiceError extends Error {
  constructor(message: string) { super(message); this.name = 'ProjectsServiceError' }
}
export class DuplicateProjectError extends ProjectsServiceError {
  constructor(name: string) { super(`A project named “${name}” already exists.`); this.name = 'DuplicateProjectError' }
}

export type ProjectsEvent = { type: 'upsert'; projects: Project[] }
const listeners = new Set<(e: ProjectsEvent) => void>()
export function subscribeProjects(fn: (e: ProjectsEvent) => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}
const emit = (projects: Project[]): void => listeners.forEach((l) => l({ type: 'upsert', projects }))

// Supabase mode: projects and their tasks live in the database and this cache writes itself back (see services/remote). Demo mode: localStorage as before.
const store = remoteData ? createProjectsStore((projects) => emit(projects)) : null
const ready = async (): Promise<void> => { if (store) await store.ensure() }
const assertCanAssign = (ownerId: string | undefined, current?: string): void => {
  if (ownerId !== undefined && ownerId !== (current ?? CURRENT_USER_ID) && !canReassign()) throw new ProjectsServiceError('Only a manager or an admin can give a project to someone else.')
}
/** Forget what was loaded (a different person signed in). */
export function resetProjectsCache(): void { store?.reset() }

// ---- storage. Versions: 0 (no version) may lack newer fields; 1 is complete.
const STORAGE_VERSION = 1

/** Brings projects saved by an older version of the app up to the current shape (missing fields get defaults). */
export function migrateProjects(version: number, projects: Partial<Project>[]): Project[] {
  if (version >= STORAGE_VERSION) return projects as Project[]
  return projects.map((p) => ({
    id: String(p.id),
    name: p.name ?? 'Untitled project',
    description: p.description ?? '',
    status: p.status ?? 'Planned',
    ownerId: p.ownerId ?? CURRENT_USER_ID,
    memberIds: p.memberIds ?? [],
    dueDate: p.dueDate ?? '',
    links: p.links ?? [],
    tasks: (p.tasks ?? []).map((t) => ({ id: t.id, title: t.title, done: t.done ?? false, assigneeId: t.assigneeId ?? '', dueDate: t.dueDate ?? '', priority: t.priority ?? 'medium', completedAt: t.completedAt ?? null, createdAt: t.createdAt ?? p.createdAt ?? '' })),
    activity: p.activity ?? [],
    archivedAt: p.archivedAt ?? null,
    deletedAt: p.deletedAt ?? null,
    createdAt: p.createdAt ?? '',
    updatedAt: p.updatedAt ?? p.createdAt ?? '',
  }))
}

function read(): Project[] {
  if (store) return store.get()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { version?: number; projects?: Partial<Project>[] }
      if (Array.isArray(parsed.projects)) {
        const version = typeof parsed.version === 'number' ? parsed.version : 0
        if (version >= STORAGE_VERSION) return parsed.projects as Project[]
        const migrated = migrateProjects(version, parsed.projects)
        write(migrated)
        return migrated
      }
    }
  } catch { /* fall through to the seed */ }
  const seeded = seedProjects()
  write(seeded)
  return seeded
}
function write(projects: Project[]): void {
  if (store) { store.set(projects); return }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, projects })) } catch { /* storage blocked: stay in memory only */ }
}
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))
const respond = async <T,>(v: T): Promise<T> => { if (store) await store.flush(); await sleep(delayMs); return v }
const stamp = (): string => toLocalISO(demoNow())
let seq = 0
const uid = (prefix: string): string => (remoteData ? crypto.randomUUID() : `${prefix}-${Date.now().toString(36)}${(seq++).toString(36)}`)
const live = (all: Project[]): Project[] => all.filter((p) => p.deletedAt === null)
const sameName = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase()

function save(changed: Project[]): void {
  const byId = new Map(changed.map((p) => [p.id, p]))
  write(read().map((p) => byId.get(p.id) ?? p))
  emit(changed)
}
const entry = (kind: ProjectActivityKind, text: string): ProjectActivity => ({ id: uid('pa'), kind, text, at: stamp(), ownerId: CURRENT_USER_ID })
/** Applies a change to one project, stamps it and adds the activity entries (newest first). */
function change(id: string, fn: (p: Project) => Project, entries: ProjectActivity[] = []): Project {
  const current = read().find((p) => p.id === id)
  if (!current) throw new ProjectsServiceError('That project does not exist.')
  const next = { ...fn(current), updatedAt: stamp() }
  next.activity = [...entries, ...next.activity]
  save([next])
  return next
}
const uniqueName = (base: string, others: Project[]): string => {
  let name = base
  for (let n = 2; others.some((p) => sameName(p.name, name)); n++) name = `${base} ${n}`
  return name
}

// ---- reads
export interface ProjectListOptions {
  /** Include archived projects (default true; the page and sidebar filter further). */
  archived?: boolean
}
export async function list(options: ProjectListOptions = {}): Promise<Project[]> {
  await ready()
  await sleep(delayMs)
  if (failReads) throw new ProjectsServiceError('Could not load projects.')
  const all = live(read())
  return options.archived === false ? all.filter((p) => p.archivedAt === null) : all
}
/** Returns the project even when soft-deleted (check `deletedAt`), or null when it does not exist. */
export async function get(id: string): Promise<Project | null> {
  await ready()
  await sleep(delayMs)
  if (failReads) throw new ProjectsServiceError('Could not load the project.')
  return read().find((p) => p.id === id) ?? null
}

// ---- writes
export async function create(input: NewProjectInput): Promise<Project> {
  await ready()
  const name = input.name.trim()
  if (!name) throw new ProjectsServiceError('Enter a project name.')
  if (live(read()).some((p) => sameName(p.name, name))) throw new DuplicateProjectError(name)
  assertCanAssign(input.ownerId)
  const now = stamp()
  const project: Project = {
    id: uid('p'),
    name,
    description: input.description ?? '',
    status: input.status ?? 'Planned',
    ownerId: input.ownerId ?? CURRENT_USER_ID,
    memberIds: input.memberIds ?? [],
    dueDate: input.dueDate ?? '',
    links: input.links ?? [],
    tasks: (input.tasks ?? []).filter((t) => t.trim()).map((title) => ({ id: uid('t'), title: title.trim(), done: false, assigneeId: '', dueDate: '', priority: 'medium' as const, completedAt: null, createdAt: now })),
    activity: [{ id: uid('pa'), kind: 'created', text: `Created the project “${name}”`, at: now, ownerId: CURRENT_USER_ID }],
    archivedAt: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  }
  write([project, ...read()])
  emit([project])
  return respond(project)
}

export async function update(id: string, patch: ProjectPatch): Promise<Project> {
  await ready()
  const all = read()
  const current = all.find((p) => p.id === id)
  if (!current) throw new ProjectsServiceError('That project does not exist.')
  const name = patch.name !== undefined ? patch.name.trim() : undefined
  if (name !== undefined && !name) throw new ProjectsServiceError('Enter a project name.')
  if (name !== undefined && live(all).some((p) => p.id !== id && sameName(p.name, name))) throw new DuplicateProjectError(name)
  assertCanAssign(patch.ownerId, current.ownerId)
  const entries: ProjectActivity[] = []
  if (patch.status && patch.status !== current.status) entries.push(entry('status', `Status changed from ${current.status} to ${patch.status}`))
  if (name !== undefined && name !== current.name) entries.push(entry('renamed', `Renamed the project to “${name}”`))
  if (patch.links && JSON.stringify(patch.links) !== JSON.stringify(current.links)) entries.push(entry('linked', 'Updated the linked records'))
  const next = change(id, (p) => ({ ...p, ...patch, ...(name !== undefined ? { name } : {}) }), entries.reverse())
  return respond(next)
}

/** Soft delete: the project can be brought back with `restore`. */
export async function remove(id: string): Promise<Project> {
  await ready()
  return respond(change(id, (p) => ({ ...p, deletedAt: stamp() })))
}
export async function restore(id: string): Promise<Project> {
  await ready()
  return respond(change(id, (p) => ({ ...p, deletedAt: null })))
}
export async function archive(id: string): Promise<Project> {
  await ready()
  return respond(change(id, (p) => ({ ...p, archivedAt: stamp() }), [entry('archived', 'Archived the project')]))
}
export async function unarchive(id: string): Promise<Project> {
  await ready()
  return respond(change(id, (p) => ({ ...p, archivedAt: null }), [entry('restored', 'Restored the project from the archive')]))
}
/** A copy with the tasks reset to open. */
export async function duplicate(id: string): Promise<Project> {
  await ready()
  const all = read()
  const source = all.find((p) => p.id === id)
  if (!source) throw new ProjectsServiceError('That project does not exist.')
  const now = stamp()
  const name = uniqueName(`Copy of ${source.name}`, live(all))
  const copy: Project = {
    ...source,
    id: uid('p'),
    name,
    status: 'Planned',
    tasks: source.tasks.map((t) => ({ ...t, id: uid('t'), done: false, completedAt: null, createdAt: now })),
    activity: [{ id: uid('pa'), kind: 'created', text: `Created the project “${name}” as a copy of “${source.name}”`, at: now, ownerId: CURRENT_USER_ID }],
    archivedAt: null,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  }
  write([copy, ...all])
  emit([copy])
  return respond(copy)
}
/** Puts a project back exactly as it was (Undo for task and project changes). */
export async function replace(snapshot: Project): Promise<Project> {
  await ready()
  save([snapshot])
  return respond(snapshot)
}

// ---- tasks
export async function addTask(projectId: string, input: NewTaskInput): Promise<Project> {
  await ready()
  const title = input.title.trim()
  if (!title) throw new ProjectsServiceError('Enter a task title.')
  const task: ProjectTask = { id: uid('t'), title, done: false, assigneeId: input.assigneeId ?? '', dueDate: input.dueDate ?? '', priority: input.priority ?? 'medium', completedAt: null, createdAt: stamp() }
  return respond(change(projectId, (p) => ({ ...p, tasks: [...p.tasks, task] }), [entry('task-added', `Added the task “${title}”`)]))
}
export async function updateTask(projectId: string, taskId: string, patch: TaskPatch): Promise<Project> {
  await ready()
  if (patch.title !== undefined && !patch.title.trim()) throw new ProjectsServiceError('Enter a task title.')
  return respond(change(projectId, (p) => ({ ...p, tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, ...patch, ...(patch.title !== undefined ? { title: patch.title.trim() } : {}) } : t)) })))
}
export async function setTaskDone(projectId: string, taskId: string, done: boolean): Promise<Project> {
  await ready()
  const current = read().find((p) => p.id === projectId)?.tasks.find((t) => t.id === taskId)
  if (!current || current.done === done) return respond(read().find((p) => p.id === projectId) as Project)
  const next = change(projectId, (p) => ({ ...p, tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, done, completedAt: done ? stamp() : null } : t)) }), [entry(done ? 'task-done' : 'task-reopened', `${done ? 'Completed' : 'Reopened'} “${current.title}”`)])
  return respond(next)
}
/** Marks several tasks done (already-done ones are left alone). */
export async function completeTasks(projectId: string, taskIds: string[]): Promise<Project> {
  await ready()
  const project = read().find((p) => p.id === projectId)
  if (!project) throw new ProjectsServiceError('That project does not exist.')
  const open = project.tasks.filter((t) => taskIds.includes(t.id) && !t.done)
  const now = stamp()
  return respond(change(projectId, (p) => ({ ...p, tasks: p.tasks.map((t) => (open.some((o) => o.id === t.id) ? { ...t, done: true, completedAt: now } : t)) }), open.map((t) => entry('task-done', `Completed “${t.title}”`)).reverse()))
}
export async function removeTasks(projectId: string, taskIds: string[]): Promise<Project> {
  await ready()
  const project = read().find((p) => p.id === projectId)
  const gone = project?.tasks.filter((t) => taskIds.includes(t.id)) ?? []
  const text = gone.length === 1 ? `Deleted the task “${gone[0].title}”` : `Deleted ${gone.length} tasks`
  return respond(change(projectId, (p) => ({ ...p, tasks: p.tasks.filter((t) => !taskIds.includes(t.id)) }), gone.length ? [entry('task-removed', text)] : []))
}
/** Moves a task to a new position in the list (0 = first). */
export async function moveTask(projectId: string, taskId: string, toIndex: number): Promise<Project> {
  await ready()
  return respond(change(projectId, (p) => {
    const from = p.tasks.findIndex((t) => t.id === taskId)
    if (from < 0) return p
    const tasks = p.tasks.slice()
    const [task] = tasks.splice(from, 1)
    tasks.splice(Math.max(0, Math.min(toIndex, tasks.length)), 0, task)
    return { ...p, tasks }
  }))
}

export { remove as delete }
export const projectsService = { list, get, create, update, delete: remove, restore, archive, unarchive, duplicate, replace, addTask, updateTask, setTaskDone, completeTasks, removeTasks, moveTask }
export type ProjectsService = typeof projectsService

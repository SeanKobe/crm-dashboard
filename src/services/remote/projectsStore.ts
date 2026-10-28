import { CURRENT_USER_ID, currentRole } from '../session'
import type { Project, ProjectActivity, ProjectTask } from '../../types'
import { loadActivity, syncActivity, type TimelineEntry } from './activity'
import { check, db, dateOnly, inChunks, orNull, wall, wallOrNull } from './db'
import { updateRow } from './dealsStore'
import { loadLinks, syncLinks, type AppLink } from './links'
import { createRemoteStore, type RemoteStore } from './store'

// Projects <-> `projects`, their tasks <-> `tasks` (position = order in the list), the timeline <-> `activity`, linked records <-> `links`.
interface ProjectRow {
  id: string; name: string; description: string; status: Project['status']; owner_id: string; member_ids: string[] | null; due_date: string | null; archived_at: string | null
  created_at: string; updated_at: string; deleted_at: string | null
}
interface TaskRow { id: string; project_id: string; title: string; done: boolean; assignee_id: string | null; due_date: string | null; priority: ProjectTask['priority']; completed_at: string | null; created_at: string }

const toEntry = (a: ProjectActivity): TimelineEntry => ({ id: a.id, kind: a.kind, title: a.text, description: '', actorId: a.ownerId, at: a.at })
const fromEntry = (e: TimelineEntry): ProjectActivity => ({ id: e.id, kind: e.kind as ProjectActivity['kind'], text: e.title, at: e.at, ownerId: e.actorId })
const linksOf = (p: Project): AppLink[] => p.links.map((l) => ({ type: l.type, id: l.id }))
const toRow = (p: Project) => ({
  id: p.id, name: p.name, description: p.description, status: p.status, owner_id: p.ownerId, member_ids: p.memberIds, due_date: orNull(p.dueDate), archived_at: p.archivedAt, deleted_at: p.deletedAt,
})
const taskRow = (t: ProjectTask, p: Project, position: number) => ({
  id: t.id, project_id: p.id, title: t.title, done: t.done, assignee_id: orNull(t.assigneeId), owner_id: p.ownerId, due_date: orNull(t.dueDate), priority: t.priority, completed_at: t.completedAt, position,
})
// Tasks the database already has (including ones taken out of a list and soft-deleted), so putting one back is an update, not an insert.
const knownTasks = new Set<string>()
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b)
const canEdit = (p: Project): boolean => { const r = currentRole(); return r === 'manager' || r === 'admin' || p.ownerId === CURRENT_USER_ID }

async function load(): Promise<Project[]> {
  const sb = await db()
  const rows = check<ProjectRow[]>(await sb.from('projects').select('*').order('updated_at', { ascending: false }), 'load projects')
  const ids = rows.map((r) => r.id)
  const taskRows = await inChunks(ids, async (chunk) => check<TaskRow[]>(await sb.from('tasks').select('id, project_id, title, done, assignee_id, due_date, priority, completed_at, created_at').in('project_id', chunk).is('deleted_at', null).order('position', { ascending: true }), 'load tasks'))
  const [timelines, links] = await Promise.all([loadActivity('project', ids), loadLinks('project', ids)])
  knownTasks.clear()
  const byProject = new Map<string, ProjectTask[]>()
  for (const t of taskRows) {
    knownTasks.add(t.id)
    const list = byProject.get(t.project_id) ?? []
    list.push({ id: t.id, title: t.title, done: t.done, assigneeId: t.assignee_id ?? '', dueDate: dateOnly(t.due_date), priority: t.priority, completedAt: wallOrNull(t.completed_at), createdAt: wall(t.created_at) })
    byProject.set(t.project_id, list)
  }
  return rows.map((r) => ({
    id: r.id, name: r.name, description: r.description, status: r.status, ownerId: r.owner_id, memberIds: r.member_ids ?? [], dueDate: dateOnly(r.due_date),
    links: (links.get(r.id) ?? []).map((l) => ({ type: l.type as Project['links'][number]['type'], id: l.id })), tasks: byProject.get(r.id) ?? [],
    activity: (timelines.get(r.id) ?? []).map(fromEntry), archivedAt: wallOrNull(r.archived_at), deletedAt: wallOrNull(r.deleted_at), createdAt: wall(r.created_at), updatedAt: wall(r.updated_at),
  }))
}

async function syncTasks(p: Project, prev: ProjectTask[]): Promise<void> {
  const sb = await db()
  const before = new Map(prev.map((t, i) => [t.id, taskRow(t, { ...p }, i)]))
  const now = new Set(p.tasks.map((t) => t.id))
  for (const [i, t] of p.tasks.entries()) {
    const row = taskRow(t, p, i)
    const old = before.get(t.id)
    if (!old && !knownTasks.has(t.id)) { check(await sb.from('tasks').insert({ ...row, created_at: t.createdAt }), 'add tasks'); knownTasks.add(t.id) }
    else if (!old || !same(old, row)) await updateRow('tasks', t.id, { ...row, deleted_at: null }, 'change this task')
  }
  for (const t of prev) if (!now.has(t.id)) await updateRow('tasks', t.id, { deleted_at: new Date().toISOString() }, 'delete this task')
}

export function createProjectsStore(onReload: (list: Project[]) => void): RemoteStore<Project> {
  return createRemoteStore<Project>({
    noun: 'the project',
    load,
    onReload,
    insert: async (p) => {
      const sb = await db()
      check(await sb.from('projects').insert({ ...toRow(p), created_at: p.createdAt, updated_at: p.updatedAt }), 'create projects')
      await syncTasks(p, [])
      await syncActivity('project', p.id, [], p.activity.map(toEntry))
      await syncLinks('project', p.id, [], linksOf(p))
    },
    update: async (p, prev) => {
      const rowChanged = !same(toRow(p), toRow(prev))
      const childrenChanged = !same(p.tasks, prev.tasks) || !same(p.activity, prev.activity) || !same(p.links, prev.links)
      // A person who only works on a task (it is assigned to them) may not edit the project row, so it is only written when it changed
      // or when the person is allowed to (which also refreshes its "last changed" time).
      if (rowChanged || (childrenChanged && canEdit(p))) await updateRow('projects', p.id, { ...toRow(p), updated_at: p.updatedAt }, 'change this project')
      await syncTasks(p, prev.tasks)
      await syncActivity('project', p.id, prev.activity.map(toEntry), p.activity.map(toEntry))
      await syncLinks('project', p.id, linksOf(prev), linksOf(p))
    },
    drop: async (prev) => { await updateRow('projects', prev.id, { deleted_at: new Date().toISOString() }, 'delete this project') },
  })
}

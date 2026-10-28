import { owners } from '../../data/deals'
import { DEMO_TODAY, addDays, formatShort } from '../../lib/dates'
import type { DealOwner, Project, ProjectDueFilter, ProjectFilters, ProjectStatus, ProjectTask, TaskPriority } from '../../types'

export const PROJECT_STATUSES: ProjectStatus[] = ['Planned', 'Active', 'On hold', 'Completed']
// Pill colours use the same contrast-safe text tokens as the Deals status pills.
export const statusStyle: Record<ProjectStatus, { dot: string; tint: string; text: string }> = {
  Planned: { dot: 'bg-text-secondary', tint: 'bg-text-secondary/12', text: 'text-text-secondary' },
  Active: { dot: 'bg-primary', tint: 'bg-primary/12', text: 'text-primary' },
  'On hold': { dot: 'bg-warning', tint: 'bg-warning/12', text: 'text-warning-foreground' },
  Completed: { dot: 'bg-success', tint: 'bg-success/12', text: 'text-success-strong' },
}
export const PRIORITIES: TaskPriority[] = ['high', 'medium', 'low']
export const priorityLabel: Record<TaskPriority, string> = { high: 'High', medium: 'Medium', low: 'Low' }
export { CURRENT_USER_ID as CURRENT_USER } from '../../services/session'

export const ownerById = (id: string): DealOwner | null => owners.find((o) => o.id === id) ?? null
export const allOwners = owners
/** The owner first, then the other members. */
export const peopleOf = (p: Pick<Project, 'ownerId' | 'memberIds'>): string[] => [p.ownerId, ...p.memberIds.filter((m) => m !== p.ownerId)]

export interface Progress { done: number; total: number; percent: number }
export function progressOf(p: Pick<Project, 'tasks'>): Progress {
  const total = p.tasks.length
  const done = p.tasks.filter((t) => t.done).length
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 }
}
export const progressText = (pr: Progress): string => `${pr.done} of ${pr.total} ${pr.total === 1 ? 'task' : 'tasks'}`

export const isTaskOverdue = (t: Pick<ProjectTask, 'done' | 'dueDate'>): boolean => !t.done && t.dueDate !== '' && t.dueDate < DEMO_TODAY
/** A project is overdue when its due date has passed and it is not finished or archived. */
export const isProjectOverdue = (p: Pick<Project, 'dueDate' | 'status' | 'archivedAt'>): boolean => p.dueDate !== '' && p.dueDate < DEMO_TODAY && p.status !== 'Completed' && p.archivedAt === null
export function dueLabel(p: Pick<Project, 'dueDate' | 'status' | 'archivedAt'>): { text: string; overdue: boolean } {
  if (!p.dueDate) return { text: 'No due date', overdue: false }
  return isProjectOverdue(p) ? { text: `Overdue · ${formatShort(p.dueDate)}`, overdue: true } : { text: `Due ${formatShort(p.dueDate)}`, overdue: false }
}

export const DUE_LABELS: Record<ProjectDueFilter, string> = { any: 'Any time', overdue: 'Overdue', week: 'Due in 7 days', month: 'Due in 30 days', none: 'No due date' }
export function filterProjects(all: Project[], f: ProjectFilters): Project[] {
  const q = f.query.trim().toLowerCase()
  return all.filter((p) => {
    if (!f.showArchived && p.archivedAt) return false
    if (q && !`${p.name} ${p.description}`.toLowerCase().includes(q)) return false
    if (f.statuses.length && !f.statuses.includes(p.status)) return false
    if (f.ownerIds.length && !peopleOf(p).some((id) => f.ownerIds.includes(id))) return false
    if (f.due === 'overdue' && !isProjectOverdue(p)) return false
    if (f.due === 'none' && p.dueDate) return false
    if (f.due === 'week' && !(p.dueDate && p.dueDate >= DEMO_TODAY && p.dueDate <= addDays(DEMO_TODAY, 7))) return false
    if (f.due === 'month' && !(p.dueDate && p.dueDate >= DEMO_TODAY && p.dueDate <= addDays(DEMO_TODAY, 30))) return false
    return true
  })
}
export const hasProjectFilters = (f: ProjectFilters): boolean => Boolean(f.query.trim() || f.statuses.length || f.ownerIds.length || f.due !== 'any' || f.showArchived)

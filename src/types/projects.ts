import type { RecordType } from './notes'

// ---- Projects: a body of work tied to customers or deals (an onboarding, an implementation).
export type ProjectStatus = 'Planned' | 'Active' | 'On hold' | 'Completed'
export type TaskPriority = 'low' | 'medium' | 'high'

export interface ProjectTask {
  id: string
  title: string
  done: boolean
  /** Owner id, or "" when nobody is assigned. */
  assigneeId: string
  /** ISO date (YYYY-MM-DD), or "" when there is no due date. */
  dueDate: string
  priority: TaskPriority
  /** Local date-time the task was completed; null while open. */
  completedAt: string | null
  createdAt: string
}

export type ProjectActivityKind = 'created' | 'status' | 'task-added' | 'task-done' | 'task-reopened' | 'task-removed' | 'archived' | 'restored' | 'renamed' | 'linked'

export interface ProjectActivity {
  id: string
  kind: ProjectActivityKind
  text: string
  /** Local date-time. */
  at: string
  ownerId: string
}

/** A linked record. Only the type and id are stored; names are resolved when shown (services/records.ts). */
export interface ProjectLink {
  type: RecordType
  id: string
}

export interface Project {
  id: string
  name: string
  description: string
  status: ProjectStatus
  ownerId: string
  /** Other people working on it (the owner is not repeated here). */
  memberIds: string[]
  /** ISO date (YYYY-MM-DD), or "" when there is no due date. */
  dueDate: string
  links: ProjectLink[]
  /** In the order they are shown. */
  tasks: ProjectTask[]
  /** Newest first. */
  activity: ProjectActivity[]
  /** Local date-time the project was archived; null when it is not. */
  archivedAt: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface NewProjectInput {
  name: string
  description?: string
  status?: ProjectStatus
  ownerId?: string
  memberIds?: string[]
  dueDate?: string
  links?: ProjectLink[]
  /** Titles of tasks to start with. */
  tasks?: string[]
}
export type ProjectPatch = Partial<Pick<Project, 'name' | 'description' | 'status' | 'ownerId' | 'memberIds' | 'dueDate' | 'links'>>
export type NewTaskInput = Partial<Pick<ProjectTask, 'assigneeId' | 'dueDate' | 'priority'>> & { title: string }
export type TaskPatch = Partial<Pick<ProjectTask, 'title' | 'assigneeId' | 'dueDate' | 'priority'>>

export type ProjectView = 'grid' | 'list'
export type ProjectDueFilter = 'any' | 'overdue' | 'week' | 'month' | 'none'
export interface ProjectFilters {
  query: string
  statuses: ProjectStatus[]
  ownerIds: string[]
  due: ProjectDueFilter
  showArchived: boolean
}
export type TaskFilter = 'all' | 'mine' | 'overdue' | 'completed'
export type SidebarProjectSort = 'name' | 'recent'

export interface ProjectPrefs {
  view: ProjectView
  filters: ProjectFilters
  sidebarSort: SidebarProjectSort
  sidebarShowArchived: boolean
}

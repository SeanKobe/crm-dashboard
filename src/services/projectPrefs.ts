import { mirrorPref } from './userPrefs'
import type { ProjectDueFilter, ProjectFilters, ProjectPrefs, ProjectStatus, SidebarProjectSort } from '../types'

// Projects page and sidebar preferences (view, filters, sidebar sort and archived toggle). Stays on the device.
const KEY = 'crm.projects.prefs.v1'
const STATUSES: ProjectStatus[] = ['Planned', 'Active', 'On hold', 'Completed']
const DUES: ProjectDueFilter[] = ['any', 'overdue', 'week', 'month', 'none']
export const emptyProjectFilters: ProjectFilters = { query: '', statuses: [], ownerIds: [], due: 'any', showArchived: false }
export const defaultProjectPrefs: ProjectPrefs = { view: 'grid', filters: emptyProjectFilters, sidebarSort: 'name', sidebarShowArchived: false }

export function loadProjectPrefs(): ProjectPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultProjectPrefs
    const p = JSON.parse(raw) as Partial<ProjectPrefs>
    const f: Partial<ProjectFilters> = p.filters ?? {}
    return {
      view: p.view === 'list' ? 'list' : 'grid',
      filters: {
        query: typeof f.query === 'string' ? f.query : '',
        statuses: Array.isArray(f.statuses) ? f.statuses.filter((s): s is ProjectStatus => STATUSES.includes(s)) : [],
        ownerIds: Array.isArray(f.ownerIds) ? f.ownerIds.filter((s): s is string => typeof s === 'string') : [],
        due: f.due && DUES.includes(f.due) ? f.due : 'any',
        showArchived: f.showArchived === true,
      },
      sidebarSort: (p.sidebarSort === 'recent' ? 'recent' : 'name') as SidebarProjectSort,
      sidebarShowArchived: p.sidebarShowArchived === true,
    }
  } catch {
    return defaultProjectPrefs
  }
}

export function saveProjectPrefs(patch: Partial<ProjectPrefs>): void {
  try { localStorage.setItem(KEY, JSON.stringify({ ...loadProjectPrefs(), ...patch })) } catch { /* ignore */ }
  mirrorPref('projects')
}

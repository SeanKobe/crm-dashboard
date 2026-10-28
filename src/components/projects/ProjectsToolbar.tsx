import { X } from 'lucide-react'
import type { ProjectDueFilter, ProjectFilters, ProjectStatus, ProjectView } from '../../types'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { Checkbox } from '../ui/Checkbox'
import { FilterButton } from '../ui/FilterButton'
import { SearchInput } from '../ui/SearchInput'
import { SegmentedFilter } from '../ui/SegmentedFilter'
import { ProjectStatusPill } from './ProjectStatusPill'
import { DUE_LABELS, PROJECT_STATUSES, allOwners, hasProjectFilters } from './projectMeta'

// Toolbar: search, Status / Owner / Due date filters, result count and the Grid / List switch.
const toggle = <T extends string>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
const DUES: ProjectDueFilter[] = ['any', 'overdue', 'week', 'month', 'none']
const VIEWS = ['Grid', 'List'] as const

export interface ProjectsToolbarProps {
  filters: ProjectFilters
  onFilters: (patch: Partial<ProjectFilters>) => void
  onClear: () => void
  view: ProjectView
  onView: (v: ProjectView) => void
  shown: number
  total: number
}

export function ProjectsToolbar({ filters, onFilters, onClear, view, onView, shown, total }: ProjectsToolbarProps) {
  const on = hasProjectFilters(filters)
  const chips: { key: string; label: string; remove: () => void }[] = []
  filters.statuses.forEach((s) => chips.push({ key: `s-${s}`, label: `Status: ${s}`, remove: () => onFilters({ statuses: filters.statuses.filter((x) => x !== s) }) }))
  filters.ownerIds.forEach((id) => { const o = allOwners.find((x) => x.id === id); if (o) chips.push({ key: `o-${id}`, label: `Owner: ${o.name}`, remove: () => onFilters({ ownerIds: filters.ownerIds.filter((x) => x !== id) }) }) })
  if (filters.due !== 'any') chips.push({ key: 'due', label: `Due: ${DUE_LABELS[filters.due]}`, remove: () => onFilters({ due: 'any' }) })
  if (filters.showArchived) chips.push({ key: 'arch', label: 'Including archived', remove: () => onFilters({ showArchived: false }) })
  return (
    <div className="flex shrink-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Project filters">
        <SearchInput label="Search projects" placeholder="Search projects" value={filters.query} onChange={(query) => onFilters({ query })} className="w-72" />
        <FilterButton label="Status" count={filters.statuses.length + (filters.showArchived ? 1 : 0)}>
          <fieldset className="m-0 flex flex-col gap-0.5 border-0 p-0">
            <legend className="px-2 pb-1 text-xs font-medium text-text-secondary">Status</legend>
            {PROJECT_STATUSES.map((s: ProjectStatus) => (
              <label key={s} className="flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm transition-colors duration-hover ease-out hover:bg-surface-subtle motion-reduce:transition-none">
                <Checkbox checked={filters.statuses.includes(s)} onChange={() => onFilters({ statuses: toggle(filters.statuses, s) })} label={s} />
                <ProjectStatusPill status={s} />
              </label>
            ))}
          </fieldset>
          <label className="mt-1 flex h-9 cursor-pointer items-center gap-2.5 rounded-md border-t border-border px-2 pt-1 text-sm">
            <Checkbox checked={filters.showArchived} onChange={(showArchived) => onFilters({ showArchived })} label="Show archived" />
            Show archived
          </label>
        </FilterButton>
        <FilterButton label="Owner" count={filters.ownerIds.length}>
          <fieldset className="m-0 flex flex-col gap-0.5 border-0 p-0">
            <legend className="px-2 pb-1 text-xs font-medium text-text-secondary">Owner</legend>
            {allOwners.map((o) => (
              <label key={o.id} className="flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm transition-colors duration-hover ease-out hover:bg-surface-subtle motion-reduce:transition-none">
                <Checkbox checked={filters.ownerIds.includes(o.id)} onChange={() => onFilters({ ownerIds: toggle(filters.ownerIds, o.id) })} label={o.name} />
                <Avatar initial={o.initial} tone={o.tone} size="M" />
                {o.name}
              </label>
            ))}
          </fieldset>
        </FilterButton>
        <FilterButton label="Due date" count={filters.due !== 'any' ? 1 : 0}>
          <fieldset className="m-0 flex flex-col gap-0.5 border-0 p-0">
            <legend className="px-2 pb-1 text-xs font-medium text-text-secondary">Due date</legend>
            {DUES.map((d) => (
              <label key={d} className="flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm transition-colors duration-hover ease-out hover:bg-surface-subtle motion-reduce:transition-none">
                <input type="radio" name="project-due" className="size-4 accent-primary" checked={filters.due === d} onChange={() => onFilters({ due: d })} />
                {DUE_LABELS[d]}
              </label>
            ))}
          </fieldset>
        </FilterButton>
        <span className="flex-1" />
        <span className="text-sm text-text-secondary" data-project-count aria-live="polite"><span className="font-medium text-text-primary">{shown}</span> of {total} projects</span>
        <SegmentedFilter label="View" tone="strong" options={VIEWS} value={view === 'grid' ? 'Grid' : 'List'} onChange={(v) => onView(v === 'Grid' ? 'grid' : 'list')} />
      </div>
      {on && (
        <ul className="flex flex-wrap items-center gap-2" aria-label="Active filters">
          {chips.map((c) => (
            <li key={c.key}>
              <button type="button" onClick={c.remove} aria-label={`Remove filter ${c.label}`} className="flex h-7 items-center gap-1.5 rounded-sm border border-border bg-surface px-2 text-xs font-medium outline-none transition-colors duration-hover ease-out hover:border-border-strong hover:bg-surface-subtle focus-ring motion-reduce:transition-none">
                {c.label}
                <X aria-hidden className="size-3.5 text-text-secondary" strokeWidth={1.75} />
              </button>
            </li>
          ))}
          {filters.query.trim() && <li><Badge tone="neutral">“{filters.query.trim()}”</Badge></li>}
          <li><button type="button" onClick={onClear} className="h-7 rounded-sm px-2 text-xs font-medium text-primary outline-none transition-colors duration-hover ease-out hover:bg-primary-soft focus-ring motion-reduce:transition-none">Clear all</button></li>
        </ul>
      )}
    </div>
  )
}

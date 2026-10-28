import { FolderOpen, FolderSearch, Plus, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMatch, useNavigate, useSearchParams } from 'react-router'
import { useToast } from '../../context/toastContext'
import { motion, prefersReducedMotion } from '../../lib/motion'
import { useProjects } from '../../lib/useProjects'
import { emptyProjectFilters, loadProjectPrefs, saveProjectPrefs } from '../../services/projectPrefs'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { SkeletonBlock, SkeletonLine } from '../ui/Skeleton'
import { ProjectCard } from './ProjectCard'
import { Breadcrumb, ProjectDetail } from './ProjectDetail'
import { ProjectFormModal } from './ProjectFormModal'
import { ProjectsTable } from './ProjectsTable'
import { ProjectsToolbar } from './ProjectsToolbar'
import { filterProjects, hasProjectFilters } from './projectMeta'
import type { ProjectFilters, ProjectPrefs, ProjectView } from '../../types'

// /projects (grid or list of projects) and /projects/:id (one project). Loading skeleton on the first visit, error with Retry (?error=1),
// empty and no-results states. View and filters are remembered.
function ListSkeleton({ view }: { view: ProjectView }) {
  return (
    <div role="status" aria-busy="true" aria-label="Loading projects" data-projects-skeleton>
      {view === 'grid' ? (
        <div className="grid grid-cols-3 gap-4 max-xl:grid-cols-2 max-lg:grid-cols-1">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-card">
              <div className="flex justify-between"><SkeletonLine className="h-4 w-40" /><SkeletonLine className="h-5 w-16 rounded-full" /></div>
              <SkeletonLine className="h-5 w-48" />
              <div className="flex justify-between"><SkeletonBlock className="size-7 rounded-full" /><SkeletonLine className="w-24" /></div>
              <SkeletonLine className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-card">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="flex h-16 items-center gap-4 border-b border-border px-4 last:border-b-0"><SkeletonLine className="w-48" /><SkeletonLine className="h-5 w-16 rounded-full" /><span className="flex-1" /><SkeletonLine className="w-28" /><SkeletonLine className="h-2 w-40 rounded-full" /></div>)}
        </div>
      )}
    </div>
  )
}

export function ProjectsPage({ headerSlot }: { headerSlot: HTMLElement | null }) {
  const toast = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const errorFlag = params.get('error') === '1'
  const match = useMatch('/projects/:id')
  const openId = match?.params.id ?? null
  const [prefs, setPrefs] = useState<ProjectPrefs>(loadProjectPrefs)
  const { projects, status, reload } = useProjects({ minLoadMs: prefersReducedMotion() ? 0 : motion.skeleton, simulateError: errorFlag })
  const [newOpen, setNewOpen] = useState(false)
  const [newKey, setNewKey] = useState(0)
  const [announcement, setAnnouncement] = useState('')
  useEffect(() => { saveProjectPrefs({ view: prefs.view, filters: prefs.filters }) }, [prefs.view, prefs.filters])
  const announce = useCallback((msg: string) => setAnnouncement((prev) => (prev === msg ? `${msg}​` : msg)), [])

  const filters = prefs.filters
  const setFilters = (patch: Partial<ProjectFilters>) => setPrefs((p) => ({ ...p, filters: { ...p.filters, ...patch } }))
  const clear = () => setPrefs((p) => ({ ...p, filters: emptyProjectFilters }))
  const live = useMemo(() => projects.filter((p) => filters.showArchived || !p.archivedAt), [projects, filters.showArchived])
  const shown = useMemo(() => filterProjects(projects, filters), [projects, filters])
  const retry = () => { setParams((p) => { p.delete('error'); return p }, { replace: true }); reload() }
  const openName = openId ? projects.find((p) => p.id === openId)?.name : undefined

  const headerBar = openId ? (
    <>
      <Breadcrumb name={openName} />
      <span />
    </>
  ) : (
    <>
      <p className="text-sm" data-projects-summary><span className="text-lg font-medium">Projects</span> <span className="text-text-secondary">· {projects.filter((p) => !p.archivedAt).length === 1 ? '1 project' : `${projects.filter((p) => !p.archivedAt).length} projects`}</span></p>
      <Button variant="primary" icon={Plus} onClick={() => { setNewKey((k) => k + 1); setNewOpen(true) }}>New project</Button>
    </>
  )

  let body
  if (openId) {
    body = <ProjectDetail id={openId} errorFlag={errorFlag} onRetry={retry} onAnnounce={announce} />
  } else if (status === 'error') {
    body = <EmptyState icon={TriangleAlert} tone="danger" title="We couldn’t load projects" description="Something went wrong while loading your projects. Try again." action={<Button variant="primary" onClick={retry}>Retry</Button>} className="rounded-lg border border-border bg-surface" />
  } else if (status === 'loading') {
    body = <ListSkeleton view={prefs.view} />
  } else if (projects.length === 0) {
    body = <EmptyState icon={FolderOpen} title="No projects yet" description="Create a project to plan the work for a customer or a deal." action={<Button variant="primary" icon={Plus} onClick={() => { setNewKey((k) => k + 1); setNewOpen(true) }}>New project</Button>} className="rounded-lg border border-border bg-surface" />
  } else {
    body = (
      <>
        <ProjectsToolbar filters={filters} onFilters={setFilters} onClear={clear} view={prefs.view} onView={(view) => setPrefs((p) => ({ ...p, view }))} shown={shown.length} total={live.length} />
        {shown.length === 0 ? (
          <EmptyState icon={FolderSearch} title="No projects match" description="Try a different search or clear your filters." action={hasProjectFilters(filters) ? <Button variant="primary" onClick={clear}>Clear filters</Button> : undefined} className="rounded-lg border border-border bg-surface" />
        ) : prefs.view === 'grid' ? (
          <div className="grid grid-cols-3 gap-4 max-xl:grid-cols-2 max-lg:grid-cols-1" data-projects-grid>{shown.map((p) => <ProjectCard key={p.id} project={p} />)}</div>
        ) : (
          <ProjectsTable projects={shown} />
        )}
      </>
    )
  }

  return (
    <>
      {headerSlot && createPortal(headerBar, headerSlot)}
      {body}
      <div role="status" aria-live="polite" className="sr-only" data-projects-announcer>{announcement}</div>
      <ProjectFormModal
        key={newKey}
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={(p) => { setNewOpen(false); toast({ type: 'success', title: 'Project created', message: p.name }); navigate(`/projects/${p.id}`) }}
      />
    </>
  )
}

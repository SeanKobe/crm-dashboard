import { Archive, ArchiveRestore, ChevronLeft, Copy, Ellipsis, FolderX, RotateCcw, TriangleAlert, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useToast } from '../../context/toastContext'
import { useProject } from '../../lib/useProjects'
import { DuplicateProjectError, projectsService } from '../../services/projects'
import type { Project, ProjectStatus } from '../../types'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { DateField } from '../ui/DateField'
import { EmptyState } from '../ui/EmptyState'
import { IconButton } from '../ui/IconButton'
import { Menu } from '../ui/Menu'
import { ProgressBar } from '../ui/ProgressBar'
import { Select } from '../ui/Select'
import { SkeletonBlock, SkeletonLine } from '../ui/Skeleton'
import { Tabs } from '../ui/Tabs'
import { panelId, tabId } from '../ui/tabIds'
import { ActivityTab, OverviewTab } from './ProjectTabs'
import { TasksTab } from './TasksTab'
import { PROJECT_STATUSES, allOwners, progressOf, progressText, statusStyle } from './projectMeta'
import { cn } from '../../lib/cn'

// Project page: header (name, status, owner, due date, "..." menu), progress, and the Tasks / Overview / Activity tabs.
type TabId = 'tasks' | 'overview' | 'activity'
const STATUS_OPTIONS = PROJECT_STATUSES.map((s) => ({ value: s, label: s, leading: <span aria-hidden className={cn('size-2 rounded-full', statusStyle[s].dot)} /> }))
const OWNER_OPTIONS = allOwners.map((o) => ({ value: o.id, label: o.name, leading: <Avatar initial={o.initial} tone={o.tone} size="M" /> }))

function EditableName({ project, onAnnounce }: { project: Project; onAnnounce: (m: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(project.name)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  useEffect(() => { if (editing) { input.current?.focus(); input.current?.select() } }, [editing])
  const stop = (restoreFocus = true) => { setEditing(false); setError(null); if (restoreFocus) requestAnimationFrame(() => button.current?.focus({ preventScroll: true })) }
  const commit = async () => {
    const next = draft.trim()
    if (!next) { setError('Enter a project name.'); return }
    if (next === project.name) { stop(); return }
    try { await projectsService.update(project.id, { name: next }); onAnnounce(`Renamed the project to ${next}.`); stop() } catch (e) { setError(e instanceof DuplicateProjectError ? 'A project with this name already exists.' : 'Couldn’t rename the project.') }
  }
  if (editing) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <input ref={input} aria-label="Project name" aria-invalid={error ? true : undefined} maxLength={60} value={draft} onChange={(e) => { setDraft(e.target.value); setError(null) }} onBlur={() => { if (!error) void commit() }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void commit() } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setDraft(project.name); stop() } }} className={cn('h-10 w-full rounded-md border bg-surface px-3 text-lg font-medium outline-none focus:ring-[3px]', error ? 'border-danger focus:ring-danger/25' : 'border-primary focus:ring-focus-ring')} />
        {error && <p role="alert" className="text-xs text-danger-strong">{error}</p>}
      </div>
    )
  }
  return (
    <h2 className="min-w-0 flex-1 text-lg font-medium leading-6">
      <button ref={button} type="button" data-project-name onClick={() => { setDraft(project.name); setEditing(true) }} aria-label={`Project name: ${project.name}. Edit name`} className="max-w-full truncate rounded-sm px-1 py-0.5 text-left outline-none transition-colors duration-hover ease-out hover:bg-surface-muted focus-ring motion-reduce:transition-none">{project.name}</button>
    </h2>
  )
}

function ProjectBody({ project, onAnnounce }: { project: Project; onAnnounce: (m: string) => void }) {
  const toast = useToast()
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabId>('tasks')
  const pr = progressOf(project)
  const fail = (e: unknown) => toast({ type: 'error', title: 'That didn’t save', message: e instanceof Error ? e.message : undefined })
  const setStatus = (status: ProjectStatus) => { projectsService.update(project.id, { status }).then(() => onAnnounce(`Status changed to ${status}.`)).catch(fail) }
  const duplicate = () => {
    projectsService.duplicate(project.id).then((copy) => {
      toast({ type: 'success', title: 'Project duplicated', message: copy.name, action: { label: 'Open', onClick: () => navigate(`/projects/${copy.id}`) } })
      navigate(`/projects/${copy.id}`)
    }).catch(fail)
  }
  const archive = () => {
    const was = Boolean(project.archivedAt)
    ;(was ? projectsService.unarchive(project.id) : projectsService.archive(project.id)).then(() => toast({ type: 'info', title: was ? 'Project restored from the archive' : 'Project archived', message: project.name, action: { label: 'Undo', onClick: () => { void (was ? projectsService.archive(project.id) : projectsService.unarchive(project.id)) } } })).catch(fail)
  }
  const remove = () => {
    projectsService.delete(project.id).then(() => {
      toast({ type: 'info', title: 'Project deleted', message: project.name, action: { label: 'Undo', onClick: () => { void projectsService.restore(project.id) } } })
      navigate('/projects')
    }).catch(fail)
  }
  return (
    <div className="flex flex-col gap-5" data-project-detail={project.id}>
      <section aria-label="Project header" className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-card">
        <div className="flex items-center gap-3">
          <EditableName project={project} onAnnounce={onAnnounce} />
          {project.archivedAt && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-muted px-2 py-[3px] text-xs font-medium text-text-secondary"><Archive aria-hidden className="size-3.5" strokeWidth={1.75} />Archived</span>}
          <Menu
            align="end"
            label="Project actions"
            items={[
              { id: 'duplicate', label: 'Duplicate', icon: Copy, onSelect: duplicate },
              { id: 'archive', label: project.archivedAt ? 'Unarchive' : 'Archive', icon: project.archivedAt ? ArchiveRestore : Archive, onSelect: archive },
              { type: 'separator' },
              { id: 'delete', label: 'Delete', icon: Trash2, danger: true, onSelect: remove },
            ]}
            trigger={({ props }) => <span><IconButton icon={Ellipsis} label="Project actions" menuProps={props} /></span>}
          />
        </div>
        <div className="flex flex-wrap items-start gap-4 max-lg:flex-col max-lg:items-stretch">
          <Select label="Status" className="w-48 max-lg:w-full" value={project.status} options={STATUS_OPTIONS} onChange={setStatus} />
          <Select label="Owner" className="w-56 max-lg:w-full" value={project.ownerId} options={OWNER_OPTIONS} onChange={(ownerId) => { projectsService.update(project.id, { ownerId }).then(() => onAnnounce('Owner changed.')).catch(fail) }} />
          <div className="flex items-end gap-2 max-lg:w-full">
            <DateField label="Due date" partial="ignore" className="w-48 max-lg:flex-1" value={project.dueDate} onChange={(dueDate) => { projectsService.update(project.id, { dueDate }).catch(fail) }} />
            {project.dueDate && <Button onClick={() => { projectsService.update(project.id, { dueDate: '' }).catch(fail) }}>Clear</Button>}
          </div>
          <div className="flex min-w-48 flex-1 flex-col gap-1.5 self-end max-lg:w-full">
            <div className="flex items-center justify-between text-compact"><span className="font-medium">Progress</span><span className="tabular-nums text-text-secondary" data-progress-text>{progressText(pr)}</span></div>
            <ProgressBar value={pr.percent} label={`Progress of ${project.name}`} valueText={progressText(pr)} />
          </div>
        </div>
      </section>
      <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-card">
        <Tabs<TabId> idBase="project" label="Project sections" value={tab} onChange={setTab} tabs={[{ id: 'tasks', label: 'Tasks', count: project.tasks.length }, { id: 'overview', label: 'Overview' }, { id: 'activity', label: 'Activity', count: project.activity.length }]} />
        <div role="tabpanel" id={panelId('project', tab)} aria-labelledby={tabId('project', tab)} tabIndex={0} className="outline-none focus-visible:ring-[3px] focus-visible:ring-focus-ring">
          {tab === 'tasks' && <TasksTab project={project} onAnnounce={onAnnounce} />}
          {tab === 'overview' && <OverviewTab project={project} />}
          {tab === 'activity' && <ActivityTab project={project} />}
        </div>
      </section>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading project" className="flex flex-col gap-5" data-project-skeleton>
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-card"><SkeletonLine className="h-6 w-64" /><div className="flex gap-4"><SkeletonBlock className="h-10 w-48" /><SkeletonBlock className="h-10 w-56" /><SkeletonBlock className="h-10 w-48" /></div></div>
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-card">{Array.from({ length: 5 }, (_, i) => <SkeletonBlock key={i} className="h-9" />)}</div>
    </div>
  )
}

export function ProjectDetail({ id, errorFlag, onRetry, onAnnounce }: { id: string; errorFlag: boolean; onRetry: () => void; onAnnounce: (m: string) => void }) {
  const toast = useToast()
  const [tick, setTick] = useState(0)
  const { project, error } = useProject(id, { simulateError: errorFlag, tick })
  const restore = useCallback(() => { projectsService.restore(id).then((p) => toast({ type: 'success', title: 'Project restored', message: p.name })).catch(() => undefined) }, [id, toast])
  if (error) return <EmptyState icon={TriangleAlert} tone="danger" title="We couldn’t load this project" description="Something went wrong. Try again." action={<Button variant="primary" onClick={() => { onRetry(); setTick((t) => t + 1) }}>Retry</Button>} className="rounded-lg border border-border bg-surface" />
  if (project === undefined) return <DetailSkeleton />
  if (project === null) return <EmptyState icon={FolderX} title="We couldn’t find that project" description="It may have been removed, or the link is wrong." action={<Link to="/projects" className="inline-flex h-10 items-center rounded-md border border-border bg-surface px-4 text-sm font-medium shadow-button outline-none hover:border-border-strong hover:bg-surface-subtle focus-ring">Back to projects</Link>} className="rounded-lg border border-border bg-surface" />
  if (project.deletedAt) return <EmptyState icon={RotateCcw} title="This project was deleted" description={`“${project.name}” is in the trash. Restore it to see its tasks again.`} action={<div className="flex gap-2"><Button variant="primary" onClick={restore}>Restore project</Button><Link to="/projects" className="inline-flex h-10 items-center rounded-md border border-border bg-surface px-4 text-sm font-medium shadow-button outline-none hover:border-border-strong hover:bg-surface-subtle focus-ring">Back to projects</Link></div>} className="rounded-lg border border-border bg-surface" />
  return <ProjectBody key={project.id} project={project} onAnnounce={onAnnounce} />
}

export function Breadcrumb({ name }: { name?: string }) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm">
      <Link to="/projects" className="flex items-center gap-1 rounded-sm px-1 py-0.5 text-text-secondary outline-none transition-colors duration-hover ease-out hover:text-text-primary focus-ring motion-reduce:transition-none"><ChevronLeft aria-hidden className="size-4" strokeWidth={1.75} />Projects</Link>
      {name !== undefined && <><span aria-hidden className="text-text-muted">/</span><span aria-current="page" className="truncate font-medium">{name}</span></>}
    </nav>
  )
}

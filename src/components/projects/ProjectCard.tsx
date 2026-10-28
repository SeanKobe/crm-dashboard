import { Archive, CalendarDays, TriangleAlert } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '../../lib/cn'
import type { Project } from '../../types'
import { RecordChip } from '../notes/RecordChip'
import { ProgressBar } from '../ui/ProgressBar'
import { OwnerAvatars } from './OwnerAvatars'
import { ProjectStatusPill } from './ProjectStatusPill'
import { dueLabel, peopleOf, progressOf, progressText } from './projectMeta'

// Grid card: name, status pill, linked record, owner avatars, due date and progress ("7 of 12 tasks"). The whole card opens the project
// through the name link (its ::after covers the card), so there is one tab stop per card.
export function DueText({ project, className }: { project: Pick<Project, 'dueDate' | 'status' | 'archivedAt'>; className?: string }) {
  const due = dueLabel(project)
  const Icon = due.overdue ? TriangleAlert : CalendarDays
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap text-compact', due.overdue ? 'font-medium text-danger-strong' : 'text-text-secondary', className)} data-due={due.overdue ? 'overdue' : 'ok'}>
      <Icon aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
      {due.text}
    </span>
  )
}

export function ProjectCard({ project }: { project: Project }) {
  const pr = progressOf(project)
  return (
    <article
      data-project-card={project.id}
      className="relative flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-card transition-[transform,translate,box-shadow,border-color] duration-hover ease-out hover:-translate-y-0.5 hover:border-border-strong hover:shadow-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-base font-medium leading-5">
          <Link to={`/projects/${project.id}`} className="rounded-xs outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-[3px] focus-visible:after:ring-focus-ring">{project.name}</Link>
        </h3>
        <ProjectStatusPill status={project.status} />
      </div>
      <div className="flex min-h-6 flex-wrap items-center gap-1.5">
        {project.links.slice(0, 1).map((l) => <RecordChip key={`${l.type}:${l.id}`} link={l} showRestore={false} />)}
        {project.links.length > 1 && <span className="text-xs font-medium text-text-secondary">+{project.links.length - 1} more</span>}
        {project.links.length === 0 && <span className="text-xs text-text-secondary">Not linked to a deal or contact</span>}
      </div>
      <div className="flex items-center justify-between gap-3">
        <OwnerAvatars ids={peopleOf(project)} />
        <span className="flex items-center gap-3">
          {project.archivedAt && <span className="inline-flex items-center gap-1 text-xs text-text-secondary"><Archive aria-hidden className="size-3.5" strokeWidth={1.75} />Archived</span>}
          <DueText project={project} />
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <ProgressBar value={pr.percent} label={`Progress of ${project.name}`} valueText={progressText(pr)} />
        <p className="text-xs tabular-nums text-text-secondary" data-progress-text>{progressText(pr)}</p>
      </div>
    </article>
  )
}

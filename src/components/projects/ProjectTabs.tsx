import { Archive, CirclePlus, ListChecks, Pencil, RefreshCw, SquareCheckBig, Undo2, Link2, Trash2, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatShort, relativeTime } from '../../lib/dates'
import { useAutosave } from '../../lib/useAutosave'
import { projectsService } from '../../services/projects'
import type { IconComponent, Project, ProjectActivityKind, SaveStatus } from '../../types'
import { Avatar } from '../ui/Avatar'
import { Menu } from '../ui/Menu'
import { LinkPicker } from '../calendar/pickers'
import { OwnerAvatars } from './OwnerAvatars'
import { ProjectStatusPill } from './ProjectStatusPill'
import { allOwners, ownerById, peopleOf, progressOf, progressText } from './projectMeta'

// Overview tab: description (autosaves), linked records (open them, add or remove), team and key facts.
const SAVE_TEXT: Record<SaveStatus, string> = { idle: '', saving: 'Saving…', saved: 'Saved', error: 'Couldn’t save. Your text is kept.' }

export function OverviewTab({ project }: { project: Project }) {
  const [text, setText] = useState(project.description)
  const [seen, setSeen] = useState(project.description)
  if (seen !== project.description && text === seen) { setSeen(project.description); setText(project.description) }
  const save = useAutosave<{ description: string }>((patch) => projectsService.update(project.id, patch))
  const pr = progressOf(project)
  const members = project.memberIds.filter((id) => id !== project.ownerId)
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,22rem)] gap-6 max-lg:grid-cols-1" data-overview-tab>
      <div className="flex min-w-0 flex-col gap-6">
        <section className="flex flex-col gap-2" aria-labelledby="ov-desc">
          <div className="flex items-center justify-between">
            <h3 id="ov-desc" className="text-sm font-medium">Description</h3>
            <span role="status" aria-live="polite" data-save-status className="text-xs text-text-secondary">{SAVE_TEXT[save.status]}</span>
          </div>
          <textarea
            aria-labelledby="ov-desc"
            value={text}
            rows={5}
            placeholder="What is this project for? Add goals, scope and anything the team should know."
            onChange={(e) => { setText(e.target.value); save.queue({ description: e.target.value }) }}
            onBlur={() => { void save.flush() }}
            className="min-h-28 w-full resize-y rounded-md border border-border bg-surface px-3 py-2.5 text-sm leading-4.25 outline-none transition-[border-color,box-shadow] duration-hover ease-out placeholder:text-text-secondary hover:border-border-strong focus:border-primary focus:ring-[3px] focus:ring-focus-ring motion-reduce:transition-none"
          />
        </section>
        <section className="flex flex-col gap-2" aria-labelledby="ov-links">
          <h3 id="ov-links" className="text-sm font-medium">Linked records</h3>
          <p className="text-xs text-text-secondary">The deals and contacts this work is for. Click a record to open it.</p>
          <LinkPicker value={project.links} onChange={(links) => { void projectsService.update(project.id, { links }) }} types={['deal', 'contact', 'company']} navigable />
        </section>
      </div>
      <aside className="flex min-w-0 flex-col gap-4 rounded-lg border border-border bg-surface-subtle p-4" aria-label="Project details">
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3 text-sm">
          <dt className="text-text-secondary">Status</dt><dd><ProjectStatusPill status={project.status} /></dd>
          <dt className="text-text-secondary">Owner</dt><dd className="flex items-center gap-2"><OwnerAvatars ids={[project.ownerId]} max={1} /><span className="truncate">{ownerById(project.ownerId)?.name ?? 'Nobody'}</span></dd>
          <dt className="text-text-secondary">Due date</dt><dd>{project.dueDate ? formatShort(project.dueDate) : 'No due date'}</dd>
          <dt className="text-text-secondary">Progress</dt><dd className="tabular-nums">{progressText(pr)} ({pr.percent}%)</dd>
          <dt className="text-text-secondary">Created</dt><dd>{formatShort(project.createdAt.slice(0, 10))}</dd>
          <dt className="text-text-secondary">Updated</dt><dd>{relativeTime(project.updatedAt)}</dd>
        </dl>
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Team</h3>
            <Menu
              align="end"
              label="Team members"
              items={[{ type: 'label', label: 'Team members' }, ...allOwners.filter((o) => o.id !== project.ownerId).map((o) => ({ id: o.id, label: o.name, avatar: { initial: o.initial, tone: o.tone }, checked: project.memberIds.includes(o.id), keepOpen: true, onSelect: () => { void projectsService.update(project.id, { memberIds: project.memberIds.includes(o.id) ? project.memberIds.filter((m) => m !== o.id) : [...project.memberIds, o.id] }) } }))]}
              trigger={({ props }) => <button {...props} type="button" className="flex h-7 items-center gap-1 rounded-sm px-2 text-compact font-medium text-primary outline-none transition-colors duration-hover ease-out hover:bg-primary-soft focus-ring motion-reduce:transition-none"><Users aria-hidden className="size-4" strokeWidth={1.75} />Edit team</button>}
            />
          </div>
          <ul className="flex flex-col gap-1.5" aria-label="Team">
            {peopleOf(project).map((id) => { const o = ownerById(id); return o ? <li key={id} className="flex items-center gap-2 text-sm"><Avatar initial={o.initial} tone={o.tone} size="L" />{o.name}{id === project.ownerId && <span className="text-xs text-text-secondary">· Owner</span>}</li> : null })}
            {members.length === 0 && <li className="text-xs text-text-secondary">Just the owner so far.</li>}
          </ul>
        </div>
      </aside>
    </div>
  )
}

const ACTIVITY_ICON: Record<ProjectActivityKind, IconComponent> = {
  created: CirclePlus, status: RefreshCw, 'task-added': ListChecks, 'task-done': SquareCheckBig, 'task-reopened': Undo2, 'task-removed': Trash2, archived: Archive, restored: Archive, renamed: Pencil, linked: Link2,
}

// Activity tab: the timeline. Entries are added by the service when tasks are completed, reopened, added or removed and when the status changes.
export function ActivityTab({ project }: { project: Project }) {
  const [, force] = useState(0)
  useEffect(() => { const t = setInterval(() => force((n) => n + 1), 60000); return () => clearInterval(t) }, [])
  if (project.activity.length === 0) return <p className="text-sm text-text-secondary">No activity yet.</p>
  return (
    <ol className="flex flex-col" aria-label="Activity" data-activity-list>
      {project.activity.map((a) => {
        const Icon = ACTIVITY_ICON[a.kind]
        const who = ownerById(a.ownerId)
        return (
          <li key={a.id} data-activity-kind={a.kind} className="relative flex gap-3 pb-5 last:pb-0 [&:not(:last-child)]:before:absolute [&:not(:last-child)]:before:left-4 [&:not(:last-child)]:before:top-9 [&:not(:last-child)]:before:bottom-0 [&:not(:last-child)]:before:w-px [&:not(:last-child)]:before:bg-border">
            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-surface text-text-secondary"><Icon aria-hidden className="size-4" strokeWidth={1.75} /></span>
            <div className="flex min-w-0 flex-col gap-0.5 pt-1">
              <p className="text-sm">{a.text}</p>
              <p className="text-xs text-text-secondary">{who?.name ?? 'Someone'} · <time dateTime={a.at}>{relativeTime(a.at)}</time></p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

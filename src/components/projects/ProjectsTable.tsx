import { Archive } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import type { Project } from '../../types'
import { RecordChip } from '../notes/RecordChip'
import { ProgressBar } from '../ui/ProgressBar'
import { DueText } from './ProjectCard'
import { OwnerAvatars } from './OwnerAvatars'
import { ProjectStatusPill } from './ProjectStatusPill'
import { peopleOf, progressOf, progressText } from './projectMeta'

// List view: one row per project with the same facts as the card. The name is the link; the row is clickable too.
const TH = 'px-4 py-2.5 text-left text-xs font-medium text-text-secondary'

export function ProjectsTable({ projects }: { projects: Project[] }) {
  const navigate = useNavigate()
  return (
    <div className="overflow-auto rounded-lg border border-border bg-surface shadow-card" role="region" aria-label="Projects list" tabIndex={0} data-projects-table>
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead className="bg-surface-subtle shadow-[inset_0_-1px_0_var(--color-border)]">
          <tr>
            <th scope="col" className={TH}>Project</th>
            <th scope="col" className={TH}>Status</th>
            <th scope="col" className={TH}>Owners</th>
            <th scope="col" className={TH}>Due</th>
            <th scope="col" className={`${TH} w-56`}>Progress</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => {
            const pr = progressOf(p)
            return (
              <tr key={p.id} data-project-row={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="cursor-pointer border-b border-border transition-colors duration-hover ease-out last:border-b-0 hover:bg-surface-subtle motion-reduce:transition-none">
                <th scope="row" className="max-w-80 px-4 py-3 text-left font-normal">
                  <div className="flex min-w-0 flex-col gap-1">
                    <Link to={`/projects/${p.id}`} onClick={(e) => e.stopPropagation()} className="w-fit max-w-full truncate rounded-xs font-medium outline-none focus-ring">{p.name}</Link>
                    <span className="flex flex-wrap items-center gap-1.5">
                      {p.links.slice(0, 1).map((l) => <RecordChip key={`${l.type}:${l.id}`} link={l} showRestore={false} />)}
                      {p.links.length > 1 && <span className="text-xs font-medium text-text-secondary">+{p.links.length - 1} more</span>}
                      {p.archivedAt && <span className="inline-flex items-center gap-1 text-xs text-text-secondary"><Archive aria-hidden className="size-3.5" strokeWidth={1.75} />Archived</span>}
                    </span>
                  </div>
                </th>
                <td className="px-4 py-3"><ProjectStatusPill status={p.status} /></td>
                <td className="px-4 py-3"><OwnerAvatars ids={peopleOf(p)} /></td>
                <td className="px-4 py-3"><DueText project={p} /></td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1.5">
                    <ProgressBar value={pr.percent} label={`Progress of ${p.name}`} valueText={progressText(pr)} />
                    <span className="text-xs tabular-nums text-text-secondary" data-progress-text>{progressText(pr)}</span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

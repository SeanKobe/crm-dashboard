import { FolderPlus } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useToast } from '../../context/toastContext'
import { useProjects } from '../../lib/useProjects'
import type { EventLink } from '../../types'
import { Button } from '../ui/Button'
import { ProgressBar } from '../ui/ProgressBar'
import { SkeletonLine } from '../ui/Skeleton'
import { ProjectStatusPill } from './ProjectStatusPill'
import { progressOf, progressText } from './projectMeta'

// "Projects" section for the Deal and Contact drawers: the projects linked to this record, a link to open each one, and "Create project"
// (the form opens with this record already linked). The form is its own chunk, loaded on first use.
const ProjectFormModal = lazy(() => import('./ProjectFormModal').then((m) => ({ default: m.ProjectFormModal })))

export function LinkedProjects({ link, nameHint }: { link: EventLink; nameHint?: string }) {
  const navigate = useNavigate()
  const toast = useToast()
  const { projects, status } = useProjects()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [key, setKey] = useState(0)
  const linked = useMemo(() => projects.filter((p) => !p.archivedAt && p.links.some((l) => l.type === link.type && l.id === link.id)), [projects, link.type, link.id])
  return (
    <section aria-label="Projects" className="flex flex-col gap-3" data-linked-projects>
      <div className="flex items-center gap-2">
        <h3 className="flex-1 text-base font-medium">Projects</h3>
        <Button icon={FolderPlus} onClick={() => { setMounted(true); setKey((k) => k + 1); setOpen(true) }}>Create project</Button>
      </div>
      {status === 'loading' && <div role="status" aria-busy="true" aria-label="Loading projects"><SkeletonLine className="w-56" /></div>}
      {status === 'ready' && linked.length === 0 && <p className="text-sm text-text-secondary">No projects linked yet.</p>}
      <ul className="flex flex-col gap-1">
        {linked.map((p) => {
          const pr = progressOf(p)
          return (
            <li key={p.id}>
              <button type="button" data-linked-project={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="flex w-full flex-col gap-2 rounded-md border border-border px-3 py-2 text-left outline-none transition-colors duration-hover ease-out hover:border-border-strong hover:bg-surface-subtle focus-ring motion-reduce:transition-none">
                <span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium">{p.name}</span><ProjectStatusPill status={p.status} /></span>
                <ProgressBar value={pr.percent} label={`Progress of ${p.name}`} valueText={progressText(pr)} />
                <span className="text-xs tabular-nums text-text-secondary">{progressText(pr)}</span>
              </button>
            </li>
          )
        })}
      </ul>
      {mounted && (
        <Suspense fallback={null}>
          <ProjectFormModal key={key} open={open} onClose={() => setOpen(false)} initialLinks={[link]} initialName={nameHint} onCreated={(p) => { setOpen(false); toast({ type: 'success', title: 'Project created', message: p.name, action: { label: 'Open', onClick: () => navigate(`/projects/${p.id}`) } }) }} />
        </Suspense>
      )}
    </section>
  )
}

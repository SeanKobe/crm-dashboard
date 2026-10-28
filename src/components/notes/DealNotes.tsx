import { Plus, StickyNote } from 'lucide-react'
import { useNavigate } from 'react-router'
import { preview } from '../../lib/noteText'
import { shortRelative } from '../../lib/dates'
import { useNotes } from '../../lib/useNotes'
import { Button } from '../ui/Button'
import { SkeletonLine } from '../ui/Skeleton'
import type { PipelineDeal } from '../../types'

// "Linked notes" section of the deal drawer: notes linked to this deal, "Add note" creates one pre-linked, a click opens /notes/:id.
export function DealNotes({ deal }: { deal: PipelineDeal }) {
  const navigate = useNavigate()
  const { notes, status, create, reload } = useNotes({ linkId: deal.id })
  const add = async () => {
    const n = await create({ title: '', link: { type: 'deal', id: deal.id } })
    navigate(`/notes/${n.id}`)
  }
  return (
    <section aria-labelledby="drawer-notes" className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h3 id="drawer-notes" className="flex-1 text-base font-medium">Linked notes</h3>
        <Button icon={Plus} onClick={() => { void add() }}>Add note</Button>
      </div>
      {status === 'loading' && <div aria-busy="true" role="status" aria-label="Loading notes" className="flex flex-col gap-2"><SkeletonLine className="h-4 w-48" /><SkeletonLine className="w-full" /></div>}
      {status === 'error' && <p role="alert" className="text-sm text-danger-strong">Couldn’t load notes. <button type="button" onClick={reload} className="font-medium underline underline-offset-2">Retry</button></p>}
      {status === 'ready' && notes.length === 0 && <p className="text-sm text-text-secondary">No notes linked to this deal yet.</p>}
      {status === 'ready' && notes.length > 0 && (
        <ul className="flex flex-col gap-1" aria-label="Notes linked to this deal">
          {[...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((n) => (
            <li key={n.id}>
              <button type="button" data-linked-note={n.id} onClick={() => navigate(`/notes/${n.id}`)} className="flex w-full items-start gap-3 rounded-md border border-border px-3 py-2 text-left outline-none transition-colors duration-hover ease-out hover:border-border-strong hover:bg-surface-subtle focus-ring motion-reduce:transition-none">
                <StickyNote aria-hidden className="mt-0.5 size-5 shrink-0 text-text-secondary" strokeWidth={1.75} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium leading-4.25">{n.title || 'Untitled note'}</span>
                  <span className="truncate text-compact leading-4 text-text-secondary">{preview(n.body, 90) || 'No content yet'}</span>
                </span>
                <span className="shrink-0 text-xs leading-3.75 text-text-secondary">{shortRelative(n.updatedAt)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

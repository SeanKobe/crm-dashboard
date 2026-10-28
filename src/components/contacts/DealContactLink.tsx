import { ArrowUpRight, User } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useRecords } from '../../context/recordsContext'

// Deal drawer: the contact linked to this deal, by id, shown with the contact's CURRENT name. Opens /contacts/:id.
// A deleted contact reads "Deleted contact" (muted) with a Restore link.
export function DealContactLink({ contactId }: { contactId?: string }) {
  const navigate = useNavigate()
  const { resolve, restore } = useRecords()
  const link = contactId ? ({ type: 'contact', id: contactId } as const) : null
  const r = resolve(link)
  if (!link || !r || (!r.deleted && r.name === null)) return null
  if (r.deleted) {
    return (
      <div data-deal-contact-link-deleted className="flex w-full items-center gap-3 rounded-md border border-dashed border-border-strong px-3 py-2">
        <User aria-hidden className="size-5 shrink-0 text-text-secondary" strokeWidth={1.75} />
        <span className="flex min-w-0 flex-1 flex-col"><span className="text-xs leading-3.75 text-text-secondary">Linked contact</span><span className="text-sm font-medium leading-4.25 text-text-secondary">Deleted contact</span></span>
        {r.canRestore && <button type="button" onClick={() => { void restore(link) }} className="rounded-xs text-compact font-medium text-primary underline underline-offset-2 outline-none focus-ring">Restore</button>}
      </div>
    )
  }
  return (
    <button
      type="button"
      data-deal-contact-link={link.id}
      onClick={() => navigate(`/contacts/${link.id}`)}
      className="flex w-full items-center gap-3 rounded-md border border-border px-3 py-2 text-left outline-none transition-colors duration-hover ease-out hover:border-border-strong hover:bg-surface-subtle focus-ring motion-reduce:transition-none"
    >
      <User aria-hidden className="size-5 shrink-0 text-text-secondary" strokeWidth={1.75} />
      <span className="flex min-w-0 flex-1 flex-col"><span className="text-xs leading-3.75 text-text-secondary">Linked contact</span><span className="truncate text-sm font-medium leading-4.25">{r.name}</span></span>
      <ArrowUpRight aria-hidden className="size-5 shrink-0 text-text-secondary" strokeWidth={1.75} />
    </button>
  )
}

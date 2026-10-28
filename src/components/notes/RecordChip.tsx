import { Building2, Folder, Handshake, StickyNote, User } from 'lucide-react'
import { useRecords } from '../../context/recordsContext'
import { recordLabel } from '../../data/records'
import { cn } from '../../lib/cn'
import type { IconComponent, NoteLink, RecordType } from '../../types'

const icons: Record<RecordType, IconComponent> = { deal: Handshake, contact: User, company: Building2, note: StickyNote, project: Folder }

// Linked record chip: icon + type + the record's CURRENT name (resolved when shown). A deleted record reads "Deleted contact" in a muted,
// dashed style, with a Restore link where the record can be restored (contacts).
export function RecordChip({ link, className, showRestore = true }: { link: NoteLink; className?: string; showRestore?: boolean }) {
  const { resolve, restore } = useRecords()
  const r = resolve(link)
  if (!r) return null
  const Icon = icons[link.type]
  const label = recordLabel[link.type]
  if (r.deleted) {
    return (
      <span className={cn('inline-flex max-w-full items-center gap-1 rounded-sm border border-dashed border-border-strong bg-surface px-[7px] py-0.5 text-xs font-medium leading-3.75 text-text-secondary', className)} data-deleted-record title={`This ${label.toLowerCase()} was deleted`}>
        <Icon aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} />
        <span className="truncate">Deleted {label.toLowerCase()}</span>
        {r.canRestore && showRestore && (
          <button type="button" onClick={(e) => { e.stopPropagation(); void restore(link) }} onKeyDown={(e) => e.stopPropagation()} className="rounded-xs font-medium text-primary underline underline-offset-2 outline-none focus-ring">Restore</button>
        )}
      </span>
    )
  }
  return (
    <span className={cn('inline-flex max-w-full items-center gap-1 rounded-sm border border-primary/30 bg-surface px-[7px] py-0.5 text-xs font-medium leading-3.75 text-primary', className)} title={r.name ? `${label}: ${r.name}` : label}>
      <Icon aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} />
      <span className="truncate"><span className="font-normal">{label} · </span>{r.name ?? '…'}</span>
    </span>
  )
}

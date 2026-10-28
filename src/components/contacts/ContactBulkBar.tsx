import { ArrowRightLeft, Download, Tag as TagIcon, Trash2, UserRound, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { owners } from '../../data/deals'
import { LEAD_STATUSES } from '../../lib/contactsLogic'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { Menu, Popover } from '../ui/Menu'
import { TextField } from '../ui/TextField'
import type { LeadStatus, MenuEntry } from '../../types'

// Figma "Bulk Action Bar" for contacts (sits at the top of the table card so toasts never cover it): count, Change status, Assign owner, Add tag, Export selected, divider, Delete (danger).
export interface ContactBulkBarProps {
  count: number
  allTags: string[]
  onClear: () => void
  onStatus: (s: LeadStatus) => void
  onOwner: (ownerId: string) => void
  onTag: (tag: string) => void
  onExport: () => void
  onDelete: () => void
}

export function ContactBulkBar({ count, allTags, onClear, onStatus, onOwner, onTag, onExport, onDelete }: ContactBulkBarProps) {
  const [tagOpen, setTagOpen] = useState(false)
  const [anchor, setAnchor] = useState<HTMLSpanElement | null>(null)
  const anchorRef = useMemo(() => ({ current: anchor }), [anchor])
  const [text, setText] = useState('')
  const statusItems: MenuEntry[] = LEAD_STATUSES.map((s) => ({ id: s, label: s, onSelect: () => onStatus(s) }))
  const ownerItems: MenuEntry[] = owners.map((o) => ({ id: o.id, label: o.name, avatar: { initial: o.initial, tone: o.tone }, onSelect: () => onOwner(o.id) }))
  const applyTag = (raw: string) => { const t = raw.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 24); if (!t) return; onTag(t); setTagOpen(false); setText('') }
  return (
    <div role="toolbar" aria-label="Bulk actions" className="mx-4 my-3 flex min-h-12 w-fit max-w-[calc(100%-2rem)] shrink-0 animate-rise flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-surface px-4 py-1 shadow-hover">
      <span className="text-sm font-medium" data-bulk-count>{count} selected</span>
      <span className="w-2" />
      <Menu label="Change status" items={statusItems} trigger={({ props }) => <Button icon={ArrowRightLeft} menuProps={props}>Change status</Button>} />
      <Menu label="Assign owner" items={ownerItems} trigger={({ props }) => <Button icon={UserRound} menuProps={props}>Assign owner</Button>} />
      <span ref={setAnchor} className="inline-flex"><Button icon={TagIcon} onClick={() => { setText(''); setTagOpen(true) }}>Add tag</Button></span>
      <Popover open={tagOpen} onClose={(restore) => { setTagOpen(false); if (restore) anchor?.querySelector('button')?.focus() }} anchorRef={anchorRef} role="dialog" label="Add tag">
        <form onSubmit={(e) => { e.preventDefault(); applyTag(text) }} className="flex w-72 flex-col gap-3 rounded-lg border border-border bg-surface p-3 shadow-hover">
          <TextField label="Tag" autoFocus value={text} onChange={setText} placeholder="e.g. vip" helper={`Adds the tag to ${count} contact${count === 1 ? '' : 's'}.`} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyTag(text) } }} />
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Existing tags">
              {allTags.slice(0, 8).map((t) => <button key={t} type="button" onClick={() => applyTag(t)} className="rounded-sm bg-surface-muted px-2 py-[3px] text-xs font-medium text-text-secondary outline-none transition-colors duration-hover ease-out hover:text-text-primary focus-ring">{t}</button>)}
            </div>
          )}
          <div className="flex justify-end"><Button variant="primary" onClick={() => applyTag(text)}>Add tag</Button></div>
        </form>
      </Popover>
      <Button icon={Download} onClick={onExport}>Export selected</Button>
      <span aria-hidden className="h-6 w-px bg-border" />
      <Button variant="destructive" strong icon={Trash2} onClick={onDelete}>Delete</Button>
      <IconButton icon={X} label="Clear selection" size="sm" onClick={onClear} />
    </div>
  )
}

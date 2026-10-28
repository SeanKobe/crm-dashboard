import { ArrowRightLeft, Trash2, UserRound, X } from 'lucide-react'
import { stages } from '../../data/deals'
import { useDeals } from '../../context/dealsContext'
import { Button } from '../ui/Button'
import { Checkbox } from '../ui/Checkbox'
import { IconButton } from '../ui/IconButton'
import { Menu } from '../ui/Menu'
import type { MenuEntry, Stage } from '../../types'

// Figma "Bulk Action Bar": checkbox, "N selected", Assign owner, Move stage (Figma: "Change status"), Delete, clear.
export interface BulkActionBarProps {
  count: number
  total: number
  onClear: () => void
  onMoveStage: (stage: Stage) => void
  onAssign: (ownerId: string) => void
  onDelete: () => void
}

export function BulkActionBar({ count, total, onClear, onMoveStage, onAssign, onDelete }: BulkActionBarProps) {
  const { owners } = useDeals()
  const stageItems: MenuEntry[] = stages.map((s) => ({ id: s.id, label: s.label, onSelect: () => onMoveStage(s.id) }))
  const ownerItems: MenuEntry[] = owners.map((o) => ({ id: o.id, label: o.name, avatar: { initial: o.initial, tone: o.tone }, onSelect: () => onAssign(o.id) }))
  return (
    <div role="toolbar" aria-label="Bulk actions" className="absolute bottom-4 left-1/2 z-20 flex h-12 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 animate-rise items-center gap-3 rounded-lg border border-border bg-surface px-4 shadow-hover">
      <Checkbox checked={count === total} mixed={count < total} onChange={() => onClear()} label="Clear selection" />
      <span className="text-sm font-medium" aria-live="polite">{count} selected</span>
      <span className="w-6" />
      <Menu label="Assign owner" items={ownerItems} trigger={({ props }) => <Button icon={UserRound} menuProps={props}>Assign owner</Button>} />
      <Menu label="Move stage" items={stageItems} trigger={({ props }) => <Button icon={ArrowRightLeft} menuProps={props}>Move stage</Button>} />
      <Button variant="destructive" strong icon={Trash2} onClick={onDelete}>Delete</Button>
      <IconButton icon={X} label="Clear selection" size="sm" onClick={onClear} />
    </div>
  )
}


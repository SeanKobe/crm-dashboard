import { useDroppable } from '@dnd-kit/core'
import { ChevronsLeft, ChevronsRight, Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { stages } from '../../data/deals'
import { cn } from '../../lib/cn'
import { money } from '../../lib/dealsLogic'
import { AnimatedNumber } from '../ui/AnimatedNumber'
import { Badge } from '../ui/Badge'
import { IconButton } from '../ui/IconButton'
import { stageStyle } from './stageStyles'
import type { Stage } from '../../types'

// Figma "Kanban Column": 300px (280 below 1024px), 12px padding, header with stage dot, name, count and "add".
// States: Default / Drop Target (primary-soft + "Drop deal here") / Empty / Collapsed (56px with a vertical label).
export interface KanbanColumnProps {
  stage: Stage
  count: number
  total: number
  collapsed: boolean
  /** A card from another column is being dragged over this one. */
  dropTarget: boolean
  /** A drag is in progress (all columns accept drops). */
  dragging: boolean
  empty: boolean
  /** The column is empty only because filters hide its deals. */
  filtered: boolean
  adding: boolean
  onToggle: () => void
  onAdd: () => void
  addForm: ReactNode
  children: ReactNode
}

export function KanbanColumn({ stage, count, total, collapsed, dropTarget, dragging, empty, filtered, adding, onToggle, onAdd, addForm, children }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id: stage })
  const label = stages.find((s) => s.id === stage)?.label ?? stage
  const style = stageStyle[stage]

  if (collapsed) {
    return (
      <section
        ref={setNodeRef}
        aria-label={`${label} column, collapsed, ${count} deals, ${money(total)}`}
        data-stage={stage}
        data-collapsed=""
        className={cn(
          'relative flex w-14 shrink-0 flex-col items-center gap-3 rounded-lg border p-3 transition-[background-color,border-color] duration-hover ease-out motion-reduce:transition-none',
          dropTarget ? 'border-primary bg-primary-soft' : 'border-border bg-surface-subtle',
        )}
      >
        <IconButton icon={ChevronsRight} label={`Expand ${label} column`} size="xs" onClick={onToggle} />
        <Badge><AnimatedNumber value={count} /></Badge>
        <div className="flex items-center gap-2 [writing-mode:vertical-rl]">
          <span aria-hidden className={cn('size-2 rounded-full', style.dot)} />
          <span className="text-sm font-medium">{label}</span>
        </div>
      </section>
    )
  }

  return (
    <section
      ref={setNodeRef}
      aria-label={`${label} column`}
      data-stage={stage}
      className={cn(
        'relative flex w-70 shrink-0 flex-col overflow-y-auto overscroll-contain rounded-lg border px-3 pb-3 transition-[background-color,border-color] duration-hover ease-out motion-reduce:transition-none lg:w-75',
        dropTarget ? 'border-primary bg-primary-soft' : 'border-border bg-surface-subtle',
      )}
    >
      <header className={cn('sticky top-0 z-10 -mx-3 flex flex-col gap-0.5 px-3 pb-3 pt-3 transition-colors duration-hover ease-out motion-reduce:transition-none', dropTarget ? 'bg-primary-soft' : 'bg-surface-subtle')}>
        <div className="flex items-center gap-2">
          <span aria-hidden className={cn('size-2 shrink-0 rounded-full', style.dot)} />
          <h3 className="text-sm font-medium leading-4.25">{label}</h3>
          <Badge><AnimatedNumber value={count} /></Badge>
          <span className="flex-1" />
          <IconButton icon={Plus} label={`Add deal to ${label}`} size="xs" onClick={onAdd} />
          <IconButton icon={ChevronsLeft} label={`Collapse ${label} column`} size="xs" onClick={onToggle} />
        </div>
        <p className="pl-4 text-xs leading-3.75 text-text-secondary">
          <AnimatedNumber value={total} format={money} /> total
        </p>
      </header>
      <div className="flex flex-1 flex-col gap-3">
        {adding && addForm}
        {empty && !adding && !dropTarget && (
          <div className="grid min-h-22 place-items-center rounded-lg border border-dashed border-border-strong px-4 py-3 text-center text-compact font-medium leading-4 text-text-secondary">
            {filtered ? `No matching deals in ${label}.` : `No deals in ${label}. Drag one here or add a deal.`}
          </div>
        )}
        <ul role="list" className="flex flex-col gap-3">{children}</ul>
        {dropTarget && (
          <div className="grid min-h-22 place-items-center rounded-lg border border-primary bg-primary-soft text-compact font-medium text-primary">Drop deal here</div>
        )}
        {!adding && !dragging && (
          <button type="button" onClick={onAdd} className="flex h-10 w-full items-center gap-1.5 rounded-md px-2.5 text-sm font-medium text-primary outline-none transition-colors duration-hover ease-out hover:bg-primary-soft focus-ring motion-reduce:transition-none">
            <Plus aria-hidden className="size-5" strokeWidth={1.75} />
            Add deal
          </button>
        )}
      </div>
    </section>
  )
}

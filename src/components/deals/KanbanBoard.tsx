import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, pointerWithin, useSensor, useSensors,
  type Announcements, type CollisionDetection, type DragEndEvent, type DragOverEvent, type DragStartEvent, type KeyboardCoordinateGetter,
} from '@dnd-kit/core'
import { useEffect, useMemo, useRef, useState } from 'react'
import { stageLabel, stages } from '../../data/deals'
import { useDeals } from '../../context/dealsContext'
import { motion, prefersReducedMotion } from '../../lib/motion'
import { sumValue } from '../../lib/dealsLogic'
import { DealCardView, DraggableDealCard } from './DealCard'
import { InlineAddDeal } from './InlineAddDeal'
import { KanbanColumn } from './KanbanColumn'
import type { MenuEntry, PipelineDeal, Stage } from '../../types'

const ORDER: Stage[] = stages.map((s) => s.id)

// Pointer: the column under the cursor. Keyboard (no pointer): the column whose center is closest to the picked-up card.
const collision: CollisionDetection = (args) => {
  const hit = pointerWithin(args)
  return hit.length ? hit : closestCenter(args)
}

// Keyboard: any arrow key jumps the picked-up card to the next / previous column (Up / Left = previous, Down / Right = next).
const columnJump: KeyboardCoordinateGetter = (event, { context: { active, over, droppableRects } }) => {
  if (!active) return undefined
  const dir = event.code === 'ArrowRight' || event.code === 'ArrowDown' ? 1 : event.code === 'ArrowLeft' || event.code === 'ArrowUp' ? -1 : 0
  if (!dir) return undefined
  event.preventDefault()
  const from = String(over?.id ?? active.data.current?.stage)
  const next = ORDER[Math.max(0, Math.min(ORDER.length - 1, ORDER.indexOf(from as Stage) + dir))]
  const rect = droppableRects.get(next)
  return rect ? { x: rect.left + 8, y: rect.top + 8 } : undefined
}

export interface KanbanBoardProps {
  /** Deals after filters, in display order. */
  deals: PipelineDeal[]
  hasFilters: boolean
  selectedId: string | null
  freshId: string | null
  flashId?: string | null
  menuFor: (deal: PipelineDeal) => MenuEntry[]
  onOpen: (id: string) => void
  onMove: (id: string, to: Stage) => void
  onAdd: (input: { name: string; company: string; value: number; stage: Stage }) => void
}

export function KanbanBoard({ deals, hasFilters, selectedId, freshId, flashId, menuFor, onOpen, onMove, onAdd }: KanbanBoardProps) {
  const { state, ownerById, toggleCollapsed } = useDeals()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overStage, setOverStage] = useState<Stage | null>(null)
  const [adding, setAdding] = useState<Stage | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] }, coordinateGetter: columnJump }),
  )
  const byStage = useMemo(() => {
    const map = new Map<Stage, PipelineDeal[]>(ORDER.map((s) => [s, []]))
    for (const d of deals) map.get(d.stage)?.push(d)
    return map
  }, [deals])
  // Sideways scrolling from anywhere over the board. Cards and columns sit inside the scroller, but Safari (and Chrome over a
  // vertically scrolling column) don't always hand a sideways swipe up to it, so the board takes those gestures itself.
  const boardRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  useEffect(() => { dragging.current = activeId !== null }, [activeId])
  useEffect(() => {
    const board = boardRef.current
    if (!board) return undefined
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.defaultPrevented || dragging.current) return // pinch-zoom, and drags (dnd-kit auto-scroll owns those)
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? board.clientWidth : 1
      // Shift + wheel is a sideways scroll (Safari reports it as deltaY, other browsers as deltaX)
      const dx = (e.shiftKey && e.deltaX === 0 ? e.deltaY : e.deltaX) * unit
      const dy = e.shiftKey ? 0 : e.deltaY * unit
      if (dx === 0 || Math.abs(dx) <= Math.abs(dy)) return // vertical gestures keep scrolling the column as before
      const max = board.scrollWidth - board.clientWidth
      if (max <= 0) return
      // at the far left or right the gesture passes through
      if ((dx < 0 && board.scrollLeft <= 0) || (dx > 0 && board.scrollLeft >= max - 1)) return
      e.preventDefault()
      board.scrollLeft += dx
    }
    board.addEventListener('wheel', onWheel, { passive: false })
    return () => board.removeEventListener('wheel', onWheel)
  }, [])
  const active = activeId ? state.deals.find((d) => d.id === activeId) ?? null : null

  const find = (id: string | number) => state.deals.find((d) => d.id === id)
  const announcements: Announcements = {
    onDragStart: ({ active: a }) => { const d = find(a.id); return d ? `Picked up ${d.title}, currently in ${stageLabel(d.stage)}. Use the arrow keys to choose a column, Space to drop, Escape to cancel.` : undefined },
    onDragOver: ({ active: a, over }) => { const d = find(a.id); return d && over ? `${d.title} is over ${stageLabel(over.id as Stage)}.` : undefined },
    onDragEnd: ({ active: a, over }) => {
      const d = find(a.id)
      if (!d) return undefined
      if (!over) return `${d.title} was dropped outside the columns and did not move.`
      return over.id === d.stage ? `${d.title} was dropped back in ${stageLabel(d.stage)}.` : `Dropped ${d.title} on ${stageLabel(over.id as Stage)}.`
    },
    onDragCancel: ({ active: a }) => { const d = find(a.id); return d ? `Move cancelled. ${d.title} stays in ${stageLabel(d.stage)}.` : undefined },
  }

  const reset = () => { setActiveId(null); setOverStage(null) }
  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))
  const onDragOver = (e: DragOverEvent) => setOverStage(e.over ? (e.over.id as Stage) : null)
  const onDragEnd = (e: DragEndEvent) => {
    const id = String(e.active.id)
    const to = e.over ? (e.over.id as Stage) : null
    reset()
    if (to && find(id)?.stage !== to) onMove(id, to)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      accessibility={{ announcements, screenReaderInstructions: { draggable: 'To pick up a deal, focus it and press Space. Use the arrow keys to move it between columns, Space to drop it, and Escape to cancel. Press Enter to open its details.' } }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={reset}
    >
      <div ref={boardRef} className="relative flex h-full min-h-0 gap-4 overflow-x-auto overflow-y-hidden overscroll-x-contain rounded-2xl border border-border bg-surface p-4" role="region" aria-label="Deals board" tabIndex={-1} data-deals-fallback data-board>
        {stages.map((s) => {
          const list = byStage.get(s.id) ?? []
          const stageDeals = state.deals.filter((d) => d.stage === s.id)
          return (
            <KanbanColumn
              key={s.id}
              stage={s.id}
              count={list.length}
              total={sumValue(list)}
              collapsed={state.collapsed.includes(s.id)}
              dropTarget={Boolean(active && overStage === s.id && active.stage !== s.id)}
              dragging={Boolean(active)}
              empty={list.length === 0}
              filtered={hasFilters && stageDeals.length > 0}
              adding={adding === s.id}
              onToggle={() => toggleCollapsed(s.id)}
              onAdd={() => setAdding(s.id)}
              addForm={<InlineAddDeal stage={s.id} stageLabel={s.label} onCancel={() => setAdding(null)} onAdd={(input) => { setAdding(null); onAdd(input) }} />}
            >
              {list.map((d) => (
                <li key={d.id}>
                  <DraggableDealCard deal={d} owner={ownerById(d.ownerId)} menu={menuFor(d)} selected={selectedId === d.id} fresh={freshId === d.id} flash={flashId === d.id} onOpen={onOpen} />
                </li>
              ))}
            </KanbanColumn>
          )
        })}
      </div>
      <DragOverlay dropAnimation={prefersReducedMotion() ? null : { duration: motion.move, easing: motion.ease }}>
        {active && <DealCardView deal={active} owner={ownerById(active.ownerId)} dragging />}
      </DragOverlay>
    </DndContext>
  )
}

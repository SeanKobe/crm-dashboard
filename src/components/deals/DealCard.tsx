import { useDraggable } from '@dnd-kit/core'
import { Building2, Clock, GripVertical, TriangleAlert, User } from 'lucide-react'
import type { HTMLAttributes, KeyboardEvent, PointerEvent, Ref } from 'react'
import { useDeals } from '../../context/dealsContext'
import { useRecords } from '../../context/recordsContext'
import { priorityLabel } from '../../data/deals'
import { cn } from '../../lib/cn'
import { formatShort, daysInStage } from '../../lib/dates'
import { isOpen, isOverdue, money } from '../../lib/dealsLogic'
import { Avatar } from '../ui/Avatar'
import { Highlight } from '../ui/Highlight'
import { Menu } from '../ui/Menu'
import { Tag } from '../ui/Tag'
import { priorityTone } from './stageStyles'
import { MoreButton } from './MoreButton'
import { dealSummary } from './dealSummary'
import type { DealOwner, MenuEntry, PipelineDeal } from '../../types'

// Figma "Deal Card": 12px padding, 10px gaps, 12px radius. Default / Hover (lift) / Focus / Selected / Dragging.
export interface DealCardViewProps {
  deal: PipelineDeal
  owner: DealOwner
  menu?: MenuEntry[]
  /** The deal's drawer is open (Figma "Selected"). */
  selected?: boolean
  /** The floating copy that follows the pointer (Figma "Dragging"). */
  dragging?: boolean
  /** The card left behind while its copy is being dragged. */
  ghost?: boolean
  /** Plays the row-in animation for freshly created deals. */
  fresh?: boolean
  /** Briefly highlighted after the top search (or a link) took the user to this deal. */
  flash?: boolean
  rootProps?: HTMLAttributes<HTMLDivElement>
  rootRef?: Ref<HTMLDivElement>
}

const stop = (e: { stopPropagation: () => void }) => e.stopPropagation()

export function DealCardView({ deal, owner, menu, selected, dragging, ghost, fresh, flash, rootProps, rootRef }: DealCardViewProps) {
  // The search box of the page marks the matching text in the card; the contact line only appears when it is what matched.
  const { state } = useDeals()
  const { resolve } = useRecords()
  const query = state.filters.query
  const linked = deal.contactId ? resolve({ type: 'contact', id: deal.contactId }) : null
  const contact = linked ? (linked.deleted ? '' : linked.name ?? deal.contact) : deal.contact
  const contactMatch = Boolean(query.trim() && contact && contact.toLowerCase().includes(query.trim().toLowerCase()))
  const overdue = isOverdue(deal)
  const days = daysInStage(deal.stageSince)
  return (
    <div
      ref={rootRef}
      data-deal-id={deal.id}
      aria-label={dealSummary(deal, owner)}
      {...rootProps}
      className={cn(
        'group relative flex touch-manipulation select-none flex-col gap-2.5 rounded-lg border p-3 outline-none',
        'transition-[border-color,background-color,box-shadow,translate,opacity] duration-hover ease-out motion-reduce:transition-none',
        dragging
          ? 'rotate-0 cursor-grabbing border-primary bg-surface opacity-96 shadow-drag'
          : cn(
              'cursor-pointer shadow-card focus-ring',
              flash ? 'border-primary bg-primary-soft ring-[3px] ring-focus-ring' : selected ? 'border-primary bg-primary-soft' : ghost ? 'border-border-strong bg-surface' : 'border-border bg-surface',
              !ghost && 'hover:-translate-y-0.5 hover:shadow-hover',
              !ghost && !selected && 'hover:border-border-strong',
              ghost && 'border-dashed opacity-40 shadow-none',
              fresh && 'animate-row-in',
            ),
      )}
    >
      <div className="flex items-center gap-2">
        <h4 className="min-w-0 flex-1 truncate text-sm font-medium leading-4.25"><Highlight text={deal.title} query={query} phrase /></h4>
        {!dragging && !ghost && menu ? (
          <>
            <GripVertical aria-hidden className="size-5 shrink-0 text-text-secondary opacity-0 transition-opacity duration-hover ease-out group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none" strokeWidth={1.75} />
            {/* Menu events must not reach the card (React bubbles portal events through it): no drag, no open. */}
            <span onClick={stop} onKeyDown={stop} onPointerDown={stop}>
              <Menu align="end" label={`${deal.title} actions`} items={menu} trigger={({ props }) => <MoreButton props={props} label={`Actions for ${deal.title}`} className="-mr-1" />} />
            </span>
          </>
        ) : (
          <GripVertical aria-hidden className="size-5 shrink-0 text-text-secondary" strokeWidth={1.75} />
        )}
      </div>
      {deal.company && (
        <div className="flex items-center gap-1.5 text-compact text-text-secondary">
          <Building2 aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
          <span className="truncate"><Highlight text={deal.company} query={query} phrase /></span>
        </div>
      )}
      {contactMatch && (
        <div className="flex items-center gap-1.5 text-compact text-text-secondary">
          <User aria-hidden className="size-5 shrink-0" strokeWidth={1.75} />
          <span className="truncate"><Highlight text={contact} query={query} phrase /></span>
        </div>
      )}
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-base font-medium leading-4.75">{money(deal.value)}</span>
        <span className="text-xs leading-3.75 text-text-secondary" title={`${days} ${days === 1 ? 'day' : 'days'} in this stage`}>{days}d in stage</span>
      </div>
      <div className="flex items-center gap-2">
        <span title={owner.name} className="flex"><Avatar initial={owner.initial} tone={owner.tone} size="S" /></span>
        <Tag tone={priorityTone[deal.priority]}>{priorityLabel[deal.priority]}</Tag>
        <span className="flex-1" />
        {overdue ? (
          <span className="flex items-center gap-1 text-xs font-medium leading-3.75 text-warning-foreground">
            <TriangleAlert aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
            Overdue · {formatShort(deal.closeDate)}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs leading-3.75 text-text-secondary">
            <Clock aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
            {isOpen(deal) ? '' : deal.stage === 'won' ? 'Closed ' : 'Lost '}{formatShort(deal.closeDate)}
          </span>
        )}
      </div>
    </div>
  )
}

export interface DraggableDealCardProps extends Omit<DealCardViewProps, 'rootProps' | 'rootRef' | 'dragging' | 'ghost'> {
  onOpen: (id: string) => void
}

export function DraggableDealCard({ deal, onOpen, selected, ...rest }: DraggableDealCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: deal.id, data: { stage: deal.stage } })
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    ;(listeners?.onKeyDown as ((ev: KeyboardEvent<HTMLDivElement>) => void) | undefined)?.(e)
    if (e.key === 'Enter' && e.target === e.currentTarget) { e.preventDefault(); onOpen(deal.id) }
  }
  return (
    <DealCardView
      {...rest}
      deal={deal}
      selected={selected}
      ghost={isDragging}
      rootRef={setNodeRef}
      rootProps={{
        role: 'group',
        tabIndex: 0,
        'aria-roledescription': 'draggable deal',
        'aria-current': selected ? 'true' : undefined,
        'aria-describedby': attributes['aria-describedby'],
        onPointerDown: listeners?.onPointerDown as ((e: PointerEvent<HTMLDivElement>) => void) | undefined,
        onKeyDown,
        onClick: () => onOpen(deal.id),
      }}
    />
  )
}

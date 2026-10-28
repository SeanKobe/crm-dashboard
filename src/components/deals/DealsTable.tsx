import { ArrowDown, ArrowUp, ArrowUpDown, TriangleAlert } from 'lucide-react'
import { useMemo } from 'react'
import { useDeals } from '../../context/dealsContext'
import { useRecords } from '../../context/recordsContext'
import { cn } from '../../lib/cn'
import { formatShort, relativeTime } from '../../lib/dates'
import { isOverdue, lastActivityAt, money } from '../../lib/dealsLogic'
import { Avatar } from '../ui/Avatar'
import { Highlight } from '../ui/Highlight'
import { Checkbox } from '../ui/Checkbox'
import { Menu } from '../ui/Menu'
import { StatusPill } from '../ui/StatusPill'
import { MoreButton } from './MoreButton'
import type { DealSort, MenuEntry, PipelineDeal, SortKey } from '../../types'

// Figma "Table": 40px header (surface-subtle), 56px rows, hover = surface-subtle, selected = primary-soft, sortable header cells.
interface Column {
  key: SortKey
  label: string
  width: string
  align?: 'right'
}
const COLUMNS: Column[] = [
  { key: 'name', label: 'Deal', width: 'w-auto' },
  { key: 'company', label: 'Company', width: 'w-40' },
  { key: 'stage', label: 'Stage', width: 'w-32' },
  { key: 'value', label: 'Value', width: 'w-28', align: 'right' },
  { key: 'owner', label: 'Owner', width: 'w-40' },
  { key: 'closeDate', label: 'Close date', width: 'w-44' },
  { key: 'lastActivity', label: 'Last activity', width: 'w-36' },
]

export interface DealsTableProps {
  deals: PipelineDeal[]
  sort: DealSort
  onSort: (key: SortKey) => void
  selected: Set<string>
  onToggle: (id: string, on: boolean) => void
  onToggleAll: (on: boolean) => void
  selectedId: string | null
  flashId?: string | null
  menuFor: (deal: PipelineDeal) => MenuEntry[]
  onOpen: (id: string) => void
}

export function DealsTable({ deals, sort, onSort, selected, onToggle, onToggleAll, selectedId, flashId, menuFor, onOpen }: DealsTableProps) {
  const { ownerById, state } = useDeals()
  const query = state.filters.query
  const { resolve } = useRecords()
  const contactLabel = (d: PipelineDeal): string => {
    if (!d.contactId) return d.contact || 'No contact'
    const r = resolve({ type: 'contact', id: d.contactId })
    return r?.deleted ? 'Deleted contact' : r?.name ?? d.contact
  }
  const all = deals.length > 0 && deals.every((d) => selected.has(d.id))
  const some = !all && deals.some((d) => selected.has(d.id))
  const ariaSort = (key: SortKey) => (sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none')
  const rows = useMemo(() => deals, [deals])
  return (
    <table className="w-full min-w-[1080px] table-fixed border-collapse text-left">
      <caption className="sr-only">Deals, sorted by {sort.key} {sort.dir === 'asc' ? 'ascending' : 'descending'}</caption>
      <thead className="sticky top-0 z-10 bg-surface-subtle shadow-[inset_0_-1px_0_var(--color-border)]">
        <tr className="h-10">
          <th scope="col" className="w-11 pl-3.5 text-left"><Checkbox checked={all} mixed={some} onChange={onToggleAll} label="Select all deals" /></th>
          {COLUMNS.map((c) => {
            const on = sort.key === c.key
            const Icon = !on ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
            return (
              <th key={c.key} scope="col" aria-sort={ariaSort(c.key)} className={cn('p-0', c.width)}>
                <button
                  type="button"
                  onClick={() => onSort(c.key)}
                  className={cn('group flex h-10 w-full items-center gap-1 px-3 text-xs font-medium outline-none transition-colors duration-hover ease-out focus-ring motion-reduce:transition-none', c.align === 'right' && 'justify-end', on ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary')}
                >
                  {c.label}
                  <Icon aria-hidden className={cn('size-4 shrink-0 transition-opacity duration-hover ease-out motion-reduce:transition-none', !on && 'opacity-50 group-hover:opacity-100')} strokeWidth={1.75} />
                </button>
              </th>
            )
          })}
          <th scope="col" className="w-14"><span className="sr-only">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        {rows.map((d) => {
          const owner = ownerById(d.ownerId)
          const on = selected.has(d.id)
          const overdue = isOverdue(d)
          return (
            <tr
              key={d.id}
              data-selected={on || undefined}
              data-open={selectedId === d.id || undefined}
              onClick={() => onOpen(d.id)}
              className={cn(
                'h-14 cursor-pointer border-b border-border transition-colors duration-hover ease-out last:border-b-0 motion-reduce:transition-none',
                on || flashId === d.id ? 'bg-primary-soft' : 'hover:bg-surface-subtle',
                flashId === d.id && 'shadow-[inset_0_0_0_2px_var(--color-primary)]',
                selectedId === d.id && !on && 'bg-surface-subtle',
              )}
            >
              <td className="pl-3.5" onClick={(e) => e.stopPropagation()}><Checkbox checked={on} onChange={(v) => onToggle(d.id, v)} label={`Select ${d.title}`} /></td>
              <th scope="row" className="px-3 text-left font-normal">
                <button
                  type="button"
                  data-deal-id={d.id}
                  onClick={(e) => { e.stopPropagation(); onOpen(d.id) }}
                  className="flex max-w-full flex-col items-start rounded-sm text-left outline-none focus-ring"
                >
                  <span className="max-w-full truncate text-sm font-medium leading-4.25"><Highlight text={d.title} query={query} phrase /></span>
                  <span className="max-w-full truncate text-xs leading-3.75 text-text-secondary"><Highlight text={contactLabel(d)} query={query} phrase /></span>
                </button>
              </th>
              <td className="truncate px-3 text-compact text-text-secondary">{d.company ? <Highlight text={d.company} query={query} phrase /> : '—'}</td>
              <td className="px-3"><StatusPill stage={d.stage} /></td>
              <td className="px-3 text-right text-sm font-medium tabular-nums">{money(d.value)}</td>
              <td className="px-3">
                <span className="flex items-center gap-2 text-compact text-text-secondary">
                  <Avatar initial={owner.initial} tone={owner.tone} size="S" />
                  <span className="truncate">{owner.name}</span>
                </span>
              </td>
              <td className="px-3 text-compact">
                {overdue ? (
                  <span className="flex items-center gap-1 font-medium text-warning-foreground"><TriangleAlert aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />Overdue · {formatShort(d.closeDate)}</span>
                ) : (
                  <span className="text-text-secondary">{formatShort(d.closeDate)}</span>
                )}
              </td>
              <td className="px-3 text-compact text-text-secondary">{relativeTime(lastActivityAt(d))}</td>
              <td className="pr-3 text-right" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                <Menu align="end" label={`${d.title} actions`} items={menuFor(d)} trigger={({ props }) => <MoreButton props={props} label={`Actions for ${d.title}`} className="size-8" />} />
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

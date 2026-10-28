import { ArrowDown, ArrowUp, ArrowUpDown, TriangleAlert } from 'lucide-react'
import { useRef, type KeyboardEvent } from 'react'
import { owners } from '../../data/deals'
import { cn } from '../../lib/cn'
import { formatShort, shortRelative } from '../../lib/dates'
import { needsFollowUp } from '../../lib/contactsLogic'
import { Avatar } from '../ui/Avatar'
import { Checkbox } from '../ui/Checkbox'
import { SkeletonCircle, SkeletonLine } from '../ui/Skeleton'
import { ContactStatusPill } from './ContactStatusPill'
import { toneFor } from './contactMeta'
import type { Contact, ContactColumn, ContactDensity, ContactSort, ContactSortKey } from '../../types'

// Figma "Table": 40px sticky header (surface-subtle), 56px rows (Compact: 40px), hover surface-subtle, selected primary-soft,
// sortable header cells. Column widths are fixed (table-fixed + colgroup) so nothing jumps while rows load.
interface Col { id: 'select' | 'name' | ContactColumn; label: string; sort?: ContactSortKey; width: string }
const COLS: Col[] = [
  { id: 'select', label: 'Select', width: 'w-11' },
  { id: 'name', label: 'Name', sort: 'name', width: 'w-72' },
  { id: 'company', label: 'Company', sort: 'company', width: 'w-48' },
  { id: 'status', label: 'Status', sort: 'status', width: 'w-32' },
  { id: 'source', label: 'Source', sort: 'source', width: 'w-32' },
  { id: 'owner', label: 'Owner', sort: 'owner', width: 'w-40' },
  { id: 'lastContacted', label: 'Last contacted', sort: 'lastContacted', width: 'w-48' },
  { id: 'created', label: 'Created', sort: 'created', width: 'w-28' },
]

export interface ContactsTableProps {
  rows: Contact[]
  loading: boolean
  skeletonRows: number
  hidden: ContactColumn[]
  density: ContactDensity
  sort: ContactSort | null
  onSort: (key: ContactSortKey) => void
  selected: Set<string>
  /** Toggle one row; `range` when Shift is held. */
  onToggle: (id: string, on: boolean, range: boolean) => void
  onToggleAll: (on: boolean) => void
  activeId: string | null
  onActive: (id: string) => void
  openId: string | null
  onOpen: (id: string) => void
}

const stickyName = 'max-lg:sticky max-lg:left-11 max-lg:z-[5] max-lg:shadow-[inset_-1px_0_0_var(--color-border)]'
const stickySelect = 'max-lg:sticky max-lg:left-0 max-lg:z-[5]'

export function ContactsTable({ rows, loading, skeletonRows, hidden, density, sort, onSort, selected, onToggle, onToggleAll, activeId, onActive, openId, onOpen }: ContactsTableProps) {
  const cols = COLS.filter((c) => c.id === 'select' || c.id === 'name' || !hidden.includes(c.id as ContactColumn))
  const compact = density === 'compact'
  const all = rows.length > 0 && rows.every((r) => selected.has(r.id))
  const some = !all && rows.some((r) => selected.has(r.id))
  const tbody = useRef<HTMLTableSectionElement>(null)
  const shift = useRef(false)
  const active = rows.find((r) => r.id === activeId)?.id ?? rows[0]?.id
  const ariaSort = (k?: ContactSortKey) => (k && sort?.key === k ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none')
  const ownerOf = (id: string) => owners.find((o) => o.id === id) ?? owners[0]

  const focusRow = (id: string) => { onActive(id); tbody.current?.querySelector<HTMLElement>(`[data-contact-id="${id}"]`)?.focus() }
  const onRowKey = (e: KeyboardEvent<HTMLTableRowElement>, c: Contact, i: number) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'ArrowDown') { e.preventDefault(); if (rows[i + 1]) focusRow(rows[i + 1].id) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (rows[i - 1]) focusRow(rows[i - 1].id) }
    else if (e.key === 'Home') { e.preventDefault(); focusRow(rows[0].id) }
    else if (e.key === 'End') { e.preventDefault(); focusRow(rows[rows.length - 1].id) }
    else if (e.key === ' ') { e.preventDefault(); onToggle(c.id, !selected.has(c.id), e.shiftKey) }
    else if (e.key === 'Enter') { e.preventDefault(); onOpen(c.id) }
  }

  const rowH = compact ? 'h-10' : 'h-14'
  return (
    <table className="w-full min-w-[1080px] table-fixed border-separate border-spacing-0 text-left" aria-rowcount={loading ? undefined : rows.length + 1}>
      <caption className="sr-only">Contacts{sort ? `, sorted by ${sort.key} ${sort.dir === 'asc' ? 'ascending' : 'descending'}` : ''}</caption>
      <colgroup>{cols.map((c) => <col key={c.id} className={c.width} />)}</colgroup>
      <thead className="sticky top-0 z-10">
        <tr className="h-10">
          {cols.map((c) => {
            const stick = c.id === 'select' ? stickySelect : c.id === 'name' ? stickyName : ''
            const base = cn('bg-surface-subtle p-0 shadow-[inset_0_-1px_0_var(--color-border)]', stick)
            if (c.id === 'select') return <th key={c.id} scope="col" className={cn(base, 'pl-3.5 text-left')}><Checkbox checked={all} mixed={some} onChange={onToggleAll} label="Select all contacts on this page" /></th>
            const on = sort?.key === c.sort
            const Icon = !on ? ArrowUpDown : sort?.dir === 'asc' ? ArrowUp : ArrowDown
            return (
              <th key={c.id} scope="col" aria-sort={ariaSort(c.sort)} className={base}>
                <button type="button" onClick={() => c.sort && onSort(c.sort)} className={cn('group flex h-10 w-full items-center gap-1 px-3 text-xs font-medium outline-none transition-colors duration-hover ease-out focus-ring motion-reduce:transition-none', on ? 'text-text-primary' : 'text-text-secondary hover:text-text-primary')}>
                  {c.label}
                  <Icon aria-hidden className={cn('size-4 shrink-0 transition-opacity duration-hover ease-out motion-reduce:transition-none', !on && 'opacity-50 group-hover:opacity-100')} strokeWidth={1.75} />
                </button>
              </th>
            )
          })}
        </tr>
      </thead>
      <tbody ref={tbody} aria-busy={loading || undefined}>
        {loading
          ? Array.from({ length: skeletonRows }, (_, i) => (
              <tr key={i} className={cn(rowH, 'bg-surface')} aria-hidden>
                {cols.map((c) => (
                  <td key={c.id} className={cn('border-b border-border px-3', c.id === 'select' && 'pl-3.5', c.id === 'select' ? stickySelect : c.id === 'name' ? stickyName : '', 'bg-surface')}>
                    {c.id === 'select' ? <SkeletonLine className="h-4.5 w-4.5" /> : c.id === 'name' ? <span className="flex items-center gap-2.5"><SkeletonCircle className={compact ? 'size-6' : 'size-8'} /><span className="flex flex-col gap-1.5"><SkeletonLine className="w-28" /><SkeletonLine className="h-2.5 w-36" /></span></span> : <SkeletonLine className="w-20" />}
                  </td>
                ))}
              </tr>
            ))
          : rows.map((c, i) => {
              const on = selected.has(c.id)
              const owner = ownerOf(c.ownerId)
              const overdue = needsFollowUp(c)
              return (
                <tr
                  key={c.id}
                  data-contact-id={c.id}
                  data-selected={on || undefined}
                  data-open={openId === c.id || undefined}
                  tabIndex={c.id === active ? 0 : -1}
                  aria-rowindex={i + 2}
                  onFocus={(e) => { if (e.target === e.currentTarget) onActive(c.id) }}
                  onKeyDown={(e) => onRowKey(e, c, i)}
                  onClick={() => onOpen(c.id)}
                  className={cn(
                    rowH,
                    'group/row cursor-pointer outline-none transition-colors duration-hover ease-out focus-ring motion-reduce:transition-none',
                    on ? 'bg-primary-soft' : openId === c.id ? 'bg-surface-muted' : 'bg-surface hover:bg-surface-subtle',
                  )}
                >
                  {cols.map((col) => {
                    const cell = 'border-b border-border bg-inherit px-3'
                    switch (col.id) {
                      case 'select':
                        return <td key="select" className={cn(cell, 'pl-3.5', stickySelect)} onClickCapture={(e) => { shift.current = e.shiftKey }} onClick={(e) => e.stopPropagation()}><Checkbox tabIndex={-1} checked={on} onChange={(v) => onToggle(c.id, v, shift.current)} label={`Select ${c.name}`} /></td>
                      case 'name':
                        return (
                          <td key="name" className={cn(cell, stickyName)}>
                            <span className="flex items-center gap-2.5">
                              <Avatar initial={c.name[0] ?? '?'} tone={toneFor(c.name)} size={compact ? 'M' : 'LG'} />
                              <span className={cn('flex min-w-0', compact ? 'items-baseline gap-2' : 'flex-col gap-px')}>
                                <span className="truncate text-sm font-medium leading-4.25">{c.name}</span>
                                <span className="truncate text-xs leading-3.75 text-text-secondary">{c.email}</span>
                              </span>
                            </span>
                          </td>
                        )
                      case 'company': return <td key="company" className={cn(cell, 'truncate text-compact text-text-secondary')}>{c.company || '—'}</td>
                      case 'status': return <td key="status" className={cell}><ContactStatusPill status={c.status} /></td>
                      case 'source': return <td key="source" className={cn(cell, 'truncate text-compact text-text-secondary')}>{c.source}</td>
                      case 'owner': return <td key="owner" className={cell}><span className="flex items-center gap-2 text-compact text-text-secondary"><Avatar initial={owner.initial} tone={owner.tone} size="S" /><span className="truncate">{owner.name}</span></span></td>
                      case 'lastContacted':
                        return (
                          <td key="last" className={cell}>
                            <span className={cn('flex min-w-0', compact ? 'items-center gap-2' : 'flex-col gap-0.5')}>
                              <span className="truncate text-compact text-text-secondary">{c.lastContactedAt ? shortRelative(c.lastContactedAt) : 'Never'}</span>
                              {overdue && <span className="flex items-center gap-1 text-xs font-medium leading-3.75 text-warning-foreground"><TriangleAlert aria-hidden className="size-3.5 shrink-0" strokeWidth={1.75} /><span className="truncate">Overdue follow-up</span></span>}
                            </span>
                          </td>
                        )
                      case 'created': return <td key="created" className={cn(cell, 'text-compact text-text-secondary')}>{formatShort(c.createdAt)}</td>
                    }
                  })}
                </tr>
              )
            })}
      </tbody>
    </table>
  )
}

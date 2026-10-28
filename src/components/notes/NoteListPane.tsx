import { ArrowUpDown, FilePlus2, Plus, SearchX } from 'lucide-react'
import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react'
import { useFlip } from '../../lib/useFlip'
import { cn } from '../../lib/cn'
import { MOD } from '../../lib/shortcuts'
import { noteTemplates, type TemplateId } from '../../lib/noteText'
import { hasNoteFilters, type NoteGroup } from '../../lib/notesLogic'
import { recordLabel } from '../../data/records'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Checkbox } from '../ui/Checkbox'
import { EmptyState } from '../ui/EmptyState'
import { FilterButton } from '../ui/FilterButton'
import { Menu } from '../ui/Menu'
import { SearchInput } from '../ui/SearchInput'
import { Tag } from '../ui/Tag'
import { Tooltip } from '../ui/Tooltip'
import { NoteListSkeleton } from './NotesSkeleton'
import { NoteListItem } from './NoteListItem'
import type { NoteDateFilter, NoteFilters, NoteSort, RecordType } from '../../types'

// Left pane (about 340px): title, count, split "New note" button, search, filters, sort, then Pinned / Today / This week / Earlier.
const SORTS: { id: NoteSort; label: string }[] = [{ id: 'edited', label: 'Recently edited' }, { id: 'created', label: 'Created' }, { id: 'title', label: 'Title' }]
const DATES: { id: NoteDateFilter; label: string }[] = [{ id: 'any', label: 'Any time' }, { id: 'today', label: 'Today' }, { id: 'week', label: 'Last 7 days' }, { id: 'month', label: 'Last 30 days' }]
const toggle = <T extends string>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

export interface NoteListPaneProps {
  loading: boolean
  total: number
  groups: NoteGroup[]
  shown: number
  filters: NoteFilters
  sort: NoteSort
  allTags: string[]
  selectedId: string | null
  searchRef: RefObject<HTMLInputElement | null>
  listRef: RefObject<HTMLDivElement | null>
  initialScroll: number
  onScroll: (top: number) => void
  onFilters: (patch: Partial<NoteFilters>) => void
  onClear: () => void
  onSort: (s: NoteSort) => void
  onOpen: (id: string, focusEditor?: boolean) => void
  onNew: (template: TemplateId) => void
}

export function NoteListPane({ loading, total, groups, shown, filters, sort, allTags, selectedId, searchRef, listRef, initialScroll, onScroll, onFilters, onClear, onSort, onOpen, onNew }: NoteListPaneProps) {
  const flat = groups.flatMap((g) => g.notes)
  const [activeId, setActiveId] = useState<string | null>(null)
  const active = flat.find((n) => n.id === activeId)?.id ?? (flat.find((n) => n.id === selectedId)?.id ?? flat[0]?.id ?? null)
  const scroller = useRef<HTMLDivElement>(null)
  useFlip(scroller, flat.map((n) => n.id).join(','))
  const restored = useRef(false)
  useEffect(() => {
    if (loading || restored.current || !scroller.current) return
    restored.current = true
    scroller.current.scrollTop = initialScroll
  }, [loading, initialScroll])

  const focusItem = (id: string) => { setActiveId(id); listRef.current?.querySelector<HTMLElement>(`[data-note-id="${id}"]`)?.focus() }
  const onItemKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = flat.findIndex((n) => n.id === active)
    if (e.key === 'ArrowDown') { e.preventDefault(); if (flat[i + 1]) focusItem(flat[i + 1].id) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (flat[i - 1]) focusItem(flat[i - 1].id) }
    else if (e.key === 'Home') { e.preventDefault(); if (flat[0]) focusItem(flat[0].id) }
    else if (e.key === 'End') { e.preventDefault(); if (flat.length) focusItem(flat[flat.length - 1].id) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (active) onOpen(active, true) }
  }

  const filtersOn = hasNoteFilters(filters)
  const typeOptions: RecordType[] = ['deal', 'contact', 'company']
  const dateLabel = DATES.find((d) => d.id === filters.date)?.label
  return (
    <>
      <header className="flex shrink-0 flex-col gap-3 border-b border-border p-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-medium">Notes</h2>
          <Badge><span aria-label={`${total} notes`}>{total}</span></Badge>
          <span className="flex-1" />
          <Tooltip content={`New note (${MOD}+N)`}>
            {(tip) => (
              <span {...tip} className="inline-flex">
                <Menu
                  align="end"
                  label="New note from template"
                  items={noteTemplates.map((t) => ({ id: t.id, label: t.label, icon: FilePlus2, onSelect: () => onNew(t.id) }))}
                  trigger={({ props }) => <Button variant="primary" icon={Plus} chevron menuProps={{ ...props, onClick: undefined }} onClick={() => onNew('blank')} onChevronClick={props.onClick}>New note</Button>}
                />
              </span>
            )}
          </Tooltip>
        </div>
        <Tooltip content={`Search notes (${MOD}+F or /)`}>
          {(tip) => <span {...tip} className="block"><SearchInput inputRef={searchRef} label="Search notes" placeholder="Search notes" value={filters.query} onChange={(query) => onFilters({ query })} /></span>}
        </Tooltip>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Note filters">
          <FilterButton compact label="Linked to" count={filters.linkTypes.length}>
            <fieldset className="m-0 flex flex-col gap-0.5 border-0 p-0">
              <legend className="px-2 pb-1 text-xs font-medium text-text-secondary">Linked record type</legend>
              {typeOptions.map((t) => (
                <label key={t} className="flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm hover:bg-surface-subtle">
                  <Checkbox checked={filters.linkTypes.includes(t)} onChange={() => onFilters({ linkTypes: toggle(filters.linkTypes, t) })} label={recordLabel[t]} />
                  {recordLabel[t]}
                </label>
              ))}
            </fieldset>
          </FilterButton>
          <FilterButton compact label="Tag" count={filters.tags.length}>
            <fieldset className="m-0 flex max-h-64 flex-col gap-0.5 overflow-auto border-0 p-0">
              <legend className="px-2 pb-1 text-xs font-medium text-text-secondary">Tag</legend>
              {allTags.length === 0 && <p className="px-2 py-1 text-sm text-text-secondary">No tags yet.</p>}
              {allTags.map((t) => (
                <label key={t} className="flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm hover:bg-surface-subtle">
                  <Checkbox checked={filters.tags.includes(t)} onChange={() => onFilters({ tags: toggle(filters.tags, t) })} label={t} />
                  {t}
                </label>
              ))}
            </fieldset>
          </FilterButton>
          <FilterButton compact label="Date" count={filters.date === 'any' ? 0 : 1}>
            <div role="radiogroup" aria-label="Last edited" className="flex flex-col gap-0.5">
              <p className="px-2 pb-1 text-xs font-medium text-text-secondary">Last edited</p>
              {DATES.map((d) => (
                <button key={d.id} type="button" role="radio" aria-checked={filters.date === d.id} onClick={() => onFilters({ date: d.id })} className={cn('flex h-9 items-center rounded-md px-2 text-left text-sm outline-none focus-ring hover:bg-surface-subtle', filters.date === d.id && 'bg-primary-soft font-medium text-primary')}>{d.label}</button>
              ))}
            </div>
          </FilterButton>
          <span className="flex-1" />
          <Menu
            align="end"
            label="Sort notes"
            items={SORTS.map((s) => ({ id: s.id, label: s.label, checked: sort === s.id, radio: true, onSelect: () => onSort(s.id) }))}
            trigger={({ props }) => (
              <button {...props} type="button" aria-label={`Sort: ${SORTS.find((s) => s.id === sort)?.label}`} className="flex h-8 items-center gap-1.5 rounded-md px-2 text-compact font-medium text-text-secondary outline-none transition-colors duration-hover ease-out hover:bg-surface-subtle hover:text-text-primary aria-expanded:bg-surface-muted focus-ring motion-reduce:transition-none">
                <ArrowUpDown aria-hidden className="size-4" strokeWidth={1.75} />
                {SORTS.find((s) => s.id === sort)?.label}
              </button>
            )}
          />
        </div>
        {filtersOn && (
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Active filters">
            {filters.query.trim() && <Tag tone="primary" onRemove={() => onFilters({ query: '' })} removeLabel="Remove filter Search">{`“${filters.query.trim()}”`}</Tag>}
            {filters.linkTypes.map((t) => <Tag key={t} tone="primary" onRemove={() => onFilters({ linkTypes: filters.linkTypes.filter((x) => x !== t) })} removeLabel={`Remove filter ${recordLabel[t]}`}>{recordLabel[t]}</Tag>)}
            {filters.tags.map((t) => <Tag key={t} tone="primary" onRemove={() => onFilters({ tags: filters.tags.filter((x) => x !== t) })} removeLabel={`Remove filter tag ${t}`}>{t}</Tag>)}
            {filters.date !== 'any' && <Tag tone="primary" onRemove={() => onFilters({ date: 'any' })} removeLabel="Remove filter date">{dateLabel}</Tag>}
            <button type="button" onClick={onClear} className="h-7 rounded-md px-2 text-compact font-medium text-primary outline-none transition-colors duration-hover ease-out hover:bg-primary-soft focus-ring motion-reduce:transition-none">Clear all</button>
          </div>
        )}
        <p role="status" className="text-xs text-text-secondary" data-note-count>{filtersOn ? `${shown} of ${total} notes` : `${total} ${total === 1 ? 'note' : 'notes'}`}</p>
      </header>

      <div ref={(el) => { scroller.current = el }} onScroll={(e) => onScroll(e.currentTarget.scrollTop)} className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-18" data-note-scroll>
        {loading ? (
          <NoteListSkeleton />
        ) : total === 0 ? (
          <EmptyState icon={FilePlus2} title="No notes yet" description="Capture calls, meetings and ideas. Create your first note." action={<Button variant="primary" icon={Plus} onClick={() => onNew('blank')}>New note</Button>} />
        ) : shown === 0 ? (
          <EmptyState icon={SearchX} title="No notes match" description="Try a different search or clear your filters." action={<Button variant="primary" onClick={onClear}>Clear filters</Button>} />
        ) : (
          <div ref={listRef} role="listbox" aria-label="Notes" aria-orientation="vertical" className="relative flex flex-col gap-3 p-2">
            {groups.map((g) => (
              <div key={g.label} role="group" aria-label={g.label} className="flex flex-col gap-0.5">
                <div aria-hidden className="px-3 pb-1 pt-1 text-xs font-medium text-text-secondary">{g.label}</div>
                {g.notes.map((n) => (
                  <NoteListItem
                    key={n.id}
                    note={n}
                    query={filters.query}
                    selected={n.id === selectedId}
                    active={n.id === active}
                    onOpen={onOpen}
                    onFocusItem={setActiveId}
                    onKeyDown={onItemKey}
                    itemRef={() => {}}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

import { Bookmark, Columns3, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { owners } from '../../data/deals'
import { cn } from '../../lib/cn'
import { DEMO_TODAY, addDays, dateRangeError, formatShort } from '../../lib/dates'
import { hasContactFilters, LEAD_STATUSES } from '../../lib/contactsLogic'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { Checkbox } from '../ui/Checkbox'
import { DateField } from '../ui/DateField'
import { FilterButton } from '../ui/FilterButton'
import { Menu } from '../ui/Menu'
import { Modal } from '../ui/Modal'
import { SearchInput } from '../ui/SearchInput'
import { SegmentedFilter } from '../ui/SegmentedFilter'
import { Tabs } from '../ui/Tabs'
import { Tag } from '../ui/Tag'
import { FieldRow, TextField } from '../ui/TextField'
import { ALL_COLUMNS, activeViewId, builtInViews, COLUMN_LABELS, SOURCES } from './contactMeta'
import type { ContactColumn, ContactDensity, ContactFilters, ContactSort, SavedContactView } from '../../types'
import type { RefObject } from 'react'

// Toolbar: saved-view tabs, search, five filters, columns menu, density toggle, removable chips.
const toggle = <T extends string>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

export interface ContactsToolbarProps {
  filters: ContactFilters
  sort: ContactSort | null
  savedViews: SavedContactView[]
  allTags: string[]
  hidden: ContactColumn[]
  density: ContactDensity
  currentUserId: string
  searchRef: RefObject<HTMLInputElement | null>
  onFilters: (patch: Partial<ContactFilters>) => void
  onApplyView: (filters: ContactFilters, sort: ContactSort | null) => void
  onClear: () => void
  onSaveView: (name: string) => void
  onDeleteView: (id: string) => void
  onToggleColumn: (c: ContactColumn) => void
  onDensity: (d: ContactDensity) => void
}

export function ContactsToolbar({ filters, sort, savedViews, allTags, hidden, density, currentUserId, searchRef, onFilters, onApplyView, onClear, onSaveView, onDeleteView, onToggleColumn, onDensity }: ContactsToolbarProps) {
  const [saving, setSaving] = useState(false)
  const [viewName, setViewName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const built = useMemo(() => builtInViews(currentUserId), [currentUserId])
  const active = activeViewId(filters, sort, built, savedViews)
  const on = hasContactFilters(filters)
  const ownerName = (id: string) => owners.find((o) => o.id === id)?.name ?? id

  const createdError = dateRangeError(filters.createdFrom, filters.createdTo)
  const chips: { key: string; label: string; remove: () => void }[] = []
  if (filters.query.trim()) chips.push({ key: 'q', label: `Search: “${filters.query.trim()}”`, remove: () => onFilters({ query: '' }) })
  filters.statuses.forEach((s) => chips.push({ key: `s-${s}`, label: `Status: ${s}`, remove: () => onFilters({ statuses: filters.statuses.filter((x) => x !== s) }) }))
  filters.sources.forEach((s) => chips.push({ key: `src-${s}`, label: `Source: ${s}`, remove: () => onFilters({ sources: filters.sources.filter((x) => x !== s) }) }))
  filters.ownerIds.forEach((o) => chips.push({ key: `o-${o}`, label: `Owner: ${ownerName(o)}`, remove: () => onFilters({ ownerIds: filters.ownerIds.filter((x) => x !== o) }) }))
  filters.tags.forEach((t) => chips.push({ key: `t-${t}`, label: `Tag: ${t}`, remove: () => onFilters({ tags: filters.tags.filter((x) => x !== t) }) }))
  if (!createdError && (filters.createdFrom || filters.createdTo)) chips.push({ key: 'c', label: `Created: ${filters.createdFrom && filters.createdTo ? `${formatShort(filters.createdFrom)} – ${formatShort(filters.createdTo)}` : filters.createdFrom ? `from ${formatShort(filters.createdFrom)}` : `until ${formatShort(filters.createdTo)}`}`, remove: () => onFilters({ createdFrom: '', createdTo: '' }) })
  if (filters.followUp) chips.push({ key: 'fu', label: 'Needs follow-up', remove: () => onFilters({ followUp: false }) })

  const createdPresets = [{ label: 'Last 7 days', days: 6 }, { label: 'Last 30 days', days: 29 }, { label: 'Last 90 days', days: 89 }]
  const submitView = () => {
    const name = viewName.trim()
    const fail = (msg: string) => { setNameError(msg); requestAnimationFrame(() => document.querySelector<HTMLElement>('[role="dialog"] [aria-invalid="true"]')?.focus()) }
    if (!name) { fail('Enter a name for this view.'); return }
    if (savedViews.some((v) => v.name.toLowerCase() === name.toLowerCase()) || built.some((v) => v.name.toLowerCase() === name.toLowerCase())) { fail('A view with this name already exists.'); return }
    onSaveView(name)
    setSaving(false)
    setViewName('')
  }

  return (
    <div className="flex shrink-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          label="Saved views"
          idBase="contact-views"
          value={active}
          className="min-w-0 flex-1 border-b-0"
          tabs={[
            ...built.map((v) => ({ id: v.id, label: v.name })),
            ...savedViews.map((v) => ({ id: v.id, label: v.name, trailing: (
              <button type="button" aria-label={`Delete saved view ${v.name}`} onClick={() => onDeleteView(v.id)} className="-ml-1 grid size-5 place-items-center rounded-xs text-text-secondary outline-none hover:bg-surface-muted hover:text-text-primary focus-ring">
                <X className="size-3.5" strokeWidth={1.75} />
              </button>
            ) })),
          ]}
          onChange={(id) => {
            const b = built.find((v) => v.id === id)
            const s = savedViews.find((v) => v.id === id)
            if (b) onApplyView(b.filters, null)
            else if (s) onApplyView(s.filters, s.sort)
          }}
        />
        <Button icon={Bookmark} onClick={() => { setViewName(''); setNameError(null); setSaving(true) }}>Save current view</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Contact filters">
        <SearchInput inputRef={searchRef} label="Search contacts" placeholder="Search name, email or company" value={filters.query} onChange={(query) => onFilters({ query })} className="w-80" />
        <FilterButton label="Status" count={filters.statuses.length}>
          <fieldset className="m-0 flex flex-col gap-0.5 border-0 p-0">
            <legend className="px-2 pb-1 text-xs font-medium text-text-secondary">Lead status</legend>
            {LEAD_STATUSES.map((s) => <label key={s} className="flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm hover:bg-surface-subtle"><Checkbox checked={filters.statuses.includes(s)} onChange={() => onFilters({ statuses: toggle(filters.statuses, s) })} label={s} />{s}</label>)}
          </fieldset>
        </FilterButton>
        <FilterButton label="Source" count={filters.sources.length}>
          <fieldset className="m-0 flex flex-col gap-0.5 border-0 p-0">
            <legend className="px-2 pb-1 text-xs font-medium text-text-secondary">Source</legend>
            {SOURCES.map((s) => <label key={s} className="flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm hover:bg-surface-subtle"><Checkbox checked={filters.sources.includes(s)} onChange={() => onFilters({ sources: toggle(filters.sources, s) })} label={s} />{s}</label>)}
          </fieldset>
        </FilterButton>
        <FilterButton label="Owner" count={filters.ownerIds.length}>
          <fieldset className="m-0 flex flex-col gap-0.5 border-0 p-0">
            <legend className="px-2 pb-1 text-xs font-medium text-text-secondary">Owner</legend>
            {owners.map((o) => <label key={o.id} className="flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm hover:bg-surface-subtle"><Checkbox checked={filters.ownerIds.includes(o.id)} onChange={() => onFilters({ ownerIds: toggle(filters.ownerIds, o.id) })} label={o.name} /><Avatar initial={o.initial} tone={o.tone} size="M" />{o.name}</label>)}
          </fieldset>
        </FilterButton>
        <FilterButton label="Tag" count={filters.tags.length}>
          <fieldset className="m-0 flex max-h-64 flex-col gap-0.5 overflow-auto border-0 p-0">
            <legend className="px-2 pb-1 text-xs font-medium text-text-secondary">Tag</legend>
            {allTags.length === 0 && <p className="px-2 py-1 text-sm text-text-secondary">No tags yet.</p>}
            {allTags.map((t) => <label key={t} className="flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm hover:bg-surface-subtle"><Checkbox checked={filters.tags.includes(t)} onChange={() => onFilters({ tags: toggle(filters.tags, t) })} label={t} />{t}</label>)}
          </fieldset>
        </FilterButton>
        <FilterButton label="Created date" count={!createdError && (filters.createdFrom || filters.createdTo) ? 1 : 0} width="w-80">
          <p className="px-0.5 pb-1 text-xs font-medium text-text-secondary">Quick ranges</p>
          <div className="flex flex-wrap gap-2 pb-2">
            {createdPresets.map((p) => <button key={p.label} type="button" onClick={() => onFilters({ createdFrom: addDays(DEMO_TODAY, -p.days), createdTo: '' })} className="rounded-sm border border-border bg-surface px-2.5 py-1.5 text-xs font-medium outline-none transition-colors duration-hover ease-out hover:border-border-strong hover:bg-surface-subtle focus-ring motion-reduce:transition-none">{p.label}</button>)}
          </div>
          <FieldRow>
            <DateField label="From" value={filters.createdFrom} onChange={(v) => onFilters({ createdFrom: v })} invalid={Boolean(createdError)} />
            <DateField label="To" value={filters.createdTo} onChange={(v) => onFilters({ createdTo: v })} invalid={Boolean(createdError)} />
          </FieldRow>
          {createdError && <p role="alert" className="pt-1 text-xs text-danger-strong">{createdError}</p>}
          <div className="flex justify-end pt-2"><Button state={filters.createdFrom || filters.createdTo ? 'default' : 'disabled'} onClick={() => onFilters({ createdFrom: '', createdTo: '' })}>Clear</Button></div>
        </FilterButton>
        <div className="ml-auto flex items-center gap-3">
          <Menu
            align="end"
            label="Columns"
            items={[{ type: 'label', label: 'Show columns' }, ...ALL_COLUMNS.map((c) => ({ id: c, label: COLUMN_LABELS[c], toggle: !hidden.includes(c), keepOpen: true, onSelect: () => onToggleColumn(c) }))]}
            trigger={({ props }) => <Button icon={Columns3} menuProps={props}>Columns</Button>}
          />
          <SegmentedFilter<'Comfortable' | 'Compact'> label="Density" tone="strong" options={['Comfortable', 'Compact']} value={density === 'compact' ? 'Compact' : 'Comfortable'} onChange={(v) => onDensity(v === 'Compact' ? 'compact' : 'comfortable')} />
        </div>
      </div>
      {on && (
        <div className={cn('flex flex-wrap items-center gap-2')} role="group" aria-label="Active filters">
          {chips.map((c) => <Tag key={c.key} tone="primary" onRemove={c.remove} removeLabel={`Remove filter ${c.label}`}>{c.label}</Tag>)}
          <button type="button" onClick={onClear} className="h-8 rounded-md px-2.5 text-sm font-medium text-primary outline-none transition-colors duration-hover ease-out hover:bg-primary-soft focus-ring motion-reduce:transition-none">Clear all</button>
        </div>
      )}
      <Modal open={saving} onClose={() => setSaving(false)} title="Save current view" footer={<><Button onClick={() => setSaving(false)}>Cancel</Button><Button variant="primary" onClick={submitView}>Save view</Button></>}>
        <p className="mb-4">Saves the current search, filters and sort as a tab you can come back to.</p>
        <TextField label="View name" required autoFocus value={viewName} onChange={(v) => { setViewName(v); setNameError(null) }} placeholder="e.g. Hot leads this month" error={nameError} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitView() } }} />
      </Modal>
    </div>
  )
}

import { priorityLabel, stageLabel } from '../../data/deals'
import { useDeals } from '../../context/dealsContext'
import { DEMO_TODAY, addDays, dateRangeError, formatShort } from '../../lib/dates'
import { hasActiveFilters, money } from '../../lib/dealsLogic'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { Checkbox } from '../ui/Checkbox'
import { DateField } from '../ui/DateField'
import { FilterButton } from '../ui/FilterButton'
import { SearchInput } from '../ui/SearchInput'
import { SegmentedFilter } from '../ui/SegmentedFilter'
import { Tag } from '../ui/Tag'
import { FieldRow, TextField } from '../ui/TextField'
import { priorityTone } from './stageStyles'
import type { DealFilters, DealView, Priority } from '../../types'

// Toolbar: search, four filters, result count and the Board / List switch. Active filters appear as removable chips below.
const toggle = <T extends string>(list: T[], v: T): T[] => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
const digits = (s: string): string => s.replace(/\D/g, '').slice(0, 9)

export interface DealsToolbarProps {
  shown: number
  total: number
  view: DealView
  onView: (v: DealView) => void
}

export function DealsToolbar({ shown, total, view, onView }: DealsToolbarProps) {
  const { state, owners, ownerById, setFilters, clearFilters } = useDeals()
  const f = state.filters
  const set = (patch: Partial<DealFilters>) => setFilters(patch)
  const valueCount = (f.minValue ? 1 : 0) + (f.maxValue ? 1 : 0) > 0 ? 1 : 0
  const closeError = dateRangeError(f.closeFrom, f.closeTo)
  const closeCount = (!closeError && (f.closeFrom || f.closeTo)) || f.overdue ? 1 : 0
  const rangeError = f.minValue && f.maxValue && Number(f.minValue) > Number(f.maxValue) ? 'Minimum can’t be higher than the maximum.' : null

  const chips: { key: string; label: string; remove: () => void }[] = []
  if (f.query.trim()) chips.push({ key: 'q', label: `Search: “${f.query.trim()}”`, remove: () => set({ query: '' }) })
  for (const id of f.owners) chips.push({ key: `o-${id}`, label: `Owner: ${ownerById(id).name}`, remove: () => set({ owners: f.owners.filter((x) => x !== id) }) })
  if (f.minValue || f.maxValue) chips.push({ key: 'v', label: `Value: ${f.minValue && f.maxValue ? `${money(Number(f.minValue))} – ${money(Number(f.maxValue))}` : f.minValue ? `from ${money(Number(f.minValue))}` : `up to ${money(Number(f.maxValue))}`}`, remove: () => set({ minValue: '', maxValue: '' }) })
  if (f.overdue) chips.push({ key: 'od', label: 'Close date: overdue', remove: () => set({ overdue: false }) })
  if (f.stages.length) chips.push({ key: 'st', label: `Stage: ${f.stages.map(stageLabel).join(', ')}`, remove: () => set({ stages: [], stageFrom: '', stageTo: '' }) })
  if (!dateRangeError(f.stageFrom, f.stageTo) && (f.stageFrom || f.stageTo)) chips.push({ key: 'sd', label: `Moved to stage: ${f.stageFrom && f.stageTo ? `${formatShort(f.stageFrom)} – ${formatShort(f.stageTo)}` : f.stageFrom ? `from ${formatShort(f.stageFrom)}` : `until ${formatShort(f.stageTo)}`}`, remove: () => set({ stageFrom: '', stageTo: '' }) })
  if (!closeError && (f.closeFrom || f.closeTo)) chips.push({ key: 'cd', label: `Close date: ${f.closeFrom && f.closeTo ? `${formatShort(f.closeFrom)} – ${formatShort(f.closeTo)}` : f.closeFrom ? `from ${formatShort(f.closeFrom)}` : `until ${formatShort(f.closeTo)}`}`, remove: () => set({ closeFrom: '', closeTo: '' }) })
  for (const p of f.priorities) chips.push({ key: `p-${p}`, label: `Priority: ${priorityLabel[p]}`, remove: () => set({ priorities: f.priorities.filter((x) => x !== p) }) })

  const presets: { label: string; apply: () => void }[] = [
    { label: 'Overdue', apply: () => set({ overdue: true, closeFrom: '', closeTo: '' }) },
    { label: 'Next 7 days', apply: () => set({ overdue: false, closeFrom: DEMO_TODAY, closeTo: addDays(DEMO_TODAY, 7) }) },
    { label: 'Next 30 days', apply: () => set({ overdue: false, closeFrom: DEMO_TODAY, closeTo: addDays(DEMO_TODAY, 30) }) },
    { label: 'Next 90 days', apply: () => set({ overdue: false, closeFrom: DEMO_TODAY, closeTo: addDays(DEMO_TODAY, 90) }) },
  ]

  return (
    <div className="flex shrink-0 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Deal filters">
        <SearchInput label="Search deals" placeholder="Search deals, companies, contacts" value={f.query} onChange={(query) => set({ query })} className="w-72" />
        <FilterButton label="Owner" count={f.owners.length}>
          <fieldset className="m-0 flex flex-col gap-0.5 border-0 p-0">
            <legend className="px-2 pb-1 text-xs font-medium text-text-secondary">Owner</legend>
            {owners.map((o) => (
              <label key={o.id} className="flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm transition-colors duration-hover ease-out hover:bg-surface-subtle motion-reduce:transition-none">
                <Checkbox checked={f.owners.includes(o.id)} onChange={() => set({ owners: toggle(f.owners, o.id) })} label={o.name} />
                <Avatar initial={o.initial} tone={o.tone} size="M" />
                {o.name}
              </label>
            ))}
          </fieldset>
        </FilterButton>
        <FilterButton label="Value range" count={valueCount} width="w-72">
          <p className="px-0.5 pb-1 text-xs font-medium text-text-secondary">Deal value</p>
          <FieldRow>
            <TextField label="Min" prefix="$" inputMode="numeric" placeholder="0" value={f.minValue} onChange={(v) => set({ minValue: digits(v) })} invalid={Boolean(rangeError)} />
            <TextField label="Max" prefix="$" inputMode="numeric" placeholder="Any" value={f.maxValue} onChange={(v) => set({ maxValue: digits(v) })} invalid={Boolean(rangeError)} />
          </FieldRow>
          {rangeError && <p role="alert" className="pt-1 text-xs text-danger-strong">{rangeError}</p>}
          <div className="flex justify-end pt-2"><Button onClick={() => set({ minValue: '', maxValue: '' })} state={valueCount ? 'default' : 'disabled'}>Clear</Button></div>
        </FilterButton>
        <FilterButton label="Close date" count={closeCount} width="w-80">
          <p className="px-0.5 pb-1 text-xs font-medium text-text-secondary">Quick ranges</p>
          <div className="flex flex-wrap gap-2 pb-2">
            {presets.map((p) => (
              <button key={p.label} type="button" onClick={p.apply} className="rounded-sm border border-border bg-surface px-2.5 py-1.5 text-xs font-medium outline-none transition-colors duration-hover ease-out hover:border-border-strong hover:bg-surface-subtle focus-ring motion-reduce:transition-none">{p.label}</button>
            ))}
          </div>
          <FieldRow>
            <DateField label="From" value={f.closeFrom} onChange={(v) => set({ closeFrom: v, overdue: false })} invalid={Boolean(closeError)} />
            <DateField label="To" value={f.closeTo} onChange={(v) => set({ closeTo: v, overdue: false })} invalid={Boolean(closeError)} />
          </FieldRow>
          {closeError && <p role="alert" className="pt-1 text-xs text-danger-strong">{closeError}</p>}
          <label className="mt-2 flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-0.5 text-sm">
            <Checkbox checked={f.overdue} onChange={(v) => set({ overdue: v })} label="Overdue only" />
            Overdue only
          </label>
          <div className="flex justify-end pt-1"><Button onClick={() => set({ closeFrom: '', closeTo: '', overdue: false })} state={closeCount ? 'default' : 'disabled'}>Clear</Button></div>
        </FilterButton>
        <FilterButton label="Priority" count={f.priorities.length}>
          <fieldset className="m-0 flex flex-col gap-0.5 border-0 p-0">
            <legend className="px-2 pb-1 text-xs font-medium text-text-secondary">Priority</legend>
            {(['high', 'medium', 'low'] as Priority[]).map((p) => (
              <label key={p} className="flex h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 text-sm transition-colors duration-hover ease-out hover:bg-surface-subtle motion-reduce:transition-none">
                <Checkbox checked={f.priorities.includes(p)} onChange={() => set({ priorities: toggle(f.priorities, p) })} label={priorityLabel[p]} />
                <Tag tone={priorityTone[p]}>{priorityLabel[p]}</Tag>
              </label>
            ))}
          </fieldset>
        </FilterButton>
        <div className="ml-auto flex items-center gap-4">
          <p role="status" className="text-sm text-text-secondary" data-result-count>
            <span className="font-medium text-text-primary">{shown}</span> of {total} deals
          </p>
          <SegmentedFilter<'Board' | 'List'> label="View" tone="strong" options={['Board', 'List']} value={view === 'board' ? 'Board' : 'List'} onChange={(v) => onView(v === 'Board' ? 'board' : 'list')} />
        </div>
      </div>
      {hasActiveFilters(f) && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Active filters">
          {chips.map((c) => <Tag key={c.key} tone="primary" onRemove={c.remove} removeLabel={`Remove filter ${c.label}`}>{c.label}</Tag>)}
          <button type="button" onClick={clearFilters} className="h-8 rounded-md px-2.5 text-sm font-medium text-primary outline-none transition-colors duration-hover ease-out hover:bg-primary-soft focus-ring motion-reduce:transition-none">Clear all</button>
        </div>
      )}
    </div>
  )
}

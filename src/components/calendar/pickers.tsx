import { Check, Link2, Plus, UserPlus, X } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useRecords } from '../../context/recordsContext'
import { owners } from '../../data/deals'
import { attendeeInfo } from '../../lib/attendees'
import { cn } from '../../lib/cn'
import { Avatar } from '../ui/Avatar'
import { Popover } from '../ui/Menu'
import { RecordChip } from '../notes/RecordChip'
import { Link } from 'react-router'
import { recordPath } from '../../lib/recordPath'
import type { AttendeeRef, EventLink } from '../../types'


// Search-and-pick popover used for attendees (owners and contacts) and linked records (deals, contacts, notes).
interface Option { key: string; group: string; label: string; hint?: string; leading?: React.ReactNode; selected: boolean }

function SearchPicker({ triggerLabel, triggerIcon: Icon, options, onPick, placeholder, label }: { triggerLabel: string; triggerIcon: typeof Plus; options: Option[]; onPick: (key: string) => void; placeholder: string; label: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null)
  const anchorRef = useMemo(() => ({ current: trigger }), [trigger])
  const input = useRef<HTMLInputElement>(null)
  const id = useId()
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    const out: Option[] = []
    for (const g of [...new Set(options.map((o) => o.group))]) out.push(...options.filter((o) => o.group === g && (!q || `${o.label} ${o.hint ?? ''}`.toLowerCase().includes(q))).slice(0, q ? 8 : 5))
    return out
  }, [options, query])
  const idx = Math.min(active, Math.max(0, shown.length - 1))
  const close = useCallback((restore: boolean) => { setOpen(false); if (restore) trigger?.focus({ preventScroll: true }) }, [trigger])
  useEffect(() => {
    if (!open) return undefined
    const t = requestAnimationFrame(() => input.current?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(t)
  }, [open])
  return (
    <>
      <button ref={setTrigger} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => { setQuery(''); setActive(0); setOpen((o) => !o) }} className="flex h-8 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-compact font-medium text-text-secondary outline-none transition-colors duration-hover ease-out hover:border-border-strong hover:bg-surface-subtle hover:text-text-primary focus-ring motion-reduce:transition-none">
        <Icon aria-hidden className="size-4" strokeWidth={1.75} />{triggerLabel}
      </button>
      <Popover open={open} onClose={close} anchorRef={anchorRef} role="dialog" label={label}>
        <div className="flex w-80 flex-col gap-2 rounded-lg border border-border bg-surface p-2 shadow-hover">
          <input
            ref={input}
            role="combobox"
            aria-label={placeholder}
            aria-expanded
            aria-controls={`${id}-list`}
            aria-activedescendant={shown.length ? `${id}-${idx}` : undefined}
            autoComplete="off"
            placeholder={placeholder}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0) }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((idx + 1) % Math.max(1, shown.length)) }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((idx - 1 + shown.length) % Math.max(1, shown.length)) }
              else if (e.key === 'Enter') { e.preventDefault(); if (shown[idx]) onPick(shown[idx].key) }
            }}
            className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none placeholder:text-text-secondary focus:border-primary focus:ring-[3px] focus:ring-focus-ring"
          />
          <div id={`${id}-list`} role="listbox" aria-label={label} aria-multiselectable className="flex max-h-72 flex-col gap-0.5 overflow-auto">
            {shown.length === 0 && <p className="px-3 py-4 text-center text-sm text-text-secondary">Nothing matches “{query}”.</p>}
            {[...new Set(shown.map((o) => o.group))].map((g) => (
              <div key={g} role="group" aria-label={g} className="flex flex-col gap-0.5">
                <div aria-hidden className="px-3 pb-0.5 pt-1.5 text-xs font-medium text-text-secondary">{g}</div>
                {shown.map((o, i) => o.group !== g ? null : (
                  <div key={o.key} id={`${id}-${i}`} role="option" aria-selected={o.selected} onMouseDown={(e) => e.preventDefault()} onClick={() => onPick(o.key)} onMouseEnter={() => setActive(i)} className={cn('flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-1.5 text-sm', i === idx ? 'bg-primary-soft' : 'hover:bg-surface-subtle')}>
                    {o.leading}
                    <span className="flex min-w-0 flex-1 flex-col"><span className="truncate">{o.label}</span>{o.hint && <span className="truncate text-xs text-text-secondary">{o.hint}</span>}</span>
                    {o.selected && <Check aria-hidden className="size-4 shrink-0 text-primary" strokeWidth={2} />}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Popover>
    </>
  )
}

export function AttendeePicker({ value, onChange }: { value: AttendeeRef[]; onChange: (v: AttendeeRef[]) => void }) {
  const { records, resolve } = useRecords()
  const name = (id: string): string | null => { const r = resolve({ type: 'contact', id }); return r && !r.deleted ? r.name : null }
  const has = (kind: AttendeeRef['kind'], id: string): boolean => value.some((a) => a.kind === kind && a.id === id)
  const options: Option[] = [
    ...owners.map((o) => ({ key: `owner:${o.id}`, group: 'Team', label: o.name, hint: 'Owner', leading: <Avatar initial={o.initial} tone={o.tone} size="S" />, selected: has('owner', o.id) })),
    ...records.filter((r) => r.type === 'contact').map((r) => ({ key: `contact:${r.id}`, group: 'Contacts', label: r.name, hint: r.hint, selected: has('contact', r.id) })),
  ]
  const toggle = (key: string) => {
    const [kind, id] = [key.slice(0, key.indexOf(':')) as AttendeeRef['kind'], key.slice(key.indexOf(':') + 1)]
    onChange(has(kind, id) ? value.filter((a) => !(a.kind === kind && a.id === id)) : [...value, { kind, id }])
  }
  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Attendees">
          {value.map((a) => { const i = attendeeInfo(a, name); return (
            <li key={`${a.kind}:${a.id}`} className="flex items-center gap-1.5 rounded-full border border-border bg-surface py-0.5 pl-0.5 pr-1.5 text-compact">
              <Avatar initial={i.initials} tone={i.tone} size="S" /><span className={cn(i.deleted && 'text-text-secondary')}>{i.name}</span>
              <button type="button" aria-label={`Remove ${i.name}`} onClick={() => onChange(value.filter((x) => x !== a))} className="grid size-4 place-items-center rounded-xs text-text-secondary outline-none hover:text-text-primary focus-ring"><X className="size-3.5" strokeWidth={1.75} /></button>
            </li>
          ) })}
        </ul>
      )}
      <div><SearchPicker triggerLabel="Add attendee" triggerIcon={UserPlus} options={options} onPick={toggle} placeholder="Search team and contacts" label="Attendees" /></div>
    </div>
  )
}

const TYPE_NOUN: Record<EventLink['type'], string> = { deal: 'deal', contact: 'contact', company: 'company', note: 'note', project: 'project' }
const TYPE_GROUP: Record<EventLink['type'], string> = { deal: 'Deals', contact: 'Contacts', company: 'Companies', note: 'Notes', project: 'Projects' }
const joinNouns = (list: string[]): string => (list.length <= 1 ? list.join('') : `${list.slice(0, -1).join(', ')} or ${list[list.length - 1]}`)

/** Search-and-pick for linked records. `types` decides what can be linked (events: deals, contacts, notes, projects; projects: deals, contacts, companies). */
export function LinkPicker({ value, onChange, types = ['deal', 'contact', 'note', 'project'], navigable = false }: { value: EventLink[]; onChange: (v: EventLink[]) => void; types?: EventLink['type'][]; /** Chips open the record (Projects). */ navigable?: boolean }) {
  const { records } = useRecords()
  const has = (type: EventLink['type'], id: string): boolean => value.some((l) => l.type === type && l.id === id)
  const options: Option[] = records.filter((r) => types.includes(r.type)).map((r) => ({ key: `${r.type}:${r.id}`, group: TYPE_GROUP[r.type], label: r.name, hint: r.hint, selected: has(r.type, r.id) }))
  const nouns = joinNouns(types.map((t) => TYPE_NOUN[t]))
  const plurals = joinNouns(types.map((t) => TYPE_GROUP[t].toLowerCase()))
  const toggle = (key: string) => {
    const type = key.slice(0, key.indexOf(':')) as EventLink['type']
    const id = key.slice(key.indexOf(':') + 1)
    onChange(has(type, id) ? value.filter((l) => !(l.type === type && l.id === id)) : [...value, { type, id }])
  }
  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Linked records">
          {value.map((l) => (
            <li key={`${l.type}:${l.id}`} className="flex items-center gap-0.5">
              {navigable && recordPath(l) ? <Link to={recordPath(l) as string} aria-label={`Open ${TYPE_NOUN[l.type]}`} className="max-w-full rounded-sm outline-none focus-ring"><RecordChip link={l} /></Link> : <RecordChip link={l} />}
              <button type="button" aria-label="Remove linked record" onClick={() => onChange(value.filter((x) => x !== l))} className="grid size-5 place-items-center rounded-xs text-text-secondary outline-none hover:text-text-primary focus-ring"><X className="size-3.5" strokeWidth={1.75} /></button>
            </li>
          ))}
        </ul>
      )}
      <div><SearchPicker triggerLabel={`Link a ${nouns}`} triggerIcon={Link2} options={options} onPick={toggle} placeholder={`Search ${plurals}`} label="Linked records" /></div>
    </div>
  )
}

import { Link2, X } from 'lucide-react'
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useRecords } from '../../context/recordsContext'
import { recordLabel } from '../../data/records'
import { cn } from '../../lib/cn'
import { Popover } from '../ui/Menu'
import { RecordChip } from './RecordChip'
import type { NoteLink, RecordRef, RecordType } from '../../types'

// "Link to record": searches deals (live Deals data), contacts and companies. Combobox + listbox, arrow keys and Enter.
const ORDER: RecordType[] = ['deal', 'contact', 'company']
const GROUP: Record<RecordType, string> = { deal: 'Deals', contact: 'Contacts', company: 'Companies', note: 'Notes', project: 'Projects' }

export interface RecordPickerProps {
  link: NoteLink | null
  onChange: (link: NoteLink | null) => void
}

export function RecordPicker({ link, onChange }: RecordPickerProps) {
  const { records, resolve, restore } = useRecords()
  const resolved = resolve(link)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null)
  const anchorRef = useMemo(() => ({ current: trigger }), [trigger])
  const inputRef = useRef<HTMLInputElement>(null)
  const id = useId()

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const out: RecordRef[] = []
    // (records come from the records service, so names are always current)
    for (const t of ORDER) out.push(...records.filter((r) => r.type === t && (!q || `${r.name} ${r.hint}`.toLowerCase().includes(q))).slice(0, q ? 6 : 4))
    return out
  }, [records, query])
  const clamped = Math.min(active, Math.max(0, results.length - 1))

  const close = useCallback((restore: boolean) => { setOpen(false); if (restore) trigger?.focus({ preventScroll: true }) }, [trigger])
  useEffect(() => {
    if (!open) return undefined
    const t = requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(t)
  }, [open])
  const choose = (r: RecordRef) => { onChange({ type: r.type, id: r.id }); setOpen(false); trigger?.focus({ preventScroll: true }) }

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          ref={setTrigger}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={link ? (resolved?.deleted ? `Linked ${recordLabel[link.type].toLowerCase()} was deleted. Change linked record` : `Linked to ${recordLabel[link.type]} ${resolved?.name ?? ''}. Change linked record`) : 'Link to record'}
          onClick={() => { setQuery(''); setActive(0); setOpen((o) => !o) }}
          className={cn('flex h-8 max-w-72 items-center gap-1.5 rounded-md border px-2 text-compact font-medium outline-none transition-colors duration-hover ease-out focus-ring motion-reduce:transition-none', link ? 'border-transparent p-0.5' : 'border-border text-text-secondary hover:border-border-strong hover:bg-surface-subtle hover:text-text-primary')}
        >
          {link ? <RecordChip link={link} className="py-1" showRestore={false} /> : <><Link2 aria-hidden className="size-4" strokeWidth={1.75} />Link to record</>}
        </button>
        {link && resolved?.deleted && resolved.canRestore && (
          <button type="button" onClick={() => { void restore(link) }} className="rounded-xs text-compact font-medium text-primary underline underline-offset-2 outline-none focus-ring">Restore {recordLabel[link.type].toLowerCase()}</button>
        )}
        {link && (
          <button type="button" aria-label="Remove linked record" onClick={() => onChange(null)} className="grid size-6 place-items-center rounded-sm text-text-secondary outline-none transition-colors duration-hover ease-out hover:bg-surface-muted hover:text-text-primary focus-ring motion-reduce:transition-none">
            <X className="size-4" strokeWidth={1.75} />
          </button>
        )}
      </div>
      <Popover open={open} onClose={close} anchorRef={anchorRef} role="dialog" label="Link to record">
        <div className="flex w-80 flex-col gap-2 rounded-lg border border-border bg-surface p-2 shadow-hover">
          <input
            ref={inputRef}
            role="combobox"
            aria-label="Search deals, contacts and companies"
            aria-expanded
            aria-controls={`${id}-list`}
            aria-activedescendant={results.length ? `${id}-${clamped}` : undefined}
            autoComplete="off"
            placeholder="Search deals, contacts, companies"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0) }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((clamped + 1) % Math.max(1, results.length)) }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((clamped - 1 + results.length) % Math.max(1, results.length)) }
              else if (e.key === 'Enter') { e.preventDefault(); if (results[clamped]) choose(results[clamped]) }
            }}
            className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none placeholder:text-text-secondary focus:border-primary focus:ring-[3px] focus:ring-focus-ring"
          />
          <div id={`${id}-list`} role="listbox" aria-label="Records" className="flex max-h-72 flex-col gap-0.5 overflow-auto">
            {results.length === 0 && <p className="px-3 py-4 text-center text-sm text-text-secondary">No deals, contacts or companies match “{query}”.</p>}
            {ORDER.map((t) => {
              const rows = results.map((r, i) => ({ r, i })).filter((x) => x.r.type === t)
              if (!rows.length) return null
              return (
                <div key={t} role="group" aria-label={GROUP[t]} className="flex flex-col gap-0.5">
                  <div aria-hidden className="px-3 pb-0.5 pt-1.5 text-xs font-medium text-text-secondary">{GROUP[t]}</div>
                  {rows.map(({ r, i }) => (
                    <div
                      key={`${r.type}-${r.id}`}
                      id={`${id}-${i}`}
                      role="option"
                      aria-selected={link?.id === r.id && link.type === r.type}
                      onClick={() => choose(r)}
                      onMouseEnter={() => setActive(i)}
                      className={cn('flex cursor-pointer flex-col rounded-md px-3 py-1.5 text-sm', i === clamped ? 'bg-primary-soft' : 'hover:bg-surface-subtle', link?.id === r.id && 'font-medium text-primary')}
                    >
                      <span className="truncate">{r.name}</span>
                      <span className="truncate text-xs text-text-secondary">{r.hint}</span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </Popover>
    </>
  )
}

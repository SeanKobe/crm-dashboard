import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ArrowRight, Clock, Handshake, Mail, Search, SearchX, User } from 'lucide-react'
import { useNavigate } from 'react-router'
import { searchResults } from '../../data/mock'
import { useDeals } from '../../context/dealsContext'
import { useToast } from '../../context/toastContext'
import { cn } from '../../lib/cn'
import { useRecentSearches } from '../../lib/useRecentSearches'
import type { IconComponent, SearchIcon, SearchResult, Stage } from '../../types'
import { Popover } from '../ui/Menu'
import { StatusPill } from '../ui/StatusPill'
import { SkeletonCircle, SkeletonLine } from '../ui/Skeleton'
import { Spinner } from '../ui/Spinner'

const ICONS: Record<SearchIcon, IconComponent> = { user: User, mail: Mail, handshake: Handshake }
const FILTER_DELAY = 220 // the brief loading state while the list is filtered
const MAX_DEAL_RESULTS = 6
/** A result row: Deals come from the live deals (with their stage and company); Leads and Contacts are the sample rows. */
type Row = SearchResult & { stage?: Stage; company?: string }

// The characters that match the query are set in Medium weight (Figma "Search Result Row": Before / Match / After).
function Highlighted({ text, query }: { text: string; query: string }): ReactNode {
  const q = query.trim().toLowerCase()
  const at = q ? text.toLowerCase().indexOf(q) : -1
  if (at < 0) return text
  return (
    <>
      {text.slice(0, at)}
      <span className="font-medium">{text.slice(at, at + q.length)}</span>
      {text.slice(at + q.length)}
    </>
  )
}

// Header search (Figma "SearchField" + "Search Dropdown"): grows to the left when focused (its slot keeps the same width, so nothing shifts).
// Empty and focused: Recent searches. Typing: a brief Loading state, then grouped results (or the Empty state) with a "View all results" footer.
// Arrow keys move the active row, Enter selects it, Escape closes. Ctrl or Cmd + K focuses the field.
export function SearchField() {
  const [query, setQuery] = useState('')
  const [applied, setApplied] = useState('') // the query the list is currently filtered by
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const fieldRef = useRef<HTMLLabelElement>(null)
  const timer = useRef(0)
  const listId = useId()
  const toast = useToast()
  const navigate = useNavigate()
  const { state: dealState } = useDeals()
  const { recents, add, clear } = useRecentSearches()

  const results = useMemo<Row[]>(() => {
    const q = applied.trim().toLowerCase()
    const others: Row[] = searchResults.filter((r) => r.group !== 'Deals' && (!q || `${r.title} ${r.hint} ${r.group}`.toLowerCase().includes(q)))
    const deals: Row[] = dealState.deals
      .filter((d) => !q || `${d.title} ${d.company} ${d.contact} Deals`.toLowerCase().includes(q))
      .slice(0, MAX_DEAL_RESULTS)
      .map((d) => ({ id: d.id, group: 'Deals', icon: 'handshake', title: d.title, hint: d.company || 'No company', stage: d.stage, company: d.company }))
    return [...others, ...deals]
  }, [applied, dealState.deals])
  const groups = [...new Set(results.map((r) => r.group))]
  const mode = loading ? 'loading' : !applied.trim() && recents.length > 0 ? 'recent' : results.length === 0 ? 'empty' : 'results'
  // keyboard rows: the recent searches, or the results followed by the "View all results" footer
  const rowCount = mode === 'recent' ? recents.length : mode === 'results' ? results.length + 1 : 0

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); inputRef.current?.focus(); setOpen(true) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])

  const change = (value: string) => {
    setQuery(value)
    setActive(0)
    setOpen(true)
    clearTimeout(timer.current)
    if (!value.trim()) { setApplied(''); setLoading(false); return }
    setLoading(true)
    timer.current = window.setTimeout(() => { setApplied(value); setLoading(false) }, FILTER_DELAY)
  }
  const finish = () => { clearTimeout(timer.current); setOpen(false); setQuery(''); setApplied(''); setLoading(false); inputRef.current?.blur() }
  const choose = (r: Row) => {
    add(r.title)
    // A deal opens on the Deals page with its card in view (the page expands its column if needed); the rest still just confirm.
    if (r.group === 'Deals' && r.stage) navigate(`/deals?focus=${encodeURIComponent(r.id)}`)
    else toast({ type: 'info', title: `Opened ${r.title}`, message: r.hint })
    finish()
  }
  const viewAll = () => { add(query); toast({ type: 'info', title: 'View all results', message: query.trim() ? `Showing everything for “${query.trim()}”.` : 'Showing everything.' }); finish() }
  const pickRecent = (term: string) => { change(term); clearTimeout(timer.current); setApplied(term); setLoading(false) }
  const select = (i: number) => {
    if (mode === 'recent') pickRecent(recents[i])
    else if (mode === 'results') { if (i < results.length) choose(results[i]); else viewAll() }
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(a + 1, Math.max(rowCount - 1, 0))) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter' && open && rowCount > 0) { e.preventDefault(); select(active) }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); if (!query) inputRef.current?.blur() }
  }
  const optionId = (i: number) => `${listId}-${i}`

  return (
    <div className="relative h-10 w-50">
      <label
        ref={fieldRef}
        className={cn(
          'absolute right-0 top-0 flex h-10 items-center gap-2.5 rounded-md bg-surface px-3.5 shadow-button outline outline-1 -outline-offset-1 outline-transparent transition-[width,outline-color,box-shadow] duration-move ease-out motion-reduce:transition-none',
          'hover:outline-border-strong focus-within:outline-[1.5px] focus-within:-outline-offset-[1.5px] focus-within:outline-primary focus-within:ring-[3px] focus-within:ring-focus-ring',
          focused ? 'w-80' : 'w-50',
        )}
      >
        <Search className="size-5 shrink-0 text-text-secondary" strokeWidth={1.75} />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && rowCount > 0 ? optionId(active) : undefined}
          aria-label="Search"
          autoComplete="off"
          placeholder="Search AI Mode"
          value={query}
          onChange={(e) => change(e.target.value)}
          onFocus={() => { setFocused(true); setOpen(true) }}
          onBlur={() => { setFocused(false); setOpen(false) }}
          onKeyDown={onKeyDown}
          className="w-full bg-transparent text-sm outline-none placeholder:text-text-secondary [&::-webkit-search-cancel-button]:hidden"
        />
      </label>
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={fieldRef} align="end">
        <div id={listId} role="listbox" aria-busy={mode === 'loading'} className="flex w-80 flex-col gap-0.5 rounded-lg border border-border bg-surface p-1.5 shadow-hover">
          {mode === 'loading' && (
            <div className="flex flex-col gap-2.5 px-2.5 py-2">
              <div className="flex items-center gap-2 text-compact leading-4 text-text-secondary"><Spinner size="S" />Searching…</div>
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex h-10 items-center gap-3"><SkeletonCircle /><SkeletonLine className="w-40" /></div>
              ))}
            </div>
          )}
          {mode === 'empty' && (
            <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
              <span className="grid size-10 place-items-center rounded-full bg-primary-soft text-primary"><SearchX className="size-5" strokeWidth={1.75} /></span>
              <p className="text-sm font-medium leading-4.25">No results for “{applied.trim()}”</p>
              <p className="text-compact leading-4 text-text-secondary">Check the spelling or try a broader term.</p>
            </div>
          )}
          {mode === 'recent' && (
            <>
              <div className="flex items-center justify-between px-3 pb-1 pt-2">
                <span className="text-xs font-medium text-text-muted">Recent searches</span>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={clear} className="-mr-1.5 rounded-sm px-1.5 py-0.5 text-xs font-medium text-primary outline-none transition-colors duration-hover ease-out hover:bg-primary-soft focus-ring">Clear</button>
              </div>
              {recents.map((term, i) => (
                <div
                  key={term}
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickRecent(term)}
                  className={cn('flex h-9 cursor-pointer items-center gap-2 rounded-md px-3 text-sm transition-colors duration-hover ease-out motion-reduce:transition-none', i === active ? 'bg-surface-subtle' : 'hover:bg-surface-subtle')}
                >
                  <Clock className="size-5 shrink-0 text-text-secondary" strokeWidth={1.75} />
                  <span className="truncate">{term}</span>
                </div>
              ))}
            </>
          )}
          {mode === 'results' && (
            <>
              {groups.map((g) => (
                <div key={g} className="flex flex-col gap-0.5">
                  <div className="px-3 pb-1 pt-2 text-xs font-medium text-text-muted">{g}</div>
                  {results.filter((r) => r.group === g).map((r) => {
                    const i = results.indexOf(r)
                    const Icon = ICONS[r.icon]
                    return (
                      <div
                        key={r.id}
                        id={optionId(i)}
                        role="option"
                        aria-selected={i === active}
                        onMouseEnter={() => setActive(i)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => choose(r)}
                        className={cn('flex h-12 cursor-pointer items-center gap-3 rounded-md px-3 transition-colors duration-hover ease-out motion-reduce:transition-none', i === active ? 'bg-primary-soft' : 'hover:bg-surface-subtle')}
                      >
                        <span className={cn('grid size-7 shrink-0 place-items-center rounded-sm transition-colors duration-hover ease-out', i === active ? 'bg-surface text-primary' : 'bg-surface-muted text-text-secondary')}><Icon className="size-4" strokeWidth={1.75} /></span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className={cn('truncate text-sm', i === active && 'text-primary')}><Highlighted text={r.title} query={applied} /></span>
                            {r.stage && <StatusPill stage={r.stage} className="shrink-0" />}
                          </span>
                          <span className="truncate text-xs text-text-muted">{r.group === 'Deals' ? <Highlighted text={r.hint} query={applied} /> : r.hint}</span>
                        </span>
                      </div>
                    )
                  })}
                </div>
              ))}
              <div aria-hidden className="my-0.5 h-px bg-border" />
              <div
                id={optionId(results.length)}
                role="option"
                aria-selected={active === results.length}
                onMouseEnter={() => setActive(results.length)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={viewAll}
                className={cn('flex h-9 cursor-pointer items-center gap-2 rounded-md px-3 text-sm transition-colors duration-hover ease-out motion-reduce:transition-none', active === results.length ? 'bg-surface-subtle' : 'hover:bg-surface-subtle')}
              >
                <ArrowRight className="size-5 shrink-0 text-text-secondary" strokeWidth={1.75} />
                <span className="flex-1">View all results</span>
                <span className="text-xs text-text-muted">Enter</span>
              </div>
            </>
          )}
        </div>
      </Popover>
    </div>
  )
}

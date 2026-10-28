import { Ellipsis, Handshake, PanelRightOpen, Plus, RotateCcw, SearchX, Trash2, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useMatch, useNavigate, useSearchParams } from 'react-router'
import { defaultFilters, owners as dealOwners, stageLabel, stages } from '../../data/deals'
import { useDeals } from '../../context/dealsContext'
import { useRecords } from '../../context/recordsContext'
import { useToast } from '../../context/toastContext'
import { motion, prefersReducedMotion } from '../../lib/motion'
import { filterDeals, hasActiveFilters, isOpen, money, sortDeals, sumValue } from '../../lib/dealsLogic'
import { AnimatedNumber } from '../ui/AnimatedNumber'
import { Button } from '../ui/Button'
import { ConfirmModal } from '../ui/ConfirmModal'
import { Drawer } from '../ui/Drawer'
import { EmptyState } from '../ui/EmptyState'
import { IconButton } from '../ui/IconButton'
import { Menu } from '../ui/Menu'
import { SkeletonLine } from '../ui/Skeleton'
import { AddDealModal } from './AddDealModal'
import { BulkActionBar } from './BulkActionBar'
import { DealDrawerBody, DealNotFound } from './DealDrawer'
import { DealsSkeleton } from './DealsSkeleton'
import { DealsTable } from './DealsTable'
import { DealsToolbar } from './DealsToolbar'
import { KanbanBoard } from './KanbanBoard'
import { LostReasonModal } from './LostReasonModal'
import type { LostReason, MenuEntry, NewDealInput, PipelineDeal, SortKey, Stage } from '../../types'

// Deals page: board / list, filters, drag and drop, bulk actions and the detail drawer at /deals/:id.
let loadedOnce = false

type Status = 'loading' | 'ready' | 'error'

function DealsContent({ headerSlot }: { headerSlot: HTMLElement | null }) {
  const { state, status: dataStatus, setView, setFilters, setSort, toggleCollapsed, addDeal, moveDeal, removeDeals, updateDeal, reset, ownerById } = useDeals()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()
  const openMatch = useMatch('/deals/:id')
  const openId = openMatch?.params.id ?? null
  const errorFlag = params.get('error') === '1'
  const urlApplied = useRef('')
  // Links from Reports (?stage=won&owner=o2&stageFrom=2025-10-01&stageTo=2025-10-20) open the list with those filters, then tidy the address.
  useEffect(() => {
    const keys = ['stage', 'owner', 'stageFrom', 'stageTo']
    if (!keys.some((k) => params.has(k))) { urlApplied.current = ''; return }
    // `setFilters` changes identity with every state change: apply each address once, not on every render until the address is tidied.
    if (urlApplied.current === params.toString()) return
    urlApplied.current = params.toString()
    const day = (v: string | null): string => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '')
    setFilters({ ...defaultFilters, stages: (params.get('stage') ?? '').split(',').filter((s): s is Stage => stages.some((x) => x.id === s)), owners: (params.get('owner') ?? '').split(',').filter((id) => dealOwners.some((o) => o.id === id)), stageFrom: day(params.get('stageFrom')), stageTo: day(params.get('stageTo')) })
    setView('list')
    setParams((p) => { keys.forEach((k) => p.delete(k)); return p }, { replace: true })
  }, [params, setParams, setFilters, setView])

  const [status, setStatus] = useState<Status>(() => ((loadedOnce || prefersReducedMotion()) && !errorFlag ? 'ready' : 'loading'))
  useEffect(() => {
    if (status !== 'loading') return undefined
    const t = setTimeout(() => { loadedOnce = true; setStatus(errorFlag ? 'error' : 'ready') }, prefersReducedMotion() ? 0 : motion.skeleton)
    return () => clearTimeout(t)
  }, [status, errorFlag])
  const retry = () => { setParams((p) => { p.delete('error'); return p }, { replace: true }); setStatus('loading') }

  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [flashId, setFlashId] = useState<string | null>(null)
  const flashTimer = useRef(0)
  useEffect(() => () => window.clearTimeout(flashTimer.current), [])
  const [addOpen, setAddOpen] = useState(false)
  const [addKey, setAddKey] = useState(0)
  const [lost, setLost] = useState<{ ids: string[]; key: number } | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [freshId, setFreshId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [shownId, setShownId] = useState<string | null>(openId)
  if (openId && openId !== shownId) setShownId(openId)

  const announce = useCallback((msg: string) => setAnnouncement((prev) => (prev === msg ? `${msg}​` : msg)), [])
  const { resolve } = useRecords()
  const filtered = useMemo(() => filterDeals(state.deals, state.filters, (d) => (d.contactId ? resolve({ type: 'contact', id: d.contactId })?.name ?? d.contact : d.contact)), [state.deals, state.filters, resolve])
  const listDeals = useMemo(() => sortDeals(filtered, state.sort, (id) => ownerById(id).name), [filtered, state.sort, ownerById])
  const chosen = useMemo(() => new Set([...selected].filter((id) => filtered.some((d) => d.id === id))), [selected, filtered])
  const open = useMemo(() => state.deals.filter(isOpen), [state.deals])
  const filtersOn = hasActiveFilters(state.filters)

  // From the top search (/deals?focus=<id>): show the deal's card. Clear filters that hide it, open its stage column if collapsed, scroll it into view,
  // move focus to it and highlight it for a moment (no smooth scrolling under reduced motion; the highlight just appears and goes).
  const focusId = params.get('focus')
  const focused = useRef<string | null>(null) // the address that was already handled (the address is tidied right after)
  useEffect(() => {
    if (!focusId) { focused.current = null; return undefined }
    if (status !== 'ready' || dataStatus !== 'ready' || focused.current === focusId) return undefined
    const deal = state.deals.find((d) => d.id === focusId)
    const done = () => { focused.current = focusId; setParams((p) => { p.delete('focus'); return p }, { replace: true }) }
    if (!deal) { done(); toast({ type: 'info', title: 'That deal is no longer here', message: 'It may have been deleted or reassigned.' }); return undefined }
    if (!filtered.some((d) => d.id === focusId)) { setFilters(defaultFilters); return undefined }
    if (state.view === 'board' && state.collapsed.includes(deal.stage)) { toggleCollapsed(deal.stage); return undefined }
    const reduce = prefersReducedMotion()
    const t = window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-deal-id="${focusId}"]`)
      el?.scrollIntoView({ block: 'center', inline: 'center', behavior: reduce ? 'auto' : 'smooth' })
      el?.focus({ preventScroll: true })
      done()
      setFlashId(focusId)
      announce(`Showing ${deal.title}, in ${stageLabel(deal.stage)}.`)
      window.clearTimeout(flashTimer.current)
      flashTimer.current = window.setTimeout(() => setFlashId((f) => (f === focusId ? null : f)), 2200)
    }, state.view === 'board' && !reduce ? 320 : 120) // let a just-expanded column finish opening, and the page finish mounting
    return () => window.clearTimeout(t)
  }, [focusId, status, dataStatus, state.deals, state.view, state.collapsed, filtered, setFilters, toggleCollapsed, setParams, toast, announce])

  const openDeal = useCallback((id: string) => navigate(`/deals/${id}${location.search}`), [navigate, location.search])
  const closeDeal = useCallback(() => navigate(`/deals${location.search}`), [navigate, location.search])

  const performMove = async (ids: string[], to: Stage, reason?: LostReason) => {
    const results = (await Promise.all(ids.map((id) => moveDeal(id, to, reason)))).filter((r): r is NonNullable<typeof r> => r !== null)
    if (!results.length) return
    const one = results[0].deal
    const title = results.length === 1 ? `Moved ${one.title} to ${stageLabel(to)}` : `Moved ${results.length} deals to ${stageLabel(to)}`
    const message = to === 'won' ? (results.length === 1 ? `Nice work. Closed at ${money(one.value)}.` : `Nice work. ${money(sumValue(results.map((r) => r.deal)))} closed.`) : to === 'lost' ? `Reason: ${reason}.` : results.length === 1 ? `From ${stageLabel(results[0].from)}.` : undefined
    toast({
      type: to === 'won' ? 'success' : 'info',
      title,
      message,
      action: { label: 'Undo', onClick: () => { results.forEach((r) => r.undo()); announce(`Move undone. ${results.length === 1 ? one.title : `${results.length} deals`} back in ${stageLabel(results[0].from)}.`) } },
    })
    announce(`${title}. Undo is available.`)
  }
  const requestMove = (ids: string[], to: Stage) => {
    const movable = ids.filter((id) => state.deals.find((d) => d.id === id)?.stage !== to)
    if (!movable.length) return
    if (to === 'lost') setLost({ ids: movable, key: Date.now() })
    else performMove(movable, to)
  }

  const createDeal = async (input: NewDealInput) => {
    const deal = await addDeal(input)
    setFreshId(deal.id)
    window.setTimeout(() => setFreshId(null), 1200)
    toast({ type: 'success', title: 'Deal added', message: `${deal.title} is in ${stageLabel(deal.stage)}.`, action: { label: 'Undo', onClick: () => { void removeDeals([deal.id]) } } })
    announce(`Added ${deal.title} to ${stageLabel(deal.stage)}.`)
  }
  const deleteDeals = async (ids: string[]) => {
    const names = ids.map((id) => state.deals.find((d) => d.id === id)?.title).filter(Boolean)
    setSelected(new Set())
    setConfirmDelete(null)
    if (openId && ids.includes(openId)) closeDeal()
    const restore = await removeDeals(ids)
    toast({ type: 'info', title: ids.length === 1 ? `Deleted ${names[0]}` : `Deleted ${ids.length} deals`, action: { label: 'Undo', onClick: restore } })
    announce(ids.length === 1 ? `Deleted ${names[0]}.` : `Deleted ${ids.length} deals.`)
  }

  const menuFor = (deal: PipelineDeal): MenuEntry[] => [
    { id: 'open', label: 'Open details', icon: PanelRightOpen, onSelect: () => openDeal(deal.id) },
    { type: 'label', label: 'Move to…' },
    ...stages.map((s) => ({ id: `move-${s.id}`, label: s.label, checked: deal.stage === s.id, radio: true, onSelect: () => requestMove([deal.id], s.id) })),
    { type: 'separator' },
    { id: 'delete', label: 'Delete deal', icon: Trash2, danger: true, onSelect: () => setConfirmDelete([deal.id]) },
  ]

  const onSort = (key: SortKey) => setSort(state.sort.key === key ? { key, dir: state.sort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'value' || key === 'lastActivity' ? 'desc' : 'asc' })
  const toggleOne = (id: string, on: boolean) => setSelected((s) => { const n = new Set(s); if (on) n.add(id); else n.delete(id); return n })
  const toggleAll = (on: boolean) => setSelected(on ? new Set(listDeals.map((d) => d.id)) : new Set())

  const shownDeal = shownId ? state.deals.find((d) => d.id === shownId) ?? null : null
  const returnFocus = () => document.querySelector<HTMLElement>(`[data-deal-id="${shownId}"]`) ?? document.querySelector<HTMLElement>('[data-deals-fallback]')

  const loading = status === 'loading' || dataStatus === 'loading'
  const ready = status === 'ready' && dataStatus === 'ready'
  const headerBar = (
    <>
      <div className="flex min-w-0 items-baseline gap-3">
        {ready ? (
          <>
            <span className="text-amount font-medium leading-6.5"><AnimatedNumber value={sumValue(open)} format={money} /></span>
            <span className="truncate text-sm text-text-secondary">open pipeline · <AnimatedNumber value={open.length} /> open {open.length === 1 ? 'deal' : 'deals'}</span>
          </>
        ) : loading ? (
          <SkeletonLine className="h-5 w-64" />
        ) : (
          <span className="text-sm text-text-secondary">Pipeline unavailable</span>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Menu align="end" label="Deals page options" items={[{ id: 'reset', label: 'Reset demo data', icon: RotateCcw, onSelect: () => setConfirmReset(true) }]} trigger={({ props }) => <IconButton icon={Ellipsis} label="Page options" size="lg" menuProps={props} />} />
        <Button variant="primary" icon={Plus} onClick={() => { setAddKey((k) => k + 1); setAddOpen(true) }}>Add deal</Button>
      </div>
    </>
  )

  let content
  if (loading) content = <DealsSkeleton view={state.view} />
  else if (status === 'error' || dataStatus === 'error') content = (
    <div className="grid h-full place-items-center rounded-2xl border border-border bg-surface" data-deals-fallback tabIndex={-1}>
      <EmptyState tone="danger" icon={TriangleAlert} title="We could not load your deals" description="Check your connection and try again." action={<Button onClick={retry}>Retry</Button>} />
    </div>
  )
  else if (state.deals.length === 0) content = (
    <div className="grid h-full place-items-center rounded-2xl border border-border bg-surface" data-deals-fallback tabIndex={-1}>
      <EmptyState icon={Handshake} title="No deals yet" description="Add your first deal to start building your pipeline." action={<Button variant="primary" icon={Plus} onClick={() => { setAddKey((k) => k + 1); setAddOpen(true) }}>Add deal</Button>} />
    </div>
  )
  else if (filtered.length === 0) content = (
    <div className="grid h-full place-items-center rounded-2xl border border-border bg-surface" data-deals-fallback tabIndex={-1}>
      <NoResults />
    </div>
  )
  else if (state.view === 'board') content = (
    <KanbanBoard deals={filtered} hasFilters={filtersOn} selectedId={openId} freshId={freshId} flashId={flashId} menuFor={menuFor} onOpen={openDeal} onMove={(id, to) => requestMove([id], to)} onAdd={(input) => createDeal(input)} />
  )
  else content = (
    <div className="relative h-full min-h-0">
      <div className="relative h-full overflow-auto rounded-lg border border-border bg-surface pb-18 shadow-card" data-deals-fallback tabIndex={-1} role="region" aria-label="Deals list">
        <DealsTable deals={listDeals} sort={state.sort} onSort={onSort} selected={chosen} onToggle={toggleOne} onToggleAll={toggleAll} selectedId={openId} flashId={flashId} menuFor={menuFor} onOpen={openDeal} />
      </div>
      {chosen.size > 0 && (
        <BulkActionBar
          count={chosen.size}
          total={listDeals.length}
          onClear={() => setSelected(new Set())}
          onMoveStage={(s) => requestMove([...chosen], s)}
          onAssign={(ownerId) => {
            const ids = [...chosen]
            ids.forEach((id) => updateDeal(id, { ownerId }))
            toast({ type: 'success', title: `Assigned ${ids.length} ${ids.length === 1 ? 'deal' : 'deals'} to ${ownerById(ownerId).name}` })
            announce(`Assigned ${ids.length} deals to ${ownerById(ownerId).name}.`)
          }}
          onDelete={() => setConfirmDelete([...chosen])}
        />
      )}
    </div>
  )

  const lostNames = (lost?.ids ?? []).map((id) => state.deals.find((d) => d.id === id)?.title ?? '')
  return (
    <>
      {headerSlot && createPortal(headerBar, headerSlot)}
      <DealsToolbar shown={filtered.length} total={state.deals.length} view={state.view} onView={setView} />
      <div className="min-h-0 flex-1">{content}</div>

      <div role="status" aria-live="polite" className="sr-only" data-deals-announcer>{announcement}</div>

      <Drawer open={Boolean(openId)} onClose={closeDeal} title={shownDeal ? `Deal details: ${shownDeal.title}` : 'Deal details'} returnFocus={returnFocus}>
        {shownDeal ? <DealDrawerBody key={shownDeal.id} deal={shownDeal} onClose={closeDeal} onMove={(id, to) => requestMove([id], to)} /> : dataStatus === 'ready' ? <DealNotFound id={shownId ?? ''} onClose={closeDeal} /> : null}
      </Drawer>

      <AddDealModal key={addKey} open={addOpen} onClose={() => setAddOpen(false)} onAdd={(input) => { setAddOpen(false); createDeal(input) }} />
      <LostReasonModal key={lost?.key ?? 'none'} open={Boolean(lost)} names={lostNames} onCancel={() => setLost(null)} onConfirm={(reason) => { const ids = lost?.ids ?? []; setLost(null); performMove(ids, 'lost', reason) }} />
      <ConfirmModal
        open={confirmDelete !== null}
        title={`Delete ${confirmDelete && confirmDelete.length > 1 ? `${confirmDelete.length} deals` : 'this deal'}?`}
        message="They will be removed from your pipeline. You can undo right after."
        confirmLabel="Delete"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deleteDeals(confirmDelete)}
      />
      <ConfirmModal
        open={confirmReset}
        title="Reset demo data?"
        message={'This restores the 24 sample deals, clears your filters and discards your changes.'}
        confirmLabel="Reset"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => { setConfirmReset(false); setSelected(new Set()); void reset().then(() => { navigate('/deals'); toast({ type: 'success', title: 'Demo data reset', message: 'The sample deals are back.' }); announce('Demo data reset.') }) }}
      />
    </>
  )
}

function NoResults() {
  const { clearFilters } = useDeals()
  return <EmptyState icon={SearchX} title="No deals match these filters" description="Try a different search or clear your filters." action={<Button variant="primary" onClick={clearFilters}>Clear filters</Button>} />
}

export function DealsPage({ headerSlot }: { headerSlot: HTMLElement | null }) {
  return <DealsContent headerSlot={headerSlot} />
}

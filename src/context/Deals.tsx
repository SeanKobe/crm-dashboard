import { useCallback, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'
import type { DealFilters, DealSort, DealView, PipelineDeal, Stage } from '../types'
import { defaultFilters, owners } from '../data/deals'
import { CURRENT_USER_ID, dealsService, loadDealPrefs, saveDealPrefs, subscribeDeals, type DealPrefs } from '../services/deals'
import { DealsContext, type DealsApi, type DealsStatus } from './dealsContext'

// Holds the deals list (loaded and kept in sync through services/deals.ts) and the board / list preferences.
type PrefAction =
  | { type: 'filters'; patch: Partial<DealFilters> }
  | { type: 'clearFilters' }
  | { type: 'view'; view: DealView }
  | { type: 'sort'; sort: DealSort }
  | { type: 'collapse'; stage: Stage }
  | { type: 'set'; prefs: DealPrefs }

function prefsReducer(p: DealPrefs, a: PrefAction): DealPrefs {
  switch (a.type) {
    case 'filters': return { ...p, filters: { ...p.filters, ...a.patch } }
    case 'clearFilters': return { ...p, filters: defaultFilters }
    case 'view': return { ...p, view: a.view }
    case 'sort': return { ...p, sort: a.sort }
    case 'collapse': return { ...p, collapsed: p.collapsed.includes(a.stage) ? p.collapsed.filter((s) => s !== a.stage) : [...p.collapsed, a.stage] }
    case 'set': return a.prefs
  }
}

export function DealsProvider({ children }: { children: ReactNode }) {
  const [prefs, dispatch] = useReducer(prefsReducer, undefined, loadDealPrefs)
  const [deals, setDeals] = useState<PipelineDeal[]>([])
  const [status, setStatus] = useState<DealsStatus>('loading')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let live = true
    dealsService.list().then((rows) => { if (live) { setDeals(rows); setStatus('ready') } }).catch(() => { if (live) setStatus('error') })
    return () => { live = false }
  }, [tick])

  // Writes made anywhere (this provider, other pages) arrive here as events.
  useEffect(() => subscribeDeals((e) => {
    setDeals(e.deals)
    if (e.type === 'reset') dispatch({ type: 'set', prefs: e.prefs })
  }), [])

  useEffect(() => { saveDealPrefs(prefs) }, [prefs])

  const ownerById = useCallback((id: string) => owners.find((o) => o.id === id) ?? owners[0], [])

  const api = useMemo<DealsApi>(() => ({
    state: { deals, ...prefs },
    status,
    owners,
    ownerById,
    currentUserId: CURRENT_USER_ID,
    addDeal: (input) => dealsService.create(input),
    updateDeal: (id, patch) => { void dealsService.update(id, patch).catch(() => {}) },
    moveDeal: async (id, stage, reason) => {
      const r = await dealsService.moveStage(id, stage, reason)
      return r ? { deal: r.deal, from: r.from, to: r.to, undo: () => { void dealsService.undoMove(id, r.undo) } } : null
    },
    removeDeals: async (ids) => {
      const deleted = await dealsService.delete(ids)
      return () => { void dealsService.restore(deleted) }
    },
    addActivity: (id, entry) => { void dealsService.addActivity(id, entry).catch(() => {}) },
    setFilters: (patch) => dispatch({ type: 'filters', patch }),
    clearFilters: () => dispatch({ type: 'clearFilters' }),
    setView: (view) => dispatch({ type: 'view', view }),
    setSort: (sort) => dispatch({ type: 'sort', sort }),
    toggleCollapsed: (stage) => dispatch({ type: 'collapse', stage }),
    reset: () => dealsService.reset(),
    reload: () => { setStatus('loading'); setTick((t) => t + 1) },
  }), [deals, prefs, status, ownerById])

  return <DealsContext.Provider value={api}>{children}</DealsContext.Provider>
}

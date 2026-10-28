import { createContext, useContext } from 'react'
import type { DealActivity, DealFilters, DealOwner, DealSort, DealView, DealsState, LostReason, NewDealInput, PipelineDeal, Stage } from '../types'

export interface MoveResult {
  deal: PipelineDeal
  from: Stage
  to: Stage
  undo: () => void
}

export type DealsStatus = 'loading' | 'ready' | 'error'

// Data hook for deals: the list and its loading / error status, plus mutations. Everything goes through services/deals.ts.
export interface DealsApi {
  state: DealsState
  status: DealsStatus
  owners: DealOwner[]
  ownerById: (id: string) => DealOwner
  currentUserId: string
  addDeal: (input: NewDealInput) => Promise<PipelineDeal>
  updateDeal: (id: string, patch: Partial<PipelineDeal>) => void
  moveDeal: (id: string, stage: Stage, reason?: LostReason) => Promise<MoveResult | null>
  /** Deletes deals and resolves to a function that brings them back. */
  removeDeals: (ids: string[]) => Promise<() => void>
  addActivity: (id: string, entry: Pick<DealActivity, 'kind' | 'title' | 'description'>) => void
  setFilters: (patch: Partial<DealFilters>) => void
  clearFilters: () => void
  setView: (view: DealView) => void
  setSort: (sort: DealSort) => void
  toggleCollapsed: (stage: Stage) => void
  reset: () => Promise<void>
  reload: () => void
}

export const DealsContext = createContext<DealsApi | null>(null)

export function useDeals(): DealsApi {
  const ctx = useContext(DealsContext)
  if (!ctx) throw new Error('useDeals must be used inside <DealsProvider>')
  return ctx
}

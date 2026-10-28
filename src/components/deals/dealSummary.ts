import { priorityLabel } from '../../data/deals'
import { daysInStage, formatShort } from '../../lib/dates'
import { isOverdue, money } from '../../lib/dealsLogic'
import type { DealOwner, PipelineDeal } from '../../types'

export function dealSummary(deal: PipelineDeal, owner: DealOwner): string {
  const days = daysInStage(deal.stageSince)
  return [deal.title, deal.company, money(deal.value), isOverdue(deal) ? 'overdue' : `closes ${formatShort(deal.closeDate)}`, `${priorityLabel[deal.priority]} priority`, `owner ${owner.name}`, `${days} ${days === 1 ? 'day' : 'days'} in stage`].filter(Boolean).join(', ')
}

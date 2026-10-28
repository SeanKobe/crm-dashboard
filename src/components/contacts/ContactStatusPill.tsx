import { stageStyle } from '../deals/stageStyles'
import { cn } from '../../lib/cn'
import type { LeadStatus, Stage } from '../../types'

// Status Pill anatomy (tinted capsule, dot, label) for lead statuses; colors reuse the stage palette.
const asStage: Record<LeadStatus, Stage> = { New: 'new', Contacted: 'contacted', Qualified: 'qualified', Unqualified: 'lost', Customer: 'won' }
const statusStyle = (s: LeadStatus) => stageStyle[asStage[s]]

export function ContactStatusPill({ status, className }: { status: LeadStatus; className?: string }) {
  const s = statusStyle(status)
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-[3px] text-xs font-medium leading-3.75', s.tint, s.text, className)}>
      <span aria-hidden className={cn('size-1.5 rounded-full', s.dot)} />
      {status}
    </span>
  )
}

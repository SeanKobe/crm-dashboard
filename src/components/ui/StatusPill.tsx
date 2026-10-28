import { stageStyle } from '../deals/stageStyles'
import { stageLabel } from '../../data/deals'
import { cn } from '../../lib/cn'
import type { Stage } from '../../types'

// Figma "Status Pill": tinted capsule with a dot and the status name (Qualified, Contacted, Won, Lost; New and Proposal use the same anatomy).
export function StatusPill({ stage, className }: { stage: Stage; className?: string }) {
  const s = stageStyle[stage]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-[3px] text-xs font-medium leading-3.75', s.tint, s.text, className)}>
      <span aria-hidden className={cn('size-1.5 rounded-full', s.dot)} />
      {stageLabel(stage)}
    </span>
  )
}

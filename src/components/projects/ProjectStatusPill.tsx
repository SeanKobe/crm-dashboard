import { cn } from '../../lib/cn'
import type { ProjectStatus } from '../../types'
import { statusStyle } from './projectMeta'

// Same anatomy as the Figma "Status Pill" (tinted capsule, dot, name). The word is always there, so colour is never the only signal.
export function ProjectStatusPill({ status, className }: { status: ProjectStatus; className?: string }) {
  const s = statusStyle[status]
  return (
    <span data-project-status={status} className={cn('inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-[3px] text-xs font-medium leading-3.75', s.tint, s.text, className)}>
      <span aria-hidden className={cn('size-1.5 rounded-full', s.dot)} />
      {status}
    </span>
  )
}

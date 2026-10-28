import { Ellipsis } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { MenuTriggerProps } from '../../types'

// Quiet "more" trigger used in cards and table rows (opens a Menu).
export function MoreButton({ props, label, className }: { props: MenuTriggerProps; label: string; className?: string }) {
  return (
    <button
      {...props}
      type="button"
      aria-label={label}
      className={cn('-my-0.5 grid size-6 shrink-0 place-items-center rounded-sm text-text-secondary outline-none transition-colors duration-hover ease-out hover:bg-surface-muted hover:text-text-primary aria-expanded:bg-surface-muted focus-ring motion-reduce:transition-none', className)}
    >
      <Ellipsis className="size-5" strokeWidth={1.75} />
    </button>
  )
}

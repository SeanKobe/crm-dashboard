import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

// Smooth height collapse (grid-template-rows 0fr -> 1fr). Closed content is inert, so it leaves the tab order.
export interface CollapseProps {
  open: boolean
  children: ReactNode
  className?: string
}

export function Collapse({ open, children, className }: CollapseProps) {
  return (
    <div className={cn('grid transition-[grid-template-rows,opacity] duration-move ease-out', open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0', className)} inert={!open} aria-hidden={!open}>
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}

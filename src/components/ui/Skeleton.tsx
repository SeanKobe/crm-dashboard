import { cn } from '../../lib/cn'
import type { SkeletonVariant } from '../../types'

// Figma "Skeleton" shapes (Line, Circle, Block) with a shimmer sweep.
const shimmer = 'bg-linear-to-r from-surface-muted via-surface-subtle to-surface-muted bg-[length:200%_100%] animate-shimmer'
interface ShapeProps {
  className?: string
}
export const SkeletonLine = ({ className }: ShapeProps) => <span className={cn('block h-3 rounded-sm', shimmer, className)} />
export const SkeletonBlock = ({ className }: ShapeProps) => <span className={cn('block rounded-md', shimmer, className)} />
export const SkeletonCircle = ({ className }: ShapeProps) => <span className={cn('block size-10 rounded-full', shimmer, className)} />

// Covers a card while it "loads" (about 600ms), then fades away. The card keeps its size, so nothing shifts.
export interface SkeletonOverlayProps {
  show: boolean
  variant?: SkeletonVariant
}

export function SkeletonOverlay({ show, variant = 'chart' }: SkeletonOverlayProps) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 z-10 flex flex-col rounded-lg bg-surface transition-opacity duration-move ease-out', variant === 'kpi' ? 'gap-5 px-[11px] py-4' : 'gap-4 p-5', show ? 'opacity-100' : 'opacity-0')}>
      {variant === 'kpi' ? (
        <>
          <div className="flex items-center gap-2.5"><SkeletonBlock className="size-9" /><SkeletonLine className="w-24" /></div>
          <div className="flex items-center justify-between"><SkeletonLine className="h-7 w-28" /><SkeletonLine className="w-20" /></div>
        </>
      ) : (
        <>
          <div className="flex items-center justify-between"><SkeletonLine className="w-32" /><SkeletonBlock className="size-8" /></div>
          <SkeletonLine className="h-6 w-40" />
          <SkeletonBlock className="min-h-0 flex-1" />
        </>
      )}
    </div>
  )
}

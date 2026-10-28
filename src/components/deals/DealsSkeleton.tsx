import { stages } from '../../data/deals'
import { SkeletonBlock, SkeletonCircle, SkeletonLine } from '../ui/Skeleton'
import type { DealView } from '../../types'

// Loading state (about 600ms on first load): the same frames as the board / table, filled with Skeleton shapes.
export function DealsSkeleton({ view }: { view: DealView }) {
  if (view === 'list') {
    return (
      <div aria-busy="true" aria-label="Loading deals" role="status" className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
        <div className="h-10 border-b border-border bg-surface-subtle" />
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex h-14 items-center gap-3 border-b border-border px-4 last:border-b-0">
            <SkeletonCircle className="size-10" />
            <SkeletonLine className="w-40" />
            <SkeletonLine className="w-40" />
            <span className="flex-1" />
            <SkeletonLine className="w-20" />
          </div>
        ))}
      </div>
    )
  }
  return (
    <div aria-busy="true" aria-label="Loading deals" role="status" className="flex h-full min-h-0 gap-4 overflow-hidden rounded-2xl border border-border bg-surface p-4">
      {stages.map((s, c) => (
        <div key={s.id} className="flex w-70 shrink-0 flex-col gap-3 rounded-lg border border-border bg-surface-subtle p-3 lg:w-75">
          <div className="flex items-center gap-2 pb-1"><SkeletonLine className="w-24" /><span className="flex-1" /><SkeletonBlock className="size-7" /></div>
          {Array.from({ length: Math.max(1, 3 - (c % 3)) }, (_, i) => <SkeletonBlock key={i} className="h-32 rounded-lg" />)}
        </div>
      ))}
    </div>
  )
}

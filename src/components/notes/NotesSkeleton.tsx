import { SkeletonBlock, SkeletonLine } from '../ui/Skeleton'

export function NoteListSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading notes" className="flex flex-col gap-1 p-2">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex flex-col gap-2 rounded-md px-3 py-2.5">
          <div className="flex items-center gap-2"><SkeletonLine className="h-3.5 w-40" /><span className="flex-1" /><SkeletonLine className="w-12" /></div>
          <SkeletonLine className="w-full" />
          <SkeletonLine className="w-3/4" />
        </div>
      ))}
    </div>
  )
}

export function NoteEditorSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading note" className="flex flex-col gap-4 p-6">
      <SkeletonLine className="h-6 w-72" />
      <div className="flex gap-2"><SkeletonBlock className="h-7 w-40" /><SkeletonBlock className="h-7 w-24" /></div>
      <SkeletonBlock className="h-10 w-full" />
      <SkeletonLine className="w-full" /><SkeletonLine className="w-full" /><SkeletonLine className="w-5/6" /><SkeletonLine className="w-2/3" />
    </div>
  )
}

import { Avatar } from '../ui/Avatar'
import { ownerById } from './projectMeta'

// Figma "Avatar Stack": overlapping avatars (-6px) with a 2px surface ring; "+N" after the first few. Names are spoken, not just shown.
export function OwnerAvatars({ ids, max = 3 }: { ids: string[]; max?: number }) {
  const people = ids.map(ownerById).filter((o): o is NonNullable<typeof o> => o !== null)
  const shown = people.slice(0, max)
  const names = people.map((o) => o.name).join(', ')
  return (
    <span className="inline-flex items-center gap-1" role="img" aria-label={names ? `Owners: ${names}` : 'No owner'} title={names}>
      <span className="flex -space-x-1.5">
        {shown.map((o) => <Avatar key={o.id} initial={o.initial} tone={o.tone} size="L" className="ring-2 ring-surface" />)}
      </span>
      {people.length > max && <span className="text-xs font-medium text-primary">+{people.length - max}</span>}
    </span>
  )
}

import { ArrowRightLeft, Calendar, Handshake, Mail, Phone, RefreshCw, StickyNote, Trophy } from 'lucide-react'
import { cn } from '../../lib/cn'
import { relativeTime } from '../../lib/dates'
import { Avatar } from '../ui/Avatar'
import type { ContactActivityKind, DealOwner, IconComponent } from '../../types'

// Figma "Activity Timeline Item": 32px icon circle on a rail, title, description, owner + time. Type: Call / Email / Meeting / Note / Deal won
// (Stage change has no Figma version: same anatomy, primary tint with the arrows icon).
const KINDS: Record<ContactActivityKind, { icon: IconComponent; tint: string; text: string; label: string }> = {
  call: { icon: Phone, tint: 'bg-primary', text: 'text-primary', label: 'Call' },
  email: { icon: Mail, tint: 'bg-primary', text: 'text-primary', label: 'Email' },
  meeting: { icon: Calendar, tint: 'bg-warning', text: 'text-warning-foreground', label: 'Meeting' },
  note: { icon: StickyNote, tint: 'bg-text-secondary', text: 'text-text-secondary', label: 'Note' },
  stage: { icon: ArrowRightLeft, tint: 'bg-info', text: 'text-info-strong', label: 'Stage change' },
  won: { icon: Trophy, tint: 'bg-success', text: 'text-success-strong', label: 'Deal won' },
  // Contacts reuse this item: status changes and deals created from a contact.
  status: { icon: RefreshCw, tint: 'bg-info', text: 'text-info-strong', label: 'Status change' },
  deal: { icon: Handshake, tint: 'bg-primary', text: 'text-primary', label: 'Deal' },
}

export interface ActivityTimelineItemProps {
  activity: { id: string; kind: ContactActivityKind; title: string; description: string; at: string }
  owner: DealOwner
  last: boolean
}

export function ActivityTimelineItem({ activity, owner, last }: ActivityTimelineItemProps) {
  const k = KINDS[activity.kind]
  const Icon = k.icon
  return (
    <li className="flex gap-3" data-activity-kind={activity.kind}>
      <div className="flex w-8 shrink-0 flex-col items-center gap-1">
        <span className="relative grid size-8 place-items-center rounded-full">
          <span aria-hidden className={cn('absolute inset-0 rounded-full opacity-14', k.tint)} />
          <Icon aria-hidden className={cn('relative size-5', k.text)} strokeWidth={1.75} />
        </span>
        {!last && <span aria-hidden className="w-px flex-1 bg-border" />}
      </div>
      <div className={cn('flex min-w-0 flex-1 flex-col gap-0.5', !last && 'pb-4')}>
        <p className="text-sm font-medium leading-4.25"><span className="sr-only">{k.label}: </span>{activity.title}</p>
        {activity.description && <p className="text-compact leading-4 text-text-secondary">{activity.description}</p>}
        <p className="flex items-center gap-1.5 pt-1 text-xs leading-3.75 text-text-secondary">
          <Avatar initial={owner.initial} tone={owner.tone} size="S" />
          <span className="font-medium">{owner.name}</span>
          <span aria-hidden>·</span>
          <span>{relativeTime(activity.at)}</span>
        </p>
      </div>
    </li>
  )
}

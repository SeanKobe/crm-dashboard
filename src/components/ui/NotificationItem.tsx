import type { KeyboardEventHandler, Ref } from 'react'
import { cn } from '../../lib/cn'
import { Avatar } from './Avatar'
import type { NotificationData } from '../../types'

// Figma "Notification Item": Default / Hover (surface-subtle) / Unread (primary-soft + dot) / Focus / Disabled.
export interface NotificationItemProps {
  item: NotificationData
  onClick?: () => void
  itemRef?: Ref<HTMLButtonElement>
  onKeyDown?: KeyboardEventHandler<HTMLButtonElement>
  tabIndex?: number
}

export function NotificationItem({ item, onClick, itemRef, onKeyDown, tabIndex = -1 }: NotificationItemProps) {
  return (
    <button
      ref={itemRef}
      type="button"
      tabIndex={tabIndex}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={cn(
        'flex w-full items-start gap-3 rounded-md p-3 text-left outline-none transition-colors duration-hover ease-out motion-reduce:transition-none focus-ring',
        item.unread ? 'bg-primary-soft hover:bg-primary-soft' : 'bg-surface hover:bg-surface-subtle active:bg-surface-muted',
      )}
    >
      <Avatar initial={item.initial} tone={item.tone} size="LG" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium leading-4.25">{item.title}</span>
        <span className="text-compact leading-4 text-text-secondary">{item.message}</span>
        <span className="text-xs leading-3.75 text-text-muted">{item.time}</span>
      </span>
      <span aria-label={item.unread ? 'Unread' : undefined} className={cn('mt-1.5 size-2 shrink-0 rounded-full bg-primary transition-opacity duration-hover ease-out', item.unread ? 'opacity-100' : 'opacity-0')} />
    </button>
  )
}

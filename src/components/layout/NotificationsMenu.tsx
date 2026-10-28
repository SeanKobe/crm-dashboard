import { useRef, useState, type KeyboardEvent } from 'react'
import { Bell, Inbox, Mail } from 'lucide-react'
import { messages as messageData, notifications as notificationData } from '../../data/mock'
import { IconButton } from '../ui/IconButton'
import { Popover } from '../ui/Menu'
import { NotificationItem } from '../ui/NotificationItem'
import type { NotificationData, TriggerBinding } from '../../types'

// Bell and mail share this dropdown; both list Figma "Notification Item" rows with arrow-key navigation.
export interface NotificationsMenuProps {
  kind: 'notifications' | 'messages'
  /** Badge text on the trigger (the mail icon shows the unread count). */
  badge?: string
}

export function NotificationsMenu({ kind, badge }: NotificationsMenuProps) {
  const isMail = kind === 'messages'
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationData[]>(() => (isMail ? messageData : notificationData).map((n) => ({ ...n })))
  const triggerRef = useRef<HTMLButtonElement>(null)
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const unread = items.filter((n) => n.unread).length
  const [initialUnread] = useState(() => (isMail ? messageData : notificationData).filter((n) => n.unread).length)
  // The trigger badge is the total unread count; reading items counts it down and it disappears when nothing is unread.
  const shownBadge = badge && unread > 0 ? String(Math.max(0, Number(badge) - (initialUnread - unread))) : undefined
  const close = (restore: boolean = true) => { setOpen(false); if (restore) triggerRef.current?.focus({ preventScroll: true }) }
  const focusAt = (i: number) => refs.current[(i + items.length) % items.length]?.focus()
  const onKeyDown = (i: number) => (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); focusAt(i + 1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusAt(i - 1) }
    else if (e.key === 'Home') { e.preventDefault(); focusAt(0) }
    else if (e.key === 'End') { e.preventDefault(); focusAt(items.length - 1) }
  }
  const menuProps: TriggerBinding<HTMLButtonElement> = {
    ref: triggerRef,
    'aria-haspopup': 'dialog',
    'aria-expanded': open,
    onClick: () => { setOpen((o) => !o); setTimeout(() => refs.current[0]?.focus(), 30) },
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => { if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setTimeout(() => refs.current[0]?.focus(), 30) } },
  }
  return (
    <>
      <IconButton icon={isMail ? Mail : Bell} label={isMail ? 'Messages' : 'Notifications'} badge={shownBadge} pop={Boolean(shownBadge)} size="lg" lift menuProps={menuProps} />
      <Popover open={open} onClose={close} anchorRef={triggerRef} align="end" role="dialog" label={isMail ? 'Messages' : 'Notifications'}>
        <div className="flex w-98 flex-col gap-1 rounded-lg border border-border bg-surface p-1.5 shadow-hover">
          <div className="flex items-center justify-between px-3 pb-1 pt-2">
            <h2 className="text-sm font-medium">{isMail ? 'Messages' : 'Notifications'}{unread > 0 && <span className="ml-2 text-xs font-normal text-text-muted">{unread} new</span>}</h2>
            <button type="button" disabled={!unread} onClick={() => setItems([])} className="rounded-sm px-1.5 py-0.5 text-xs font-medium text-primary outline-none transition-colors duration-hover ease-out hover:bg-primary-soft focus-ring disabled:pointer-events-none disabled:text-text-muted">
              Mark all as read
            </button>
          </div>
          {items.length === 0 && (
            <div className="flex flex-col items-center gap-2 px-4 py-7 text-center">
              <span className="grid size-10 place-items-center rounded-full bg-primary-soft text-primary"><Inbox className="size-5" strokeWidth={1.75} /></span>
              <p className="text-sm font-medium leading-4.25">You&apos;re all caught up</p>
              <p className="text-compact leading-4 text-text-secondary">New {isMail ? 'messages' : 'notifications'} will show up here.</p>
            </div>
          )}
          {items.map((n, i) => (
            <NotificationItem key={n.id} item={n} tabIndex={i === 0 ? 0 : -1} itemRef={(el) => { refs.current[i] = el }} onKeyDown={onKeyDown(i)} onClick={() => setItems((l) => l.map((x) => (x.id === n.id ? { ...x, unread: false } : x)))} />
          ))}
        </div>
      </Popover>
    </>
  )
}

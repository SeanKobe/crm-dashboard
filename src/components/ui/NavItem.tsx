import type { Ref } from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import type { IconComponent, NavItemState } from '../../types'

// Figma "NavItem": Default / Hover (surface-subtle) / Active (surface-muted, purple icon) / Focus / Disabled.
// The sliding purple bar for the active item lives in the Sidebar so it can glide between items.
// When `collapsed`, the label fades out and the icon centres (Figma "Sidebar / Collapsed").
export interface NavItemProps {
  icon: IconComponent
  label: string
  /** Default, Active (current page) or Disabled. Hover and Focus are CSS states. */
  state?: NavItemState
  /** Shows the chevron on the right (Settings, Help Center). */
  trailing?: boolean
  collapsed?: boolean
  onClick?: () => void
  itemRef?: Ref<HTMLButtonElement>
}

export function NavItem({ icon: Icon, label, state = 'default', trailing = false, collapsed = false, onClick, itemRef }: NavItemProps) {
  const active = state === 'active'
  const disabled = state === 'disabled'
  return (
    <button
      ref={itemRef}
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? label : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        'group relative flex h-9 w-full items-center rounded-md text-left text-sm font-medium outline-none transition-[background-color,color,padding,gap] duration-hover ease-out motion-reduce:transition-none focus-ring',
        collapsed ? 'justify-center gap-0 px-0' : 'gap-3 px-3',
        disabled ? 'pointer-events-none text-text-muted' : active ? 'bg-surface-muted text-text-primary' : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary active:bg-surface-muted',
      )}
    >
      <Icon className={cn('size-5 shrink-0 transition-colors duration-hover ease-out motion-reduce:transition-none', disabled && 'opacity-50', active && 'text-primary')} strokeWidth={1.75} />
      <span className={cn('overflow-hidden whitespace-nowrap transition-[opacity,max-width,flex-grow] duration-move ease-out motion-reduce:transition-none', collapsed ? 'max-w-0 flex-none opacity-0' : 'max-w-48 flex-1 opacity-100')}>{label}</span>
      {trailing && <ChevronRight className={cn('size-5 shrink-0 transition-[transform,translate,scale,opacity] duration-hover ease-out group-hover:translate-x-0.5', collapsed && 'hidden')} strokeWidth={1.75} />}
    </button>
  )
}

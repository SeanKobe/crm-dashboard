import { cn } from '../../lib/cn'
import { Spinner } from './Spinner'
import type { IconButtonSize, IconButtonState, IconComponent, TriggerBinding } from '../../types'

// States come from the Figma "IconButton" set: Default / Hover / Pressed / Focus / Disabled / Loading.
// size: md 36 (header), sm 32 (card "more"), xs 28. `lift` adds a 1px hover lift; `pop` plays the badge bounce on mount.
const sizes: Record<IconButtonSize, string> = { lg: 'size-9.5', md: 'size-9', sm: 'size-8', xs: 'size-7' }

export interface IconButtonProps {
  icon: IconComponent
  /** Accessible name (the button has no visible text). */
  label: string
  badge?: string
  onClick?: () => void
  size?: IconButtonSize
  /** Default, Disabled or Loading. Hover, Pressed and Focus are CSS states. */
  state?: IconButtonState
  lift?: boolean
  pop?: boolean
  menuProps?: TriggerBinding<HTMLButtonElement>
  expanded?: boolean
}

export function IconButton({ icon: Icon, label, badge, onClick, size = 'md', state = 'default', lift = false, pop = false, menuProps, expanded }: IconButtonProps) {
  const loading = state === 'loading'
  const disabled = state === 'disabled'
  const off = disabled || loading
  return (
    <button
      type="button"
      ref={menuProps?.ref}
      aria-label={label}
      aria-haspopup={menuProps?.['aria-haspopup']}
      aria-expanded={menuProps ? menuProps['aria-expanded'] : expanded}
      aria-busy={loading || undefined}
      disabled={disabled}
      onKeyDown={menuProps?.onKeyDown}
      onClick={off ? undefined : (menuProps?.onClick ?? onClick)}
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-md border text-text-secondary outline-none transition-[background-color,border-color,box-shadow,transform,translate,scale] duration-hover ease-out motion-reduce:transition-none',
        'active:scale-[0.97] focus-ring',
        sizes[size],
        disabled
          ? 'pointer-events-none border-border bg-surface-muted opacity-100 shadow-none'
          : 'border-border bg-surface shadow-control hover:border-border-strong hover:bg-surface-subtle active:border-border-strong active:bg-surface-muted active:shadow-button aria-expanded:border-border-strong aria-expanded:bg-surface-muted',
        !disabled && lift && 'hover:-translate-y-px hover:shadow-button',
        loading && 'pointer-events-none',
      )}
    >
      {loading ? <Spinner size="S" tone="neutral" /> : <Icon className={cn('size-5', disabled && 'opacity-50')} strokeWidth={1.75} />}
      {badge && (
        <span className={cn('absolute -top-2 left-5 flex items-center justify-center rounded-full bg-danger-hover px-1.25 py-px text-2xs font-medium leading-3 text-danger-foreground', pop && 'animate-pop')}>
          {badge}
        </span>
      )}
    </button>
  )
}

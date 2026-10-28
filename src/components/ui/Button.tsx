import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Spinner } from './Spinner'
import type { ButtonState, ButtonVariant, IconComponent, SpinnerTone, TriggerBinding } from '../../types'

// States come from the Figma "Button" set. Secondary: Default / Hover (surface-subtle, border-strong) / Active (surface-muted) /
// Focus / Disabled / Loading. Primary: primary / primary-hover / primary-pressed. Press also scales to 0.97.
const variants: Record<ButtonVariant, { shell: string; icon: string; divider: string; spinner: SpinnerTone }> = {
  secondary: {
    shell: 'border border-border bg-surface text-text-primary shadow-button hover:border-border-strong hover:bg-surface-subtle active:border-border-strong active:bg-surface-muted has-[:focus-visible]:border-primary',
    icon: 'text-text-secondary', divider: 'border-border', spinner: 'neutral',
  },
  primary: {
    shell: 'bg-primary text-primary-foreground shadow-button hover:bg-primary-hover active:bg-primary-pressed',
    icon: 'text-primary-foreground', divider: 'border-primary-foreground/30', spinner: 'inverse',
  },
  destructive: {
    shell: 'bg-danger text-danger-foreground shadow-button hover:bg-danger-hover active:bg-danger-pressed',
    icon: 'text-danger-foreground', divider: 'border-danger-foreground/30', spinner: 'inverse',
  },
}

export interface ButtonProps {
  variant?: ButtonVariant
  /** Default, Disabled or Loading. Hover, Pressed and Focus are CSS states. */
  state?: ButtonState
  icon?: IconComponent
  /** The label (also names the chevron button for assistive tech). */
  children: string
  /** Split button: adds a chevron half. */
  chevron?: boolean
  onClick?: () => void
  onChevronClick?: () => void
  /** Destructive only: starts from the hover shade so white text reaches 4.5:1 (used where the page must meet that bar). */
  strong?: boolean
  /** Spread from `Menu`'s trigger renderer to make this button open a menu. */
  menuProps?: TriggerBinding<HTMLDivElement>
  className?: string
  /** Renders as the form's submit button (Enter in a field then submits the form). */
  submit?: boolean
  /** Stretches to the width of its container. */
  fullWidth?: boolean
}

export function Button({ variant = 'secondary', state = 'default', icon: Icon, children, chevron = false, strong = false, onClick, onChevronClick, menuProps, className, submit = false, fullWidth = false }: ButtonProps) {
  const v = strong && variant === 'destructive' ? { ...variants.destructive, shell: 'bg-danger-hover text-danger-foreground shadow-button hover:bg-danger-pressed active:bg-danger-pressed' } : variants[variant]
  const loading = state === 'loading'
  const disabled = state === 'disabled'
  const off = disabled || loading
  const click = menuProps?.onClick ?? onClick
  const chevronClick = menuProps?.onClick ?? onChevronClick
  return (
    <div
      ref={menuProps?.ref}
      onKeyDown={menuProps?.onKeyDown}
      aria-busy={loading || undefined}
      className={cn(
        'flex h-10 items-center rounded-md transition-[background-color,border-color,box-shadow,transform,translate,scale,color] duration-hover ease-out motion-reduce:transition-none',
        'active:scale-[0.97] has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-focus-ring',
        disabled ? 'pointer-events-none border border-border bg-surface-muted text-text-muted shadow-none' : v.shell,
        loading && 'pointer-events-none',
        fullWidth && 'w-full',
        className,
      )}
    >
      <button
        type={submit ? 'submit' : 'button'}
        disabled={disabled}
        onClick={off ? undefined : click}
        aria-haspopup={menuProps?.['aria-haspopup']}
        aria-expanded={menuProps?.['aria-expanded']}
        className={cn('flex h-full items-center gap-2 rounded-md px-[9px] text-sm font-medium outline-none', fullWidth && 'flex-1 justify-center')}
      >
        {loading ? <Spinner size="S" tone={v.spinner} /> : Icon && <Icon className={cn('size-5', disabled ? 'text-text-muted' : v.icon)} strokeWidth={1.75} />}
        <span className={cn(loading && 'opacity-80')}>{children}</span>
      </button>
      {chevron && (
        <button
          type="button"
          disabled={disabled}
          aria-label={`${children} options`}
          aria-haspopup={menuProps?.['aria-haspopup']}
          aria-expanded={menuProps?.['aria-expanded']}
          onClick={off ? undefined : chevronClick}
          className={cn('flex h-full items-center rounded-r-md border-l px-2 outline-none', disabled ? 'border-border text-text-muted' : cn(v.divider, v.icon))}
        >
          <ChevronDown className="size-4" strokeWidth={1.75} />
        </button>
      )}
    </div>
  )
}

import { cn } from '../../lib/cn'

// Figma "Toggle": 36x20 track, 16px thumb. Off border-strong, On primary; Hover and Pressed darken; Focus ring; Disabled.
export interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
}

/** The switch graphic alone (Figma Toggle track 36x20, thumb 16). Used inside menu rows, where the whole row is the button. */
export function ToggleTrack({ checked, className }: { checked: boolean; className?: string }) {
  return (
    <span aria-hidden className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors duration-hover ease-out motion-reduce:transition-none', checked ? 'bg-primary' : 'bg-border-strong', className)}>
      <span className={cn('absolute left-0.5 top-0.5 size-4 rounded-full bg-surface shadow-control transition-[transform,translate] duration-hover ease-out motion-reduce:transition-none', checked && 'translate-x-4')} />
    </span>
  )
}

export function Toggle({ checked, onChange, label, disabled = false }: ToggleProps) {
  return (
    <label className={cn('flex items-center gap-2 text-sm', disabled && 'text-text-muted')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full outline-none transition-colors duration-hover ease-out focus-visible:ring-[3px] focus-visible:ring-focus-ring',
          checked ? 'bg-primary hover:bg-primary-hover active:bg-primary-pressed' : 'bg-border-strong hover:bg-text-muted active:bg-text-secondary',
          disabled && 'pointer-events-none bg-border',
        )}
      >
        <span className={cn('absolute left-0.5 top-0.5 size-4 rounded-full bg-surface shadow-control transition-[transform,translate] duration-hover ease-out', checked && 'translate-x-4')} />
      </button>
      {label}
    </label>
  )
}

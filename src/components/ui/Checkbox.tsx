import { useEffect, useRef } from 'react'
import { Check, Minus } from 'lucide-react'
import { cn } from '../../lib/cn'

// Figma "Checkbox": 18px box, 4px radius. Checked: Yes / No / Mixed. Hover, Pressed and Focus are CSS states.
export interface CheckboxProps {
  checked: boolean
  mixed?: boolean
  onChange: (checked: boolean) => void
  /** Accessible name when there is no visible label. */
  label: string
  disabled?: boolean
  /** -1 keeps the box out of the tab order (rows that toggle with Space). */
  tabIndex?: number
  className?: string
}

export function Checkbox({ checked, mixed = false, onChange, label, disabled, tabIndex, className }: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { if (ref.current) ref.current.indeterminate = mixed }, [mixed])
  const on = checked || mixed
  return (
    <span className={cn('relative inline-flex size-4.5 shrink-0', className)}>
      <input
        ref={ref}
        type="checkbox"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        tabIndex={tabIndex}
        onChange={(e) => onChange(e.target.checked)}
        onClick={(e) => e.stopPropagation()}
        className="peer absolute inset-0 z-10 m-0 size-full cursor-pointer appearance-none rounded-xs opacity-0 disabled:cursor-not-allowed"
      />
      <span
        aria-hidden
        className={cn(
          'grid size-full place-items-center rounded-xs border transition-[background-color,border-color,box-shadow,transform,translate,scale] duration-hover ease-out motion-reduce:transition-none',
          'peer-active:scale-95 peer-focus-visible:border-primary peer-focus-visible:ring-[3px] peer-focus-visible:ring-focus-ring',
          on ? 'border-primary bg-primary text-primary-foreground peer-hover:bg-primary-hover' : 'border-border-strong bg-surface peer-hover:border-primary',
          disabled && 'opacity-50',
        )}
      >
        {mixed ? <Minus className="size-3.5" strokeWidth={2.25} /> : checked ? <Check className="size-3.5" strokeWidth={2.25} /> : null}
      </span>
    </span>
  )
}

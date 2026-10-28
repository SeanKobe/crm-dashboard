import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Popover } from './Menu'
import { FieldFrame } from './TextField'
import { fieldShell } from './fieldStyles'
import { cn } from '../../lib/cn'

// Figma "Select": field with a chevron; the Open state is a menu panel (4px padding, 36px options, selected = primary-soft + check).
export interface SelectOption<T extends string> {
  value: T
  label: string
  /** Rendered before the label (avatar, status dot…). */
  leading?: ReactNode
  disabled?: boolean
}

export interface SelectProps<T extends string> {
  label: string
  value: T | ''
  options: readonly SelectOption<T>[]
  onChange: (value: T) => void
  placeholder?: string
  error?: string | null
  helper?: string
  required?: boolean
  disabled?: boolean
  hideLabel?: boolean
  autoFocus?: boolean
  className?: string
  /** Fires when the menu closes without a choice, so callers can mark the field as touched. */
  onClose?: () => void
}

export function Select<T extends string>({ label, value, options, onChange, placeholder = 'Select…', error, helper, required, disabled, hideLabel, autoFocus, className, onClose }: SelectProps<T>) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null)
  const anchorRef = useMemo<RefObject<HTMLElement | null>>(() => ({ current: trigger }), [trigger])
  const current = options.find((o) => o.value === value)

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false)
    if (restoreFocus) trigger?.focus({ preventScroll: true })
    onClose?.()
  }, [trigger, onClose])
  const choose = (o: SelectOption<T>) => { if (o.disabled) return; onChange(o.value); close(true) }

  const onTriggerKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setOpen(true) }
  }

  return (
    <FieldFrame label={label} id={id} error={error} helper={helper} required={required} hideLabel={hideLabel} className={className}>
      <button
        ref={setTrigger}
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || helper ? `${id}-msg` : undefined}
        disabled={disabled}
        data-autofocus={autoFocus ? '' : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKey}
        className={cn(fieldShell(Boolean(error), disabled), 'h-10 text-left text-sm outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-focus-ring', open && 'border-primary ring-[3px] ring-focus-ring')}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {current?.leading}
          <span className={cn('truncate', !current && 'text-text-secondary')}>{current?.label ?? placeholder}</span>
        </span>
        <ChevronDown aria-hidden className={cn('size-5 shrink-0 text-text-secondary transition-[transform,translate,rotate] duration-hover ease-out motion-reduce:transition-none', open && 'rotate-180')} strokeWidth={1.75} />
      </button>
      <Popover open={open} onClose={close} anchorRef={anchorRef} matchWidth offset={4}>
        <Listbox id={`${id}-list`} label={label} options={options} value={value} open={open} onChoose={choose} onClose={close} />
      </Popover>
    </FieldFrame>
  )
}

interface ListboxProps<T extends string> {
  id: string
  label: string
  options: readonly SelectOption<T>[]
  value: T | ''
  open: boolean
  onChoose: (o: SelectOption<T>) => void
  onClose: (restoreFocus: boolean) => void
}

function Listbox<T extends string>({ id, label, options, value, open, onChoose, onClose }: ListboxProps<T>) {
  const ref = useRef<HTMLDivElement>(null)
  const typed = useRef({ text: '', t: 0 })
  const enabled = options.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0)
  const [active, setActive] = useState(() => Math.max(0, options.findIndex((o) => o.value === value)))

  useEffect(() => {
    if (!open) return undefined
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    const t = setTimeout(() => ref.current?.focus({ preventScroll: true }), 0)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const step = (dir: number) => {
    const pos = enabled.indexOf(active)
    setActive(enabled[(pos + dir + enabled.length) % enabled.length])
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); step(1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); step(-1) }
    else if (e.key === 'Home') { e.preventDefault(); setActive(enabled[0]) }
    else if (e.key === 'End') { e.preventDefault(); setActive(enabled[enabled.length - 1]) }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChoose(options[active]) }
    else if (e.key === 'Tab') onClose(true)
    else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
      const now = Date.now()
      typed.current.text = (now - typed.current.t > 600 ? '' : typed.current.text) + e.key.toLowerCase()
      typed.current.t = now
      const hit = enabled.find((i) => options[i].label.toLowerCase().startsWith(typed.current.text))
      if (hit !== undefined) setActive(hit)
    }
  }
  return (
    <div
      ref={ref}
      id={id}
      role="listbox"
      aria-label={label}
      tabIndex={-1}
      aria-activedescendant={`${id}-${active}`}
      onKeyDown={onKeyDown}
      className="flex max-h-72 flex-col gap-0.5 overflow-auto rounded-lg border border-border bg-surface p-1 shadow-hover outline-none"
    >
      {options.map((o, i) => {
        const selected = o.value === value
        return (
          <div
            key={o.value}
            id={`${id}-${i}`}
            role="option"
            aria-selected={selected}
            aria-disabled={o.disabled || undefined}
            onClick={() => onChoose(o)}
            onMouseEnter={() => !o.disabled && setActive(i)}
            className={cn(
              'flex h-9 cursor-pointer items-center gap-2 rounded-md px-3 text-sm transition-colors duration-hover ease-out motion-reduce:transition-none',
              o.disabled ? 'cursor-not-allowed text-text-muted' : selected ? 'font-medium text-primary' : 'text-text-primary',
              !o.disabled && (selected ? 'bg-primary-soft' : i === active && 'bg-surface-subtle'),
              i === active && !o.disabled && 'ring-[1.5px] ring-inset ring-primary',
            )}
          >
            {o.leading}
            <span className="flex-1 truncate">{o.label}</span>
            {selected && <Check aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />}
          </div>
        )
      })}
    </div>
  )
}

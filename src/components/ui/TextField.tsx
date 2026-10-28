import { useId, type ChangeEventHandler, type FocusEventHandler, type KeyboardEventHandler, type ReactNode, type Ref } from 'react'
import { CircleX } from 'lucide-react'
import { cn } from '../../lib/cn'
import { fieldShell, inputBase } from './fieldStyles'

// Figma "Text Field": 13px medium label, 40px field (8px radius), 12px helper. States: Default / Hover / Focus / Filled / Disabled / Error.
export interface FieldFrameProps {
  label: string
  id: string
  helper?: string
  error?: string | null
  required?: boolean
  hideLabel?: boolean
  children: ReactNode
  className?: string
}

export function FieldFrame({ label, id, helper, error, required, hideLabel, children, className }: FieldFrameProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label htmlFor={id} className={cn('text-compact font-medium leading-4', hideLabel && 'sr-only')}>
        {label}
        {required && <span aria-hidden className="ml-0.5 text-danger-strong">*</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="text-xs leading-3.75 text-danger-strong">{error}</p>
      ) : helper ? (
        <p id={`${id}-msg`} className="text-xs leading-3.75 text-text-secondary">{helper}</p>
      ) : null}
    </div>
  )
}

// A row of fields that share the width equally and can never push past the container (min-w-0 columns).
export function FieldRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-flow-col auto-cols-[minmax(0,1fr)] gap-3', className)}>{children}</div>
}

export interface TextFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  helper?: string
  error?: string | null
  /** Red border without a message (the message is shown elsewhere). */
  invalid?: boolean
  required?: boolean
  disabled?: boolean
  multiline?: boolean
  rows?: number
  /** Text shown before the value, for example "$". */
  prefix?: string
  inputMode?: 'text' | 'numeric' | 'decimal'
  autoFocus?: boolean
  hideLabel?: boolean
  maxLength?: number
  onBlur?: FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>
  onKeyDown?: KeyboardEventHandler<HTMLInputElement | HTMLTextAreaElement>
  inputRef?: Ref<HTMLInputElement & HTMLTextAreaElement>
  className?: string
  /** Extra data attribute so tests and focus management can find the field. */
  name?: string
}

export function TextField({ label, value, onChange, placeholder, helper, error, invalid, required, disabled, multiline, rows = 4, prefix, inputMode, autoFocus, hideLabel, maxLength, onBlur, onKeyDown, inputRef, className, name }: TextFieldProps) {
  const id = useId()
  const change: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement> = (e) => onChange(e.target.value)
  const common = {
    id,
    name,
    value,
    onChange: change,
    onBlur,
    onKeyDown,
    placeholder,
    disabled,
    maxLength,
    'data-autofocus': autoFocus ? '' : undefined,
    'aria-invalid': error || invalid ? true : undefined,
    'aria-required': required || undefined,
    'aria-describedby': error || helper ? `${id}-msg` : undefined,
    className: cn(inputBase, multiline && 'resize-none py-2.5 leading-4.25'),
  }
  return (
    <FieldFrame label={label} id={id} helper={helper} error={error} required={required} hideLabel={hideLabel} className={className}>
      <div className={cn(fieldShell(Boolean(error) || Boolean(invalid), disabled), multiline ? 'items-start' : 'h-10')}>
        {prefix && <span aria-hidden className="text-sm text-text-secondary">{prefix}</span>}
        {multiline ? <textarea ref={inputRef} rows={rows} {...common} /> : <input ref={inputRef} type="text" inputMode={inputMode} {...common} />}
        {error && !multiline && <CircleX className="size-5 shrink-0 text-danger-strong" strokeWidth={1.75} aria-hidden />}
      </div>
    </FieldFrame>
  )
}

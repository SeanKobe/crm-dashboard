import { useId } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '../../lib/cn'
import { FieldFrame } from './TextField'
import { fieldShell, inputBase } from './fieldStyles'

// Time input in the Text Field style (clock icon + the browser's native time control).
export interface TimeFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string | null
  invalid?: boolean
  disabled?: boolean
  hideLabel?: boolean
  className?: string
}

export function TimeField({ label, value, onChange, error, invalid, disabled, hideLabel, className }: TimeFieldProps) {
  const id = useId()
  return (
    <FieldFrame label={label} id={id} error={error} hideLabel={hideLabel} className={className}>
      <div className={cn(fieldShell(Boolean(error) || Boolean(invalid), disabled), 'h-10')}>
        <Clock aria-hidden className="size-5 shrink-0 text-text-secondary" strokeWidth={1.75} />
        <input id={id} type="time" step={900} value={value} disabled={disabled} aria-invalid={error || invalid ? true : undefined} aria-describedby={error ? `${id}-msg` : undefined} onChange={(e) => onChange(e.target.value)} className={cn(inputBase, 'tabular-nums')} />
      </div>
    </FieldFrame>
  )
}

import { useCallback, useId, useMemo, useRef, useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { FieldFrame } from './TextField'
import { fieldShell, inputBase } from './fieldStyles'
import { CalendarDay } from './CalendarDay'
import { IconButton } from './IconButton'
import { Popover } from './Menu'
import { cn } from '../../lib/cn'
import { DEMO_TODAY, maskDate, parseDisplayDate, toDisplayDate } from '../../lib/dates'
import { addMonths, longDate, monthGrid, monthName, sameMonth } from '../../lib/calendarLogic'

// Figma "Date Picker Field": calendar icon + value. The field is a masked text input that starts empty with an "mm/dd/yyyy"
// placeholder (a native date input shows the real current date when empty in some browsers, and the app's "today" is fixed).
// The calendar button opens the app's own month picker, which highlights the fixed today.
export interface DateFieldProps {
  label: string
  /** "2025-10-20", or "" when nothing is chosen. */
  value: string
  onChange: (value: string) => void
  error?: string | null
  /** Red border without a message (the message is shown elsewhere, for example under a From/To pair). */
  invalid?: boolean
  helper?: string
  required?: boolean
  /** Days before this date can't be picked from the calendar. */
  min?: string
  /** Days after this date can't be picked from the calendar. */
  max?: string
  hideLabel?: boolean
  className?: string
  /** What a half-typed date tells the parent: "clear" (default, for forms and filters, so they never hold a stale date) or "ignore" (fields that save as you type: only a complete date or an emptied field is reported). */
  partial?: 'clear' | 'ignore'
}

export const DATE_PLACEHOLDER = 'mm/dd/yyyy'

function MonthPicker({ value, min, max, onPick }: { value: string; min?: string; max?: string; onPick: (day: string) => void }) {
  const [shown, setShown] = useState(value || DEMO_TODAY)
  const days = monthGrid(shown)
  const ref = useRef<HTMLDivElement>(null)
  const move = (e: React.KeyboardEvent) => {
    const keys: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    const step = keys[e.key]
    if (step === undefined) return
    const cells = [...(ref.current?.querySelectorAll<HTMLButtonElement>('button[data-pick-day]') ?? [])]
    const i = cells.indexOf(document.activeElement as HTMLButtonElement)
    if (i < 0) return
    e.preventDefault()
    const next = cells[i + step]
    if (next) next.focus()
  }
  return (
    <div className="flex w-72 flex-col gap-2 rounded-lg border border-border bg-surface p-3 shadow-hover" data-date-picker>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium" aria-live="polite">{monthName(shown)} {shown.slice(0, 4)}</h3>
        <span className="flex gap-1">
          <IconButton icon={ChevronLeft} label="Previous month" size="xs" onClick={() => setShown(addMonths(shown, -1))} />
          <IconButton icon={ChevronRight} label="Next month" size="xs" onClick={() => setShown(addMonths(shown, 1))} />
        </span>
      </div>
      <div ref={ref} onKeyDown={move} className="grid grid-cols-7 place-items-center gap-y-0.5" role="grid" aria-label={`${monthName(shown)} ${shown.slice(0, 4)}`}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((h, i) => <span key={i} aria-hidden className="grid size-8 place-items-center text-xs font-medium text-text-secondary">{h}</span>)}
        {days.map((d) => {
          const off = Boolean((min && d < min) || (max && d > max))
          return (
            <span key={d} role="gridcell" className={cn('grid place-items-center', off && 'opacity-40')}>
              <CalendarDay size="sm" day={Number(d.slice(8))} today={d === DEMO_TODAY} selected={d === value && d !== DEMO_TODAY} muted={!sameMonth(d, shown)} label={`${longDate(d)}${off ? ' (not available)' : ''}`} dataDay={d} disabled={off} onClick={() => onPick(d)} />
            </span>
          )
        })}
      </div>
    </div>
  )
}

export function DateField({ label, value, onChange, error, invalid, helper, required, min, max, hideLabel, className, partial = 'clear' }: DateFieldProps) {
  const id = useId()
  const [text, setText] = useState(toDisplayDate(value))
  const [touched, setTouched] = useState(false)
  const [open, setOpen] = useState(false)
  const [shell, setShell] = useState<HTMLDivElement | null>(null)
  const anchorRef = useMemo(() => ({ current: shell }), [shell])
  const input = useRef<HTMLInputElement>(null)
  // Follow the value when it changes from outside (quick ranges, Clear), but keep a half-typed date as it is.
  const [seen, setSeen] = useState(value)
  if (seen !== value) { setSeen(value); if ((parseDisplayDate(text) ?? '') !== value) setText(toDisplayDate(value)) }
  const parsed = parseDisplayDate(text)
  const incomplete = text.length > 0 && parsed === null
  const own = touched && incomplete ? (text.length < 10 ? 'Enter the date as mm/dd/yyyy.' : 'That isn’t a real date. Use mm/dd/yyyy.') : null
  const shown = error ?? own
  const type = (raw: string) => {
    const next = maskDate(raw)
    setText(next)
    const iso = parseDisplayDate(next)
    if (iso !== null) onChange(iso)
    else if (next === '' || partial === 'clear') onChange('')
  }
  const close = useCallback((restore: boolean) => { setOpen(false); if (restore) input.current?.focus({ preventScroll: true }) }, [])
  return (
    <FieldFrame label={label} id={id} error={shown} helper={helper} required={required} hideLabel={hideLabel} className={className}>
      <div ref={setShell} className={cn(fieldShell(Boolean(shown) || Boolean(invalid)), 'h-10')}>
        <button
          type="button"
          aria-label={`Choose ${label.toLowerCase()} date from a calendar`}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="-ml-1 grid size-7 shrink-0 place-items-center rounded-sm text-text-secondary outline-none transition-colors duration-hover ease-out hover:bg-surface-muted hover:text-text-primary focus-ring motion-reduce:transition-none"
        >
          <Calendar aria-hidden className="size-5" strokeWidth={1.75} />
        </button>
        <input
          ref={input}
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={DATE_PLACEHOLDER}
          maxLength={10}
          value={text}
          aria-invalid={shown || invalid ? true : undefined}
          aria-describedby={shown || helper ? `${id}-msg` : undefined}
          onChange={(e) => type(e.target.value)}
          onBlur={() => setTouched(true)}
          className={inputBase}
        />
      </div>
      <Popover open={open} onClose={close} anchorRef={anchorRef} role="dialog" label={`${label} calendar`}>
        <MonthPicker value={value} min={min} max={max} onPick={(d) => { setText(toDisplayDate(d)); onChange(d); setOpen(false); input.current?.focus({ preventScroll: true }) }} />
      </Popover>
    </FieldFrame>
  )
}

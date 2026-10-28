import { Eye, EyeOff } from 'lucide-react'
import { useId, useState, type Ref } from 'react'
import { cn } from '../../lib/cn'
import { fieldShell, inputBase } from '../ui/fieldStyles'
import { FieldFrame } from '../ui/TextField'

// A labelled text field for the sign-in screens: the app's field look (FieldFrame + field shell) plus what a sign-in form needs and
// TextField doesn't have: the input type, the autocomplete hint, and a show / hide button for passwords.
export interface AuthFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  type?: 'text' | 'email' | 'password'
  autoComplete: 'email' | 'current-password' | 'new-password' | 'name'
  name: string
  helper?: string
  error?: string | null
  placeholder?: string
  inputRef?: Ref<HTMLInputElement>
  autoFocus?: boolean
}

export function AuthField({ label, value, onChange, onBlur, type = 'text', autoComplete, name, helper, error, placeholder, inputRef, autoFocus }: AuthFieldProps) {
  const id = useId()
  const [shown, setShown] = useState(false)
  const isPassword = type === 'password'
  // A message line is always reserved (a non-breaking space when there is none), so showing an error never moves the controls below it:
  // a click on a link or button that began before the field lost focus still lands.
  return (
    <FieldFrame label={label} id={id} helper={helper ?? '\u00a0'} error={error}>
      <div className={cn(fieldShell(Boolean(error)), 'h-10')}>
        <input
          ref={inputRef}
          id={id}
          name={name}
          type={isPassword && shown ? 'text' : type}
          value={value}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck={false}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-invalid={error ? true : undefined}
          aria-describedby={error || helper ? `${id}-msg` : undefined}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={inputBase}
        />
        {isPassword && (
          <button
            type="button"
            aria-label={shown ? 'Hide password' : 'Show password'}
            aria-pressed={shown}
            onClick={() => setShown((s) => !s)}
            className="-mr-1 grid size-7 shrink-0 place-items-center rounded-sm text-text-secondary outline-none transition-colors duration-hover ease-out hover:bg-surface-muted hover:text-text-primary focus-ring motion-reduce:transition-none"
          >
            {shown ? <EyeOff aria-hidden className="size-5" strokeWidth={1.75} /> : <Eye aria-hidden className="size-5" strokeWidth={1.75} />}
          </button>
        )}
      </div>
    </FieldFrame>
  )
}

import { useId, type KeyboardEvent, type Ref } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '../../lib/cn'

// Figma "SearchField" (Default / Hover / Focus): 40px field, search icon, clear button when there is text. Escape clears.
export interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label: string
  className?: string
  inputRef?: Ref<HTMLInputElement>
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
}

export function SearchInput({ value, onChange, placeholder = 'Search', label, className, inputRef, onKeyDown: onKey }: SearchInputProps) {
  const id = useId()
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    onKey?.(e)
    if (e.defaultPrevented) return
    if (e.key === 'Escape' && value) { e.preventDefault(); onChange('') }
  }
  return (
    <div className={cn('flex h-10 items-center gap-2.5 rounded-md border border-border bg-surface px-3 shadow-button transition-[border-color,box-shadow] duration-hover ease-out hover:border-border-strong focus-within:border-primary focus-within:ring-[3px] focus-within:ring-focus-ring motion-reduce:transition-none', className)}>
      <Search aria-hidden className="size-5 shrink-0 text-text-secondary" strokeWidth={1.75} />
      <input ref={inputRef} id={id} type="text" role="searchbox" aria-label={label} autoComplete="off" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-text-secondary" />
      {value && (
        <button type="button" aria-label="Clear search" onClick={() => onChange('')} className="grid size-5 shrink-0 place-items-center rounded-xs text-text-secondary outline-none transition-colors duration-hover ease-out hover:text-text-primary focus-ring motion-reduce:transition-none">
          <X className="size-4" strokeWidth={1.75} />
        </button>
      )}
    </div>
  )
}

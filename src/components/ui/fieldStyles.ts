import { cn } from '../../lib/cn'

export const fieldShell = (error: boolean, disabled?: boolean) =>
  cn(
    'flex w-full min-w-0 items-center gap-2 rounded-md border bg-surface px-3 transition-[border-color,box-shadow,outline-color] duration-hover ease-out motion-reduce:transition-none',
    error ? 'border-danger' : 'border-border hover:border-border-strong',
    'focus-within:border-primary focus-within:ring-[3px] focus-within:ring-focus-ring',
    error && 'focus-within:border-danger focus-within:ring-danger/25',
    disabled && 'pointer-events-none bg-surface-muted text-text-muted',
  )

export const inputBase = 'min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary disabled:cursor-not-allowed'


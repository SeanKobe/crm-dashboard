import { ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Badge } from './Badge'
import { Popover } from './Menu'

// Filter trigger that opens a small panel (same look as the Deals toolbar filters). `compact` is 32px tall for narrow panes.
export interface FilterButtonProps {
  label: string
  count: number
  children: ReactNode
  compact?: boolean
  width?: string
}

function PanelBody({ children, width }: { children: ReactNode; width: string }) {
  const ref = useRef<HTMLDivElement>(null)
  // The popover is hidden until it has been placed, so focus moves in on the next frame.
  useEffect(() => {
    const id = requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>('input, button')?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(id)
  }, [])
  return <div ref={ref} className={cn('flex max-w-[calc(100vw-1rem)] flex-col gap-1 rounded-lg border border-border bg-surface p-3 shadow-hover', width)}>{children}</div>
}

export function FilterButton({ label, count, children, compact = false, width = 'w-64' }: FilterButtonProps) {
  const [open, setOpen] = useState(false)
  const [el, setEl] = useState<HTMLButtonElement | null>(null)
  const anchorRef = useMemo(() => ({ current: el }), [el])
  const close = useCallback((restore: boolean) => { setOpen(false); if (restore) el?.focus({ preventScroll: true }) }, [el])
  return (
    <>
      <button
        ref={setEl}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center rounded-md border font-medium shadow-button outline-none transition-[background-color,border-color,box-shadow] duration-hover ease-out motion-reduce:transition-none focus-ring',
          compact ? 'h-8 gap-1.5 px-2.5 text-compact' : 'h-10 gap-2 px-3 text-sm',
          count ? 'border-primary text-primary' : 'border-border text-text-primary hover:border-border-strong',
          open ? 'bg-surface-muted' : 'bg-surface hover:bg-surface-subtle',
        )}
      >
        {label}
        {count > 0 && <Badge tone="primary">{count}</Badge>}
        <ChevronDown aria-hidden className={cn('size-4 text-text-secondary transition-[transform,translate,rotate] duration-hover ease-out motion-reduce:transition-none', open && 'rotate-180')} strokeWidth={1.75} />
      </button>
      <Popover open={open} onClose={close} anchorRef={anchorRef} role="dialog" label={`${label} filter`}>
        <PanelBody width={width}>{children}</PanelBody>
      </Popover>
    </>
  )
}

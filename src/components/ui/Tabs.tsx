import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Badge } from './Badge'
import { panelId, tabId } from './tabIds'

// Figma "Tab" / "Tabs": 37px tabs (10/12 padding, 6px radius), selected = primary label + 2px underline, a rule under the row, optional count.
// Roving tabindex, arrow keys / Home / End, aria-controls to the panel.
export interface TabItem<T extends string> {
  id: T
  label: string
  count?: number
  /** Extra control shown after the label (e.g. a remove button for saved views). */
  trailing?: ReactNode
}

export interface TabsProps<T extends string> {
  tabs: readonly TabItem<T>[]
  value: T | null
  onChange: (id: T) => void
  label: string
  /** Prefix for tab and panel ids. */
  idBase: string
  className?: string
}

export function Tabs<T extends string>({ tabs, value, onChange, label, idBase, className }: TabsProps<T>) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  const focusable = value ?? tabs[0]?.id
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const to = e.key === 'ArrowRight' ? (i + 1) % tabs.length : e.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1
    if (to < 0) return
    e.preventDefault()
    refs.current[tabs[to].id]?.focus()
    onChange(tabs[to].id)
  }
  return (
    <div role="tablist" aria-label={label} className={cn('flex items-end gap-1 overflow-x-auto border-b border-border', className)}>
      {tabs.map((t, i) => {
        const on = t.id === value
        return (
          <div key={t.id} className="relative flex shrink-0 items-center">
            <button
              ref={(el) => { refs.current[t.id] = el }}
              id={tabId(idBase, t.id)}
              type="button"
              role="tab"
              aria-selected={on}
              aria-controls={panelId(idBase, t.id)}
              tabIndex={t.id === focusable ? 0 : -1}
              onClick={() => onChange(t.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                'flex h-9.25 items-center gap-1.5 rounded-sm px-3 text-sm font-medium outline-none transition-colors duration-hover ease-out focus-ring motion-reduce:transition-none',
                on ? 'text-primary' : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary',
              )}
            >
              {t.label}
              {t.count !== undefined && <Badge>{t.count}</Badge>}
            </button>
            {t.trailing}
            {on && <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />}
          </div>
        )
      })}
    </div>
  )
}

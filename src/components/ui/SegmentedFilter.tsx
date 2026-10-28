import { useLayoutEffect, useRef, useState, type KeyboardEventHandler, type Ref } from 'react'
import { cn } from '../../lib/cn'
import { Tooltip } from './Tooltip'

// Figma SegmentedFilter / SegmentedTabs: the active pill (surface + shadow-segment) slides between options.
export interface SegmentedItemProps {
  label: string
  active: boolean
  fill?: boolean
  /** `strong` keeps inactive labels at 4.5:1 (text-secondary instead of text-muted). */
  tone?: 'default' | 'strong'
  onClick?: () => void
  itemRef?: Ref<HTMLButtonElement>
  onKeyDown?: KeyboardEventHandler<HTMLButtonElement>
}

export function SegmentedItem({ label, active, fill = false, tone = 'default', onClick, itemRef, onKeyDown }: SegmentedItemProps) {
  return (
    <button
      ref={itemRef}
      type="button"
      role="tab"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={cn(
        'relative z-10 rounded-sm px-3 py-1.5 text-xs font-medium leading-3.75 outline-none transition-colors duration-hover ease-out motion-reduce:transition-none focus-ring',
        fill && 'flex-1',
        active ? 'text-text-primary' : tone === 'strong' ? 'text-text-secondary hover:text-text-primary' : 'text-text-muted hover:text-text-secondary',
      )}
    >
      {label}
    </button>
  )
}

export interface SegmentedFilterProps<T extends string> {
  options: readonly T[]
  value: T
  onChange: (value: T) => void
  /** Stretch to the full width with equal-width options (SegmentedTabs). */
  fill?: boolean
  /** Accessible name of the tab list. */
  label?: string
  tone?: 'default' | 'strong'
  /** Tooltip text per option (for example a keyboard shortcut). */
  hints?: Partial<Record<T, string>>
}

export function SegmentedFilter<T extends string>({ options, value, onChange, fill = false, label, tone = 'default', hints }: SegmentedFilterProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const root = useRef<HTMLDivElement>(null)
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null)
  const index = options.indexOf(value)

  useLayoutEffect(() => {
    const measure = () => { const el = refs.current[index]; if (el) setPill({ x: el.offsetLeft, w: el.offsetWidth }) }
    measure()
    const ro = new ResizeObserver(measure)
    if (root.current) ro.observe(root.current)
    return () => ro.disconnect()
  }, [index, options.length])

  const onKeyDown: KeyboardEventHandler<HTMLButtonElement> = (e) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!d) return
    e.preventDefault()
    const next = (index + d + options.length) % options.length
    onChange(options[next])
    refs.current[next]?.focus()
  }
  return (
    <div ref={root} role="tablist" aria-label={label} className={cn('relative gap-0.5 rounded-md bg-surface-subtle p-1', fill ? 'flex w-full' : 'inline-flex')}>
      {pill && (
        <span aria-hidden className="absolute bottom-1 left-0 top-1 rounded-sm bg-surface shadow-segment transition-[transform,translate,scale,width] duration-move ease-out motion-reduce:transition-none" style={{ width: pill.w, transform: `translateX(${pill.x}px)` }} />
      )}
      {options.map((option, i) => {
        const item = <SegmentedItem key={option} label={option} fill={fill} tone={tone} active={option === value} itemRef={(el) => { refs.current[i] = el }} onKeyDown={onKeyDown} onClick={() => onChange(option)} />
        const hint = hints?.[option]
        return hint ? <Tooltip key={option} content={hint}>{(tip) => <span {...tip} className="inline-flex">{item}</span>}</Tooltip> : item
      })}
    </div>
  )
}

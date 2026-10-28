import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode, type Ref, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Check } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Avatar } from './Avatar'
import { ToggleTrack } from './Toggle'
import type { MenuAction, MenuEntry, MenuTriggerProps } from '../../types'

const MARGIN = 8
/** Popovers are never narrower than this (and never wider than the viewport minus the margins); inside that range they size to their content. */
const MIN_WIDTH = 160
// Open popovers, oldest first. A popover opened from inside another one (a date calendar in a filter) is "above" it:
// clicks inside the upper one don't close the lower one, and Escape closes only the top one.
const openStack: HTMLElement[] = []

// Animated, portaled popover anchored to an element. Closes on outside click and Escape.
// It stays mounted until the exit transition has finished, then unmounts.
export interface PopoverProps {
  open: boolean
  /** Called with `true` when focus should return to the trigger (Escape), `false` for an outside click. */
  onClose: (restoreFocus: boolean) => void
  anchorRef: RefObject<HTMLElement | null>
  align?: 'start' | 'end'
  offset?: number
  /** Make the panel at least as wide as the anchor. */
  matchWidth?: boolean
  role?: string
  label?: string
  className?: string
  children: ReactNode
}

interface Placement {
  left: number
  top: number
  width: number | undefined
  above: boolean
  originX: 'left' | 'right'
  maxHeight: number
  maxWidth: number
  scroll: boolean
}

export function Popover({ open, onClose, anchorRef, align = 'start', offset = 6, matchWidth = false, role, label, className, children }: PopoverProps) {
  const [mounted, setMounted] = useState(open)
  const [visible, setVisible] = useState(false)
  if (open && !mounted) setMounted(true)
  const [pos, setPos] = useState<Placement | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let r2 = 0
    let t = 0
    const r1 = requestAnimationFrame(() => {
      if (open) r2 = requestAnimationFrame(() => setVisible(true))
      else {
        setVisible(false)
        t = setTimeout(() => setMounted(false), 180)
      }
    })
    return () => {
      cancelAnimationFrame(r1)
      cancelAnimationFrame(r2)
      clearTimeout(t)
    }
  }, [open])

  // A popover that contains a field marked data-autofocus (link dialog, add-tag form) moves focus into it once it is shown.
  useEffect(() => {
    if (visible) panelRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true })
  }, [visible])

  const place = useCallback(() => {
    const anchor = anchorRef.current
    const panel = panelRef.current
    if (!anchor || !panel) return
    const a = anchor.getBoundingClientRect()
    const w = Math.max(panel.offsetWidth, matchWidth ? a.width : 0)
    const h = panel.offsetHeight
    let left = align === 'end' ? a.right - w : a.left
    left = Math.max(MARGIN, Math.min(left, window.innerWidth - w - MARGIN))
    // Flip above the anchor when there is no room below and more room above; if neither side fits, take the larger side and scroll.
    const roomBelow = window.innerHeight - MARGIN - (a.bottom + offset)
    const roomAbove = a.top - offset - MARGIN
    const above = h > roomBelow && roomAbove > roomBelow
    const room = Math.max(120, above ? roomAbove : roomBelow)
    const shownH = Math.min(h, room)
    const top = above ? a.top - offset - shownH : a.bottom + offset
    setPos({ left, top, width: matchWidth ? a.width : undefined, above, originX: align === 'end' ? 'right' : 'left', maxHeight: room, maxWidth: window.innerWidth - 2 * MARGIN, scroll: h > room })
  }, [anchorRef, align, offset, matchWidth])

  useLayoutEffect(() => {
    if (mounted) place()
  }, [mounted, place, children])

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (panelRef.current?.contains(target) || anchorRef.current?.contains(target)) return
      const mine = openStack.indexOf(panelRef.current as HTMLElement)
      if (mine >= 0 && openStack.slice(mine + 1).some((p) => p.contains(target))) return
      onClose(false)
    }
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (openStack.length && openStack[openStack.length - 1] !== panelRef.current) return
        e.stopPropagation()
        onClose(true)
      }
    }
    const onMove = () => place()
    // Capture phase: a parent that calls stopPropagation (a draggable card around its menu) must not hide outside clicks and Escape from us.
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKey, true)
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
  }, [open, onClose, anchorRef, place])

  useEffect(() => {
    const el = panelRef.current
    if (!mounted || !el) return undefined
    openStack.push(el)
    return () => { const i = openStack.indexOf(el); if (i >= 0) openStack.splice(i, 1) }
  }, [mounted])

  if (!mounted) return null
  return createPortal(
    <div
      ref={panelRef}
      role={role}
      aria-label={label}
      data-popover-panel
      className={cn('fixed z-[90]', pos?.scroll && 'overflow-y-auto overscroll-contain')}
      style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, minWidth: Math.min(Math.max(pos?.width ?? 0, MIN_WIDTH), window.innerWidth - 2 * MARGIN), maxWidth: pos?.maxWidth ?? window.innerWidth - 2 * MARGIN, maxHeight: pos?.maxHeight, visibility: pos ? 'visible' : 'hidden' }}
    >
      <div
        className={cn(
          'transition duration-150 ease-out motion-reduce:transition-none',
          pos?.above ? 'origin-bottom' : 'origin-top',
          visible ? 'translate-y-0 scale-100 opacity-100' : cn('scale-95 opacity-0', pos?.above ? 'translate-y-1' : '-translate-y-1'),
          className,
        )}
        style={{ transformOrigin: `${pos?.above ? 'bottom' : 'top'} ${pos?.originX ?? 'left'}` }}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

// Matches the Figma "Menu Item" set: Default, Hover, Pressed, Focus (inset primary ring), Disabled, Selected (soft primary + check).
export interface MenuItemProps {
  item: MenuAction
  /** The roving-focus item (tabIndex 0). */
  active: boolean
  onSelect: () => void
  onHover: () => void
  itemRef: Ref<HTMLButtonElement>
}

export function MenuItem({ item, active, onSelect, onHover, itemRef }: MenuItemProps) {
  const Icon = item.icon
  const isToggle = item.toggle !== undefined
  const checkable = isToggle || item.checked !== undefined
  const on = isToggle ? item.toggle : item.checked
  return (
    <button
      ref={itemRef}
      type="button"
      role={checkable ? (item.radio ? 'menuitemradio' : 'menuitemcheckbox') : 'menuitem'}
      aria-checked={checkable ? on : undefined}
      disabled={item.disabled}
      tabIndex={active ? 0 : -1}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={cn(
        'flex w-full items-center rounded-md px-3 text-left text-sm outline-none transition-colors motion-reduce:transition-none',
        item.avatar ? 'h-10 gap-2.5' : 'h-9 gap-2',
        'focus-visible:ring-[1.5px] focus-visible:ring-inset focus-visible:ring-primary',
        item.disabled
          ? 'pointer-events-none text-text-muted'
          : item.danger
            ? 'text-danger-strong hover:bg-danger/10 active:bg-danger/16'
            : item.checked
              ? 'bg-primary-soft font-medium text-primary'
              : 'text-text-primary hover:bg-surface-subtle active:bg-surface-muted',
      )}
    >
      {item.avatar && <Avatar initial={item.avatar.initial} tone={item.avatar.tone} size="M" className={cn(item.disabled && 'opacity-50')} />}
      {Icon && <Icon className={cn('size-5 shrink-0', item.disabled ? 'opacity-50' : item.danger ? 'text-danger-strong' : 'text-text-secondary')} strokeWidth={1.75} />}
      <span className="flex-1 truncate">{item.label}</span>
      {item.hint && <span className="text-xs text-text-muted">{item.hint}</span>}
      {isToggle && <ToggleTrack checked={Boolean(item.toggle)} className={cn(item.disabled && 'opacity-50')} />}
      {item.checked && <Check className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />}
    </button>
  )
}

// Roving-focus list: Arrow keys, Home/End, Enter/Space, type-ahead, Tab closes.
const isAction = (entry: MenuEntry): entry is MenuAction => entry.type === undefined

interface MenuListProps {
  items: MenuEntry[]
  label?: string
  open: boolean
  focusSelected: boolean
  onSelectItem: (item: MenuAction) => void
  onClose: (restoreFocus: boolean) => void
}

function MenuList({ items, label, open, focusSelected, onSelectItem, onClose }: MenuListProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const enabled = items.map((it, i) => (isAction(it) && !it.disabled ? i : -1)).filter((i) => i >= 0)
  const startIndex = () => {
    const checked = focusSelected ? items.findIndex((it) => isAction(it) && it.checked) : -1
    return checked >= 0 ? checked : (enabled[0] ?? -1)
  }
  const [active, setActive] = useState(startIndex)
  const typed = useRef({ text: '', t: 0 })

  // each time the menu opens, start on the selected item (or the first one) and move focus into the list
  useEffect(() => {
    if (!open) return undefined
    const start = startIndex()
    setActive(start)
    const id = setTimeout(() => refs.current[start]?.focus({ preventScroll: true }), 0)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const focusAt = (i: number) => {
    setActive(i)
    refs.current[i]?.focus({ preventScroll: true })
  }
  const move = (dir: number) => {
    if (!enabled.length) return
    const pos = enabled.indexOf(active)
    focusAt(enabled[(pos + dir + enabled.length) % enabled.length])
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1) }
    else if (e.key === 'Home') { e.preventDefault(); focusAt(enabled[0]) }
    else if (e.key === 'End') { e.preventDefault(); focusAt(enabled[enabled.length - 1]) }
    else if (e.key === 'Tab') onClose(false)
    else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && e.key !== ' ') {
      const now = Date.now()
      typed.current.text = (now - typed.current.t > 600 ? '' : typed.current.text) + e.key.toLowerCase()
      typed.current.t = now
      const hit = enabled.find((i) => {
        const entry = items[i]
        return 'label' in entry && entry.label.toLowerCase().startsWith(typed.current.text)
      })
      if (hit !== undefined) focusAt(hit)
    }
  }

  return (
    <div role="menu" aria-label={label} onKeyDown={onKeyDown} className="flex min-w-62 flex-col gap-0.5 rounded-lg border border-border bg-surface p-1 shadow-hover">
      {items.map((item, i) => {
        if (item.type === 'separator') return <div key={`sep-${i}`} role="separator" className="my-0.5 h-px bg-border" />
        if (item.type === 'label') return <div key={`label-${i}`} className="px-3 pb-1 pt-2 text-xs font-medium text-text-muted">{item.label}</div>
        return (
          <MenuItem
            key={item.id ?? i}
            item={item}
            active={i === active}
            itemRef={(el) => { refs.current[i] = el }}
            onHover={() => !item.disabled && focusAt(i)}
            onSelect={() => onSelectItem(item)}
          />
        )
      })}
    </div>
  )
}

// <Menu trigger={({ open, props }) => <button {...props}>...</button>} items={[...]} />
// focusSelected: start keyboard focus on the checked item (single-choice menus like the account switcher)
// items: { id, label, icon, checked, disabled, danger, keepOpen, onSelect } | { type: 'separator' } | { type: 'label', label }
export interface MenuProps {
  trigger: (state: { open: boolean; props: MenuTriggerProps }) => ReactNode
  items: MenuEntry[]
  align?: 'start' | 'end'
  /** Accessible name of the menu. */
  label?: string
  matchWidth?: boolean
  focusSelected?: boolean
  className?: string
}

export function Menu({ trigger, items, align = 'start', label, matchWidth = false, focusSelected = false, className }: MenuProps) {
  const [open, setOpen] = useState(false)
  // The trigger element lives in state (set through a callback ref); Popover reads it through a ref-shaped getter.
  const [triggerEl, setTriggerEl] = useState<HTMLElement | null>(null)
  const anchorRef = useMemo<RefObject<HTMLElement | null>>(() => ({ current: triggerEl }), [triggerEl])
  const close = useCallback((restoreFocus = true) => {
    setOpen(false)
    if (restoreFocus) triggerEl?.focus({ preventScroll: true })
  }, [triggerEl])

  const props: MenuTriggerProps = {
    ref: setTriggerEl,
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    onClick: () => setOpen((o) => !o),
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        setOpen(true)
      }
    },
  }
  const select = (item: MenuAction) => {
    item.onSelect?.()
    if (!item.keepOpen) close(true)
  }
  return (
    <>
      {trigger({ open, props })}
      <Popover open={open} onClose={close} anchorRef={anchorRef} align={align} matchWidth={matchWidth} className={className}>
        <MenuList items={items} label={label} open={open} focusSelected={focusSelected} onSelectItem={select} onClose={close} />
      </Popover>
    </>
  )
}

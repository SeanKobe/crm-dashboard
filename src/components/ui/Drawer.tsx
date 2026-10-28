import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn'

// Side panel for details (no Figma version yet: built from the Modal tokens). 480px on the right, full width below 1024px.
// Focus is trapped (the page behind is inert), Escape closes, and focus goes back to `returnFocus` after the exit animation.
export interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Where focus goes once the drawer has closed (default: whatever had focus when it opened). */
  returnFocus?: () => HTMLElement | null
  /** Called after the exit animation. */
  onExited?: () => void
}

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function Drawer({ open, onClose, title, children, returnFocus, onExited }: DrawerProps) {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const lastFocus = useRef<Element | null>(null)
  const wasOpen = useRef(open) // a drawer that never opened has nothing to return focus from
  const titleId = useId()
  if (open && !mounted) setMounted(true)

  useEffect(() => {
    let r2 = 0
    let t = 0
    const r1 = requestAnimationFrame(() => {
      if (open) {
        wasOpen.current = true
        lastFocus.current = document.activeElement
        r2 = requestAnimationFrame(() => {
          setShown(true)
          // Focus the dialog itself so the title is announced; the first Tab then lands on the first field.
          const first = panel.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panel.current
          first?.focus({ preventScroll: true })
        })
      } else if (wasOpen.current) {
        setShown(false)
        t = window.setTimeout(() => {
          setMounted(false)
          const target = returnFocus?.() ?? (lastFocus.current instanceof HTMLElement ? lastFocus.current : null)
          target?.focus({ preventScroll: true })
          onExited?.()
        }, 250)
      }
    })
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); clearTimeout(t) }
    // returnFocus / onExited are read when the exit finishes; they must not restart the animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // The page behind the drawer cannot be reached by keyboard, pointer or screen reader while it is open.
  useEffect(() => {
    if (!open) return undefined
    const root = document.getElementById('root')
    root?.setAttribute('inert', '')
    return () => root?.removeAttribute('inert')
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e: KeyboardEvent) => {
      const a = document.activeElement
      const inside = Boolean(a && panel.current?.contains(a))
      if (e.key === 'Escape' && inside && !e.defaultPrevented) { e.preventDefault(); onClose() }
      if (e.key === 'Tab' && inside) {
        const f = [...(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter((x) => !x.matches(':disabled') && x.offsetParent !== null)
        if (!f.length) return
        if (e.shiftKey && a === f[0]) { e.preventDefault(); f[f.length - 1].focus() }
        else if (!e.shiftKey && a === f[f.length - 1]) { e.preventDefault(); f[0].focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!mounted) return null
  return createPortal(
    <div className="fixed inset-0 z-[45]">
      <div aria-hidden onClick={onClose} className={cn('absolute inset-0 bg-text-primary/45 transition-opacity duration-move ease-out', shown ? 'opacity-100' : 'opacity-0')} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-drawer
        tabIndex={-1}
        className={cn(
          'absolute inset-y-0 right-0 flex w-full flex-col outline-none border-l border-border bg-surface shadow-modal transition-[transform,translate] duration-move ease-out lg:w-120',
          shown ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <span id={titleId} className="sr-only">{title}</span>
        {children}
      </div>
    </div>,
    document.body,
  )
}

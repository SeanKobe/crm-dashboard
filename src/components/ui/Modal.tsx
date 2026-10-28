import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { IconButton } from './IconButton'

// Figma "Modal": 480px, header / body / footer, over the Scrim (text-primary at 45%). Fades the scrim and scales the panel.
export interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer: ReactNode
  /** 720px instead of 480px (import and mapping dialogs). */
  wide?: boolean
}

export function Modal({ open, onClose, title, children, footer, wide = false }: ModalProps) {
  const [mounted, setMounted] = useState(open)
  const [shown, setShown] = useState(false)
  const panel = useRef<HTMLDivElement>(null)
  const lastFocus = useRef<Element | null>(null)
  if (open && !mounted) setMounted(true)
  useEffect(() => {
    let r2 = 0, t = 0
    const r1 = requestAnimationFrame(() => {
      if (open) { lastFocus.current = document.activeElement; r2 = requestAnimationFrame(() => { setShown(true); (panel.current?.querySelector<HTMLElement>('[data-autofocus]') ?? panel.current?.querySelector<HTMLElement>('footer button') ?? panel.current?.querySelector<HTMLElement>('button'))?.focus() }) }
      else { setShown(false); t = setTimeout(() => { setMounted(false); if (lastFocus.current instanceof HTMLElement) lastFocus.current.focus({ preventScroll: true }) }, 250) }
    })
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); clearTimeout(t) }
  }, [open])
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // A menu or select opened from inside the dialog owns this Escape (focus is in its portal).
        const a = document.activeElement
        if (a && a !== document.body && panel.current && !panel.current.contains(a)) return
        e.stopPropagation()
        onClose()
      }
      if (e.key === 'Tab') {
        const f = [...(panel.current?.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])') ?? [])].filter((x) => !x.matches(':disabled'))
        if (!f.length) return
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus() }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!mounted) return null
  return createPortal(
    <div className="fixed inset-0 z-[80] grid place-items-center p-6">
      <div aria-hidden onClick={onClose} className={cn('absolute inset-0 bg-text-primary/45 transition-opacity duration-move ease-out', shown ? 'opacity-100' : 'opacity-0')} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn('relative flex max-h-[calc(100dvh-3rem)] max-w-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-modal transition duration-move ease-out', wide ? 'w-180' : 'w-120', shown ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-95 opacity-0')}
      >
        <header className="flex shrink-0 items-center justify-between px-5 pb-3 pt-5">
          <h2 className="text-base font-medium">{title}</h2>
          <IconButton icon={X} label="Close dialog" onClick={onClose} size="sm" />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 -mt-1 pt-1 text-sm leading-4.25 text-text-secondary">{children}</div>
        <footer className="flex shrink-0 justify-end gap-2 bg-surface-subtle px-5 py-3">{footer}</footer>
      </div>
    </div>,
    document.body,
  )
}

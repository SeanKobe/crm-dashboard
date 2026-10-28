import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CircleCheck, CircleX, Info, TriangleAlert, X } from 'lucide-react'
import { ToastContext } from '../../context/toastContext'
import { cn } from '../../lib/cn'
import type { IconComponent, ToastData, ToastInput, ToastType } from '../../types'

// Figma "Toast": 360px card, tinted icon badge, title, message, close. Types: Success, Error, Info, Warning.
const TYPES: Record<ToastType, { icon: IconComponent; tint: string; text: string }> = {
  success: { icon: CircleCheck, tint: 'bg-success', text: 'text-success' },
  error: { icon: CircleX, tint: 'bg-danger', text: 'text-danger' },
  info: { icon: Info, tint: 'bg-primary', text: 'text-primary' },
  warning: { icon: TriangleAlert, tint: 'bg-warning', text: 'text-warning-foreground' },
}
let nextId = 0

function ToastItem({ toast, onClose }: { toast: ToastData; onClose: (id: number) => void }) {
  const [shown, setShown] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const paused = hovered || focused
  // Time left on the auto-dismiss clock; it stops while the pointer or keyboard focus is on the toast and carries on from where it was.
  const remaining = useRef(toast.duration)
  const t = TYPES[toast.type]
  const Icon = t.icon
  useEffect(() => {
    const r = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(r)
  }, [])
  useEffect(() => {
    if (paused) return undefined
    const left = remaining.current
    const startedAt = Date.now()
    const hide = setTimeout(() => setShown(false), Math.max(0, left - 250))
    const kill = setTimeout(() => onClose(toast.id), left)
    return () => { remaining.current = Math.max(1500, left - (Date.now() - startedAt)); clearTimeout(hide); clearTimeout(kill) }
  }, [paused, toast.id, onClose])
  return (
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      data-toast
      onMouseEnter={() => { setHovered(true); setShown(true) }}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => { setFocused(true); setShown(true) }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false) }}
      className={cn(
        'pointer-events-auto flex w-90 max-w-[calc(100vw-2rem)] items-start gap-3 rounded-lg border border-border bg-surface p-3 shadow-hover transition duration-move ease-out',
        shown ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
      )}
    >
      <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full">
        <span className={cn('absolute inset-0 rounded-full opacity-14', t.tint)} />
        <Icon className={cn('relative size-5', t.text)} strokeWidth={1.75} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium">{toast.title}</span>
        {toast.message && <span className="text-compact text-text-secondary">{toast.message}</span>}
      </div>
      {toast.action && (
        <button type="button" onClick={() => { toast.action?.onClick(); onClose(toast.id) }} className="-my-0.5 shrink-0 rounded-sm px-2 py-1 text-sm font-medium text-primary outline-none transition-colors duration-hover ease-out hover:bg-primary-soft focus-ring">
          {toast.action.label}
        </button>
      )}
      <button type="button" aria-label="Dismiss notification" data-toast-close onClick={() => onClose(toast.id)} className="-m-1 grid size-8 shrink-0 place-items-center rounded-sm text-text-secondary outline-none transition-colors duration-hover ease-out hover:bg-surface-muted hover:text-text-primary focus-ring motion-reduce:transition-none">
        <X className="size-4" strokeWidth={1.75} />
      </button>
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([])
  const timers = useRef(new Set<number>())
  const close = useCallback((id: number) => setToasts((l) => l.filter((x) => x.id !== id)), [])
  const push = useCallback((toast: ToastInput) => { const id = ++nextId; setToasts((l) => [...l.slice(-3), { duration: 3500, type: 'info', ...toast, id }]); return id }, [])
  useEffect(() => { const set = timers.current; return () => set.forEach(clearTimeout) }, [])
  // Pages that don't scroll (Deals, Contacts) leave room under their content while toasts are on screen, so a pager or footer is never hidden behind them.
  const stack = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = stack.current
    if (!el) return undefined
    const root = document.documentElement
    const sync = () => root.style.setProperty('--toast-inset', el.offsetHeight ? `${el.offsetHeight + 8}px` : '0px')
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    sync()
    return () => { ro.disconnect(); root.style.removeProperty('--toast-inset') }
  }, [])
  return (
    <ToastContext.Provider value={push}>
      {children}
      {createPortal(
        <div ref={stack} aria-live="polite" className="pointer-events-none fixed bottom-6 right-6 z-[70] flex flex-col gap-2">
          {toasts.map((t) => <ToastItem key={t.id} toast={t} onClose={close} />)}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

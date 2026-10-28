import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefCallback } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn'

// Figma "Tooltip": dark bubble with a small arrow. Shows on hover or keyboard focus, flips below when there is no room above.
/** What the trigger element receives: spread these onto it. */
export interface TooltipTriggerProps {
  ref: RefCallback<HTMLElement>
  onMouseEnter: () => void
  onMouseLeave: () => void
  onFocus: () => void
  onBlur: () => void
  'aria-describedby': string | undefined
}

export interface TooltipProps {
  content: ReactNode
  children: (props: TooltipTriggerProps) => ReactNode
  /** Milliseconds before showing. */
  delay?: number
  /** Where the bubble sits. `right` is used beside the collapsed sidebar's expand button. */
  side?: 'top' | 'right'
}

export function Tooltip({ content, children, delay = 150, side = 'top' }: TooltipProps) {
  const id = useId()
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState<{ left: number; top: number; below: boolean; arrow: number; right: boolean } | null>(null)
  // `wanted` follows hover/focus; the open state trails it by `delay` (showing) or 150ms (hiding, so the fade-out can finish).
  const [wanted, setWanted] = useState(false)

  const show = useCallback(() => setWanted(true), [])
  const hide = useCallback(() => { setVisible(false); setWanted(false) }, [])
  useEffect(() => {
    const t = setTimeout(() => setOpen(wanted), wanted ? delay : 150)
    return () => clearTimeout(t)
  }, [wanted, delay])

  useLayoutEffect(() => {
    if (!open || !anchor || !bubbleRef.current) return
    const a = anchor.getBoundingClientRect(), b = bubbleRef.current.getBoundingClientRect()
    if (side === 'right') {
      setPos({ left: a.right + 10, top: a.top + a.height / 2 - b.height / 2, below: false, arrow: a.top + a.height / 2, right: true })
      return
    }
    let top = a.top - b.height - 10, below = false
    if (top < 8) { top = a.bottom + 10; below = true }
    setPos({ left: Math.max(8, Math.min(a.left + a.width / 2 - b.width / 2, window.innerWidth - b.width - 8)), top, below, arrow: a.left + a.width / 2, right: false })
  }, [open, content, anchor, side])
  useEffect(() => {
    if (!open) return undefined
    const r = requestAnimationFrame(() => setVisible(true))
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && hide()
    document.addEventListener('keydown', onKey)
    return () => { cancelAnimationFrame(r); document.removeEventListener('keydown', onKey) }
  }, [open, hide])

  const props: TooltipTriggerProps = { ref: setAnchor, onMouseEnter: show, onMouseLeave: hide, onFocus: show, onBlur: hide, 'aria-describedby': open ? id : undefined }
  return (
    <>
      {children(props)}
      {open && createPortal(
        <div
          ref={bubbleRef}
          id={id}
          role="tooltip"
          className={cn('pointer-events-none fixed z-[60] max-w-64 rounded-sm bg-text-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground shadow-hover transition duration-hover ease-out', visible ? 'translate-x-0 translate-y-0 opacity-100' : side === 'right' ? '-translate-x-1 opacity-0' : pos?.below ? '-translate-y-1 opacity-0' : 'translate-y-1 opacity-0')}
          style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? 'visible' : 'hidden' }}
        >
          {content}
          <span aria-hidden className={cn('absolute size-2 rotate-45 bg-text-primary', pos?.right ? '-left-1' : pos?.below ? '-top-1' : '-bottom-1')} style={pos?.right ? { top: pos.arrow - pos.top - 4 } : { left: pos ? pos.arrow - pos.left - 4 : 0 }} />
        </div>,
        document.body,
      )}
    </>
  )
}

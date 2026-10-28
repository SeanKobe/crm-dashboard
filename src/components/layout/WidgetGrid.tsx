import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { WidgetId } from '../../types'
import { useWidgets } from '../../context/widgetsContext'
import { motion, prefersReducedMotion } from '../../lib/motion'

// A grid whose cards can be hidden and shown. A hidden card fades and shrinks out first; then the grid reflows and the
// remaining cards glide to their new positions (FLIP with the Web Animations API). `columns(n)` gives the template for n cards.
export interface WidgetGridItem {
  id: WidgetId
  node: ReactNode
}

export interface WidgetGridProps {
  items: WidgetGridItem[]
  /** The grid-template-columns value for a given number of visible cards. */
  columns: (count: number) => string
  className?: string
  style?: CSSProperties
}

export function WidgetGrid({ items, columns, className, style }: WidgetGridProps) {
  const { hidden } = useWidgets()
  const wanted = items.filter((i) => !hidden.includes(i.id)).map((i) => i.id)
  const [rendered, setRendered] = useState(wanted)
  const [leaving, setLeaving] = useState<WidgetId[]>([])
  const nodes = useRef(new Map<WidgetId, HTMLDivElement>())
  const rects = useRef(new Map<WidgetId, DOMRect>())
  const [entering, setEntering] = useState<WidgetId[]>([])

  // reconcile: cards that should disappear stay for one exit animation, new ones are added straight away
  const missing = wanted.filter((id) => !rendered.includes(id))
  const going = rendered.filter((id) => !wanted.includes(id) && !leaving.includes(id))
  if (missing.length) { setEntering(missing); setRendered([...rendered, ...missing]) }
  if (going.length) setLeaving([...leaving, ...going])

  useLayoutEffect(() => {
    if (!leaving.length) return undefined
    const instant = prefersReducedMotion()
    leaving.forEach((id) => { if (!instant) nodes.current.get(id)?.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.96)' }], { duration: motion.move, easing: motion.ease, fill: 'forwards' }) })
    const t = setTimeout(() => { setRendered((r) => r.filter((id) => !leaving.includes(id))); setLeaving([]) }, instant ? 0 : motion.move)
    return () => clearTimeout(t)
  }, [leaving])

  useLayoutEffect(() => {
    const instant = prefersReducedMotion()
    nodes.current.forEach((el, id) => {
      const r = el.getBoundingClientRect()
      const prev = rects.current.get(id)
      if (!instant && entering.includes(id)) el.animate([{ opacity: 0, transform: 'scale(0.96)' }, { opacity: 1, transform: 'none' }], { duration: motion.move, easing: motion.ease })
      else if (!instant && prev && (Math.abs(prev.left - r.left) > 1 || Math.abs(prev.top - r.top) > 1)) el.animate([{ transform: `translate(${prev.left - r.left}px, ${prev.top - r.top}px)` }, { transform: 'none' }], { duration: motion.move, easing: motion.ease })
      rects.current.set(id, r)
    })
    if (entering.length) requestAnimationFrame(() => setEntering([]))
  })

  const visible = rendered.filter((id) => !leaving.includes(id))
  const template = columns(Math.max(1, leaving.length ? rendered.length : visible.length))
  return (
    <div className={className} style={{ ...style, gridTemplateColumns: template }}>
      {rendered.map((id) => {
        const item = items.find((i) => i.id === id)
        return (
          <div key={id} ref={(el) => { if (el) nodes.current.set(id, el); else { nodes.current.delete(id); rects.current.delete(id) } }} className="grid min-w-0">
            {item?.node}
          </div>
        )
      })}
    </div>
  )
}

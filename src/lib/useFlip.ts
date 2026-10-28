import { useLayoutEffect, useRef, type RefObject } from 'react'
import { motion, prefersReducedMotion } from './motion'

// Animates list rows to their new position (pin moves, re-sorting) and slides new rows in. Movement uses the 250ms token.
// Items need `data-flip-id`. Reduced motion skips it.
export function useFlip(container: RefObject<HTMLElement | null>, order: string): void {
  const prev = useRef<Map<string, number>>(new Map())
  const first = useRef(true)
  useLayoutEffect(() => {
    const root = container.current
    if (!root) return
    const items = [...root.querySelectorAll<HTMLElement>('[data-flip-id]')]
    const next = new Map<string, number>()
    const animate = !first.current && !prefersReducedMotion()
    for (const el of items) {
      const id = el.dataset.flipId ?? ''
      const top = el.getBoundingClientRect().top
      next.set(id, top)
      if (!animate) continue
      const was = prev.current.get(id)
      if (was === undefined) {
        el.animate([{ opacity: 0, transform: 'translateY(-12px)' }, { opacity: 1, transform: 'none' }], { duration: motion.move, easing: motion.ease })
      } else if (Math.abs(was - top) > 1) {
        el.animate([{ transform: `translateY(${was - top}px)` }, { transform: 'none' }], { duration: motion.move, easing: motion.ease })
      }
    }
    prev.current = next
    first.current = false
  }, [container, order])
}

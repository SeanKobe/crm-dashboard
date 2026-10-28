import { useEffect, useRef, useState } from 'react'
import { motion, prefersReducedMotion } from '../../lib/motion'

// Counts from the number it shows now to the new value in one movement (250ms). First render and reduced motion show the value directly.
export interface AnimatedNumberProps {
  value: number
  format?: (n: number) => string
  duration?: number
  className?: string
}

const easeOut = (t: number): number => 1 - (1 - t) ** 3

export function AnimatedNumber({ value, format = (n) => String(Math.round(n)), duration = motion.move, className }: AnimatedNumberProps) {
  const [shown, setShown] = useState(value)
  const current = useRef(value)
  const still = prefersReducedMotion()
  useEffect(() => {
    if (still) return undefined
    if (current.current === value) return undefined
    const from = current.current
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      current.current = p >= 1 ? value : from + (value - from) * easeOut(p)
      setShown(current.current)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration, still])
  return (
    <span className={className}>
      <span aria-hidden className="tabular-nums">{format(still ? value : shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  )
}

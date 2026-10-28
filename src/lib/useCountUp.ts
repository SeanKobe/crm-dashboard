import { useEffect, useMemo, useRef, useState } from 'react'
import type { CountTrigger } from '../types'
import { useLoaded } from '../context/loadedContext'
import { motion } from './motion'

// "$1.4K" -> { prefix: '$', value: 1.4, decimals: 1, suffix: 'K' }; "1,212" keeps comma grouping; "$32.209" keeps 3 decimals.
export interface ParsedNumber {
  prefix: string
  suffix: string
  value: number
  decimals: number
  grouping: boolean
}

export function parseNumber(str: string): ParsedNumber | null {
  const m = String(str).match(/^([^0-9-]*)(-?[\d.,]*\d)([\s\S]*)$/)
  if (!m) return null
  const [, prefix, core, suffix] = m
  const grouping = core.includes(',')
  const decimals = !grouping && core.includes('.') ? core.split('.')[1].length : 0
  const value = Number(grouping ? core.replace(/,/g, '') : core)
  return Number.isFinite(value) ? { prefix, suffix, value, decimals, grouping } : null
}

export function formatNumber(n: number, { prefix, suffix, decimals, grouping }: ParsedNumber): string {
  const body = grouping ? Math.round(n).toLocaleString('en-US') : decimals ? n.toFixed(decimals) : String(Math.round(n))
  return prefix + body + suffix
}

const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3
const prefersReducedMotion = (): boolean => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)

// Start somewhere clearly different from the target (about a third of the way), never equal to it.
const startFor = (parsed: ParsedNumber, from: number | undefined): number => {
  if (from !== undefined) return from
  const s = parsed.decimals ? parsed.value * 0.35 : Math.floor(parsed.value * 0.35)
  return s === parsed.value ? 0 : s
}

// Counts up to `value` once per element. trigger 'view' waits until the element scrolls into view; 'mount' starts immediately.
// Later changes to `value` show the new number straight away. Reduced motion shows the final number with no animation.
export interface CountUpOptions {
  from?: number
  duration?: number
  trigger?: CountTrigger
  waitForLoad?: boolean
}

export function useCountUp<E extends HTMLElement = HTMLSpanElement>(value: string, { from, duration = motion.count, trigger = 'view', waitForLoad = true }: CountUpOptions = {}) {
  const loaded = useLoaded()
  const parsed = useMemo(() => parseNumber(value), [value])
  const ref = useRef<E | null>(null)
  const played = useRef(false)
  const [state, setState] = useState(() => {
    if (!parsed || prefersReducedMotion()) return { text: value, current: parsed ? parsed.value : 0 }
    const s = startFor(parsed, from)
    return { text: formatNumber(s, parsed), current: s }
  })

  useEffect(() => {
    if (!parsed || prefersReducedMotion() || played.current) {
      setState({ text: value, current: parsed ? parsed.value : 0 })
      return undefined
    }
    if (waitForLoad && !loaded) return undefined
    let raf = 0
    let observer: IntersectionObserver | undefined
    const run = () => {
      const s = startFor(parsed, from)
      const t0 = performance.now()
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / duration)
        if (p >= 1) {
          played.current = true
          setState({ text: value, current: parsed.value })
          return
        }
        const n = s + (parsed.value - s) * easeOutCubic(p)
        setState({ text: formatNumber(n, parsed), current: n })
        raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }
    const el = ref.current
    if (trigger === 'mount' || !el || !('IntersectionObserver' in window)) run()
    else {
      observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          observer?.disconnect()
          run()
        }
      }, { threshold: 0.4 })
      observer.observe(el)
    }
    return () => {
      cancelAnimationFrame(raf)
      observer?.disconnect()
    }
  }, [value, parsed, from, duration, trigger, loaded, waitForLoad])

  return { ref, text: state.text, current: state.current }
}

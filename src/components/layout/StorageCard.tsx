import { useEffect, useState } from 'react'
import { CircleArrowRight } from 'lucide-react'
import { storage } from '../../data/mock'
import { cn } from '../../lib/cn'
import { motion, prefersReducedMotion } from '../../lib/motion'

const TICKS = 72
const FADE = 0.55 // filled ticks fade from full to (1 - FADE) opacity across the bar, as in the Figma meter
const easeOut = (t: number): number => 1 - (1 - t) ** 3

const tween = (from: number, to: number, ms: number, on: (value: number) => void, cancelled: () => boolean) =>
  new Promise<void>((resolve) => {
    const t0 = performance.now()
    const tick = (now: number) => {
      if (cancelled()) return resolve()
      const p = Math.min(1, (now - t0) / ms)
      on(from + (to - from) * easeOut(p))
      if (p < 1) requestAnimationFrame(tick)
      else resolve()
    }
    requestAnimationFrame(tick)
  })

// Follows the Figma StorageCard prototype: Progress 50 -> 75 -> 90, each step Smart Animate ease-out 300ms after a 0.8s timeout.
// The first fill (0 -> 50) is a chart draw (500ms). Ticks light up as the percentage counts with them.
function useStorageProgress(target: number): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0))
  useEffect(() => {
    if (prefersReducedMotion()) return undefined
    let stop = false
    const cancelled = () => stop
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
    ;(async () => {
      await wait(250)
      await tween(0, 50, motion.chart, setValue, cancelled)
      await wait(motion.storageHold)
      await tween(50, 75, motion.storageStep, setValue, cancelled)
      await wait(motion.storageHold)
      await tween(75, target, motion.storageStep, setValue, cancelled)
      if (!stop) setValue(target)
    })()
    return () => { stop = true }
  }, [target])
  return value
}

export function StorageCard() {
  const final = `${storage.usedPercent}%`
  const finalFilled = Math.round((TICKS * storage.usedPercent) / 100)
  const current = useStorageProgress(storage.usedPercent)
  const filled = Math.min(finalFilled, Math.round((TICKS * current) / 100))
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3 shadow-soft transition-[transform,translate,scale,box-shadow] duration-hover ease-out hover:-translate-y-0.5 hover:shadow-card motion-reduce:transition-none">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium leading-4.25">Cloud Storage</span>
        <span className="inline-grid text-compact leading-4 tabular-nums text-text-secondary">
          <span aria-hidden className="invisible col-start-1 row-start-1">{final}</span>
          <span aria-hidden className="col-start-1 row-start-1 justify-self-end">{Math.round(current)}%</span>
          <span className="sr-only">{final}</span>
        </span>
      </div>
      <div className="flex items-center justify-between" role="progressbar" aria-valuenow={Math.round(current)} aria-valuemin={0} aria-valuemax={100} aria-label="Cloud storage used">
        {Array.from({ length: TICKS }, (_, i) => (
          <span
            key={i}
            className={cn('h-3.5 w-[1.5px] rounded-full', i < filled ? 'bg-accent-orange' : 'bg-border')}
            style={i < filled ? { opacity: 1 - FADE * (i / Math.max(1, finalFilled - 1)) } : undefined}
          />
        ))}
      </div>
      <button type="button" className="group flex h-9 items-center justify-between gap-1 rounded-md border border-border bg-surface-subtle px-2.5 outline-none transition-[background-color,border-color,transform,translate,scale] duration-hover ease-out hover:border-border-strong hover:bg-surface-muted active:scale-[0.97] focus-ring motion-reduce:transition-none">
        <span className="flex items-center gap-1 whitespace-nowrap text-xs">
          {storage.upgradeLabel}
          <span className="text-muted-strong">{storage.upgradeNote}</span>
        </span>
        <CircleArrowRight className="size-5 transition-transform duration-hover ease-out group-hover:translate-x-0.5 motion-reduce:transition-none" strokeWidth={1.75} />
      </button>
    </div>
  )
}

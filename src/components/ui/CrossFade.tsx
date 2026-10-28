import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

// Cross-fades between values (page title, chart title). Both layers share one grid cell, so nothing shifts.
// `id` identifies the value; `render(value)` draws it (defaults to the value itself).
interface Layer<T> {
  id: string
  value: T
}

export interface CrossFadeProps<T> {
  value: T
  id?: string
  render?: (value: T) => ReactNode
  className?: string
}

export function CrossFade<T = string>({ value, id = String(value), render = (v) => v as ReactNode, className }: CrossFadeProps<T>) {
  const [layers, setLayers] = useState<{ current: Layer<T>; previous: Layer<T> | null }>({ current: { id, value }, previous: null })
  if (layers.current.id !== id) setLayers({ current: { id, value }, previous: layers.current })
  useEffect(() => {
    if (layers.previous === null) return undefined
    const t = setTimeout(() => setLayers((l) => ({ ...l, previous: null })), 250)
    return () => clearTimeout(t)
  }, [layers.previous])
  const live = layers.current.id === id ? { id, value } : layers.current
  return (
    <span className={cn('inline-grid', className)}>
      {layers.previous !== null && <span aria-hidden className="col-start-1 row-start-1 animate-fade-out">{render(layers.previous.value)}</span>}
      <span key={live.id} className={cn('col-start-1 row-start-1', layers.previous !== null && 'animate-fade-in')}>{render(live.value)}</span>
    </span>
  )
}

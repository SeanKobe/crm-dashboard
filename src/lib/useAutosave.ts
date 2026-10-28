import { useCallback, useEffect, useRef, useState } from 'react'
import type { NotePatch, SaveStatus } from '../types'

// Debounced autosave. `queue(patch)` merges changes and saves after `delay` ms without typing (or right away with `immediate`).
// Status: idle -> saving (as soon as there is something unsaved) -> saved, or error (changes are kept for `retry`).
// Anything still pending is flushed when the component unmounts and when the page is being closed.
export interface Autosave<P extends object = NotePatch> {
  status: SaveStatus
  queue: (patch: P, immediate?: boolean) => void
  flush: () => Promise<void>
  retry: () => Promise<void>
}

export function useAutosave<P extends object = NotePatch>(save: (patch: P) => Promise<unknown>, delay = 800): Autosave<P> {
  const [status, setStatus] = useState<SaveStatus>('idle')
  const pending = useRef<P | null>(null)
  const timer = useRef(0)
  const inFlight = useRef(0)
  const saveRef = useRef(save)
  const alive = useRef(true)
  useEffect(() => { saveRef.current = save })

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current)
    const patch = pending.current
    if (!patch) return
    pending.current = null
    inFlight.current += 1
    if (alive.current) setStatus('saving')
    try {
      await saveRef.current(patch)
      inFlight.current -= 1
      if (alive.current && !pending.current && inFlight.current === 0) setStatus('saved')
    } catch {
      inFlight.current -= 1
      pending.current = { ...patch, ...(pending.current ?? {}) }
      if (alive.current) setStatus('error')
    }
  }, [])

  const queue = useCallback((patch: P, immediate = false) => {
    pending.current = { ...(pending.current ?? {}), ...patch }
    setStatus('saving')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => { void flush() }, immediate ? 0 : delay)
  }, [delay, flush])

  useEffect(() => {
    alive.current = true
    const onHide = () => { void flush() }
    window.addEventListener('pagehide', onHide)
    window.addEventListener('beforeunload', onHide)
    return () => {
      alive.current = false
      window.removeEventListener('pagehide', onHide)
      window.removeEventListener('beforeunload', onHide)
      void flush()
    }
  }, [flush])

  return { status, queue, flush, retry: flush }
}

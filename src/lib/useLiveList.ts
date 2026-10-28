import { useCallback, useEffect, useRef, useState } from 'react'

// Shared loading / error / retry state for a page that shows one list from a service and stays in step with its writes.
export type LiveStatus = 'loading' | 'ready' | 'error'
export interface LiveList<T> { data: T | null; status: LiveStatus; error: string | null; reload: () => void }

export function useLiveList<T>(load: () => Promise<T>, subscribe: (fn: () => void) => () => void, minLoadMs = 0): LiveList<T> {
  const [state, setState] = useState<{ data: T | null; status: LiveStatus; error: string | null }>({ data: null, status: 'loading', error: null })
  const [tick, setTick] = useState(0)
  const first = useRef(true)
  useEffect(() => {
    let live = true
    const wait = first.current && minLoadMs ? new Promise<void>((r) => setTimeout(r, minLoadMs)) : Promise.resolve()
    Promise.all([load(), wait])
      .then(([data]) => { if (!live) return; first.current = false; setState({ data, status: 'ready', error: null }) })
      .catch((e: unknown) => { if (live) setState((s) => ({ data: s.data, status: 'error', error: e instanceof Error ? e.message : 'Something went wrong.' })) })
    return () => { live = false }
  }, [tick, minLoadMs, load])
  // A write elsewhere refreshes the list in the background (no loading state).
  useEffect(() => subscribe(() => setTick((t) => t + 1)), [subscribe])
  const reload = useCallback(() => { setState((s) => ({ ...s, status: 'loading', error: null })); setTick((t) => t + 1) }, [])
  return { ...state, reload }
}

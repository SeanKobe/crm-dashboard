import { useEffect, useState } from 'react'

/** Re-renders the component every `ms` so relative times ("2 min ago") stay fresh. */
export function useTick(ms = 30_000): number {
  const [n, setN] = useState(0)
  useEffect(() => { const id = setInterval(() => setN((x) => x + 1), ms); return () => clearInterval(id) }, [ms])
  return n
}

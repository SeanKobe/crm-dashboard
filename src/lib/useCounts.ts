import { useEffect, useState } from 'react'
import { getCounts, subscribeCounts, type Counts } from '../services/counts'

/** Live Favorites counts, or null until the first read finishes. Updates when contacts or deals change. */
export function useCounts(): Counts | null {
  const [counts, setCounts] = useState<Counts | null>(null)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let live = true
    getCounts().then((c) => { if (live) setCounts(c) }).catch(() => {})
    return () => { live = false }
  }, [tick])
  useEffect(() => subscribeCounts(() => setTick((t) => t + 1)), [])
  return counts
}

const LIVE: Record<string, keyof Counts> = { Companies: 'companies', Contacts: 'contacts', Meetings: 'meetings' }
/** The count to show for a Favorites row: live for the three built-in rows (hidden until loaded), the stored one for the rest. */
export function favoriteCount(label: string, stored: string, counts: Counts | null): string | undefined {
  const key = LIVE[label]
  if (!key) return stored
  return counts ? counts[key].toLocaleString('en-US') : undefined
}

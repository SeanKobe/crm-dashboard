import { useEffect, useState } from 'react'
import { Check, RefreshCw } from 'lucide-react'
import { lastUpdated } from '../../data/mock'
import { cn } from '../../lib/cn'

// "Last updated now" keeps real time ("2 min ago"). Clicking refreshes: the icon spins briefly, then the text resets.
const label = (minutes: number): string => (minutes < 1 ? lastUpdated : `Last updated ${minutes} min ago`)
export function LastUpdated() {
  const [updatedAt, setUpdatedAt] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())
  const [spinning, setSpinning] = useState(false)
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 10_000); return () => clearInterval(id) }, [])
  useEffect(() => {
    if (!spinning) return undefined
    const id = setTimeout(() => { setSpinning(false); setUpdatedAt(Date.now()); setNow(Date.now()) }, 800)
    return () => clearTimeout(id)
  }, [spinning])
  const minutes = Math.floor((now - updatedAt) / 60_000)
  return (
    <button type="button" onClick={() => !spinning && setSpinning(true)} aria-label={`${label(minutes)}. Refresh`} className="group flex items-center gap-2 rounded-md text-sm text-success outline-none focus-ring">
      <span className="relative size-4.5">
        <Check className={cn('absolute inset-0 size-4.5 transition-opacity duration-hover ease-out group-hover:opacity-0', spinning && 'opacity-0')} strokeWidth={2} />
        <RefreshCw className={cn('absolute inset-0 size-4.5 opacity-0 transition-opacity duration-hover ease-out group-hover:opacity-100', spinning && 'animate-spin-once opacity-100')} strokeWidth={2} />
      </span>
      <span className="leading-4.25">{label(minutes)}</span>
    </button>
  )
}

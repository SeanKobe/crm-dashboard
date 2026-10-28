import type { Change } from '../types'

// Percent change between two values, shaped for ChangeBadge.
export function percentChange(current: number, previous: number): Change {
  const pct = previous ? Math.round(((current - previous) / previous) * 100) : 0
  return { direction: pct >= 0 ? 'up' : 'down', text: `${Math.abs(pct)}%` }
}

// Revenue series are stored in thousands; 18.2 -> "$18.200".
export const money = (thousands: number): string => `$${Math.round(thousands * 1000).toLocaleString('de-DE')}`

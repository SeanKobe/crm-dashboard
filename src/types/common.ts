import type { LucideIcon } from 'lucide-react'

export type IconComponent = LucideIcon

/** Tints used by Avatar and the data (maps to theme colors in the Avatar). */
export type Tone = 'purple' | 'green' | 'orange' | 'red' | 'amber'

export type ChartRange = '1D' | '1W' | '1M' | '6M' | '1Y' | 'ALL'

export type ChangeDirection = 'up' | 'down'

/** A change shaped for ChangeBadge: direction plus the already formatted text ("4%"). */
export interface Change {
  direction: ChangeDirection
  text: string
}

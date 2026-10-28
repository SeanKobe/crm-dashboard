import type { RetentionSeriesKey } from '../../types'

// Stack order is top to bottom; each series maps to a theme color (no hardcoded values).
export const seriesTone: Record<RetentionSeriesKey, string> = {
  smes: 'bg-primary-soft',
  startups: 'bg-primary/45',
  enterprises: 'bg-primary',
}


// Outline colors for a hidden series' legend dot (same hues as seriesTone).
export const seriesOutline: Record<RetentionSeriesKey, string> = {
  smes: 'border-primary-soft',
  startups: 'border-primary/45',
  enterprises: 'border-primary',
}

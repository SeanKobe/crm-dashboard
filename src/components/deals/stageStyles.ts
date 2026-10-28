import type { Priority, Stage } from '../../types'
import type { TagTone } from '../ui/Tag'

// Stage colors for Status Pill, column dots and the Select options. Text colors are the contrast-safe variants.
export const stageStyle: Record<Stage, { dot: string; tint: string; text: string }> = {
  new: { dot: 'bg-text-secondary', tint: 'bg-text-secondary/12', text: 'text-text-secondary' },
  contacted: { dot: 'bg-warning', tint: 'bg-warning/12', text: 'text-warning-foreground' },
  qualified: { dot: 'bg-primary', tint: 'bg-primary/12', text: 'text-primary' },
  proposal: { dot: 'bg-info', tint: 'bg-info/12', text: 'text-info-strong' },
  won: { dot: 'bg-success', tint: 'bg-success/12', text: 'text-success-strong' },
  lost: { dot: 'bg-danger', tint: 'bg-danger/12', text: 'text-danger-strong' },
}

export const priorityTone: Record<Priority, TagTone> = { high: 'danger', medium: 'warning', low: 'neutral' }

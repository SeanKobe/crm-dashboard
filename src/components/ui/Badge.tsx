import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

// Figma "Badge": count pill. Tone (Neutral / Primary / Success / Danger) x Style (Solid / Soft).
export type BadgeTone = 'neutral' | 'primary' | 'success' | 'danger'
const soft: Record<BadgeTone, string> = {
  neutral: 'bg-text-secondary/14 text-text-secondary',
  primary: 'bg-primary/14 text-primary',
  success: 'bg-success/14 text-success-strong',
  danger: 'bg-danger/14 text-danger-strong',
}
const solid: Record<BadgeTone, string> = {
  neutral: 'bg-text-secondary text-primary-foreground',
  primary: 'bg-primary text-primary-foreground',
  success: 'bg-success text-primary-foreground',
  danger: 'bg-danger text-danger-foreground',
}

export interface BadgeProps {
  tone?: BadgeTone
  variant?: 'soft' | 'solid'
  children: ReactNode
  className?: string
}

export function Badge({ tone = 'neutral', variant = 'soft', children, className }: BadgeProps) {
  return <span className={cn('inline-flex items-center justify-center rounded-full px-1.5 py-px text-xs font-medium leading-3.75 tabular-nums', variant === 'soft' ? soft[tone] : solid[tone], className)}>{children}</span>
}

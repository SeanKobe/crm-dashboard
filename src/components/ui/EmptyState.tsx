import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import type { IconComponent } from '../../types'

// Figma "Empty State": 56px tinted icon ring, Heading/Small title, Body description and one action. Types: Default, No Results, Error, First Run.
export interface EmptyStateProps {
  icon: IconComponent
  title: string
  description: string
  action?: ReactNode
  tone?: 'primary' | 'danger'
  /** Smaller paddings for use inside a column. */
  compact?: boolean
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, tone = 'primary', compact = false, className }: EmptyStateProps) {
  return (
    <div role={tone === 'danger' ? 'alert' : undefined} className={cn('flex flex-col items-center gap-3 text-center', compact ? 'p-4' : 'p-8', className)}>
      <span className="relative grid size-14 place-items-center rounded-full">
        <span aria-hidden className={cn('absolute inset-0 rounded-full opacity-12', tone === 'danger' ? 'bg-danger' : 'bg-primary')} />
        <Icon className={cn('relative size-5', tone === 'danger' ? 'text-danger-strong' : 'text-primary')} strokeWidth={1.75} />
      </span>
      <h2 className="text-base font-medium">{title}</h2>
      <p className="max-w-74 text-sm leading-4.25 text-text-secondary">{description}</p>
      {action}
    </div>
  )
}

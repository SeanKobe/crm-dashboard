import type { ReactNode } from 'react'
import { EllipsisVertical } from 'lucide-react'
import type { WidgetId } from '../../types'
import { useLoaded } from '../../context/loadedContext'
import { cn } from '../../lib/cn'
import { IconButton } from '../ui/IconButton'
import { SkeletonOverlay } from '../ui/Skeleton'
import { WidgetMenu } from './WidgetMenu'

// Figma Card: surface, border, radius-lg, shadow-card. A skeleton covers it for the first ~600ms.
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  const loaded = useLoaded()
  return (
    <section className={cn('relative rounded-lg border border-border bg-surface shadow-card', className)}>
      {children}
      <SkeletonOverlay show={!loaded} />
    </section>
  )
}

export interface CardHeaderProps {
  title: string
  /** Adds the widget "more" menu (Export, Refresh, Remove). */
  widgetId?: WidgetId
  /** Replaces the default trailing control. */
  children?: ReactNode
}

export function CardHeader({ title, widgetId, children }: CardHeaderProps) {
  return (
    <header className="flex items-center justify-between">
      <h2 className="text-sm font-medium">{title}</h2>
      {children ?? (widgetId ? <WidgetMenu id={widgetId} title={title} /> : <IconButton icon={EllipsisVertical} label={`${title} options`} size="sm" />)}
    </header>
  )
}

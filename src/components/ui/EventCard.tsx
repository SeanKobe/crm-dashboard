import { ChevronRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Avatar } from './Avatar'
import type { CalendarEvent } from '../../types'

// Figma "EventCard": Default / Hover (surface-muted) / Focus. It lifts on hover, the avatar stack spreads, and the pill's arrow nudges.
export type EventCardProps = Omit<CalendarEvent, 'id' | 'people'> & Partial<Pick<CalendarEvent, 'people'>>

export function EventCard({ title, time, extra, platform, people = [] }: EventCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-md bg-surface-subtle p-3 transition-[background-color,transform,translate,scale,box-shadow] duration-hover ease-out hover:-translate-y-0.5 hover:bg-surface-muted hover:shadow-control focus-within:bg-surface-muted focus-within:ring-[3px] focus-within:ring-focus-ring motion-reduce:transition-none">
      <div className="flex items-center gap-2">
        <span className="flex-1 text-sm font-medium leading-4.25">{title}</span>
        <span className="text-xs leading-3.75 text-text-secondary">{time}</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="group/stack flex items-center gap-1">
          <div className="flex">
            {people.map((p, i) => (
              <span key={i} className={cn('rounded-full ring-2 ring-surface transition-[margin] duration-hover ease-out motion-reduce:transition-none', i > 0 && '-ml-1.5 group-hover/stack:ml-0.5')}>
                <Avatar initial={p.initial} tone={p.tone} size="L" className="ring-0" />
              </span>
            ))}
          </div>
          {extra && <span className="text-xs leading-3.75 text-primary">{extra}</span>}
        </div>
        <button type="button" className="group/pill flex items-center gap-1 rounded-sm border border-border bg-surface px-2.5 py-1.25 text-xs font-medium leading-3.75 outline-none transition-[background-color,border-color,transform,translate,scale] duration-hover ease-out hover:border-border-strong hover:bg-surface-subtle active:scale-[0.97] focus-ring motion-reduce:transition-none">
          {platform}
          <ChevronRight className="size-3.5 text-text-secondary transition-transform duration-hover ease-out group-hover/pill:translate-x-0.5" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  )
}

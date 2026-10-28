import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { rangeTitle } from '../../lib/calendarLogic'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { SegmentedFilter } from '../ui/SegmentedFilter'
import { Tooltip } from '../ui/Tooltip'
import type { CalendarViewMode } from '../../types'
import type { ReactNode } from 'react'

// Toolbar: Today, previous / next, the range title, the Month / Week / Day / Agenda switch and "New event". Shortcuts show in tooltips.
const LABEL: Record<CalendarViewMode, 'Month' | 'Week' | 'Day' | 'Agenda'> = { month: 'Month', week: 'Week', day: 'Day', agenda: 'Agenda' }
const BY_LABEL: Record<string, CalendarViewMode> = { Month: 'month', Week: 'week', Day: 'day', Agenda: 'agenda' }
const NAV: Record<CalendarViewMode, string> = { month: 'month', week: 'week', day: 'day', agenda: 'month' }

export interface CalendarToolbarProps {
  view: CalendarViewMode
  date: string
  onToday: () => void
  onShift: (dir: 1 | -1) => void
  onView: (v: CalendarViewMode) => void
  onNew: () => void
  /** Below 1024px the mini calendar and layers live behind this control. */
  sidebarTrigger?: ReactNode
}

export function CalendarToolbar({ view, date, onToday, onShift, onView, onNew, sidebarTrigger }: CalendarToolbarProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-3" role="toolbar" aria-label="Calendar controls">
      {sidebarTrigger}
      <Tooltip content="Go to today (T)">{(tip) => <span {...tip} className="inline-flex"><Button onClick={onToday}>Today</Button></span>}</Tooltip>
      <span className="flex gap-1">
        <Tooltip content={`Previous ${NAV[view]} (K or ←)`}>{(tip) => <span {...tip} className="inline-flex"><IconButton icon={ChevronLeft} label={`Previous ${NAV[view]}`} size="lg" onClick={() => onShift(-1)} /></span>}</Tooltip>
        <Tooltip content={`Next ${NAV[view]} (J or →)`}>{(tip) => <span {...tip} className="inline-flex"><IconButton icon={ChevronRight} label={`Next ${NAV[view]}`} size="lg" onClick={() => onShift(1)} /></span>}</Tooltip>
      </span>
      <h2 className="min-w-0 text-lg font-medium leading-6" aria-live="polite" data-range-title>{rangeTitle(view, date)}</h2>
      <span className="flex-1" />
      <SegmentedFilter<'Month' | 'Week' | 'Day' | 'Agenda'> label="Calendar view" tone="strong" options={['Month', 'Week', 'Day', 'Agenda']} value={LABEL[view]} onChange={(l) => onView(BY_LABEL[l])} hints={{ Month: 'Month view (M)', Week: 'Week view (W)', Day: 'Day view (D)', Agenda: 'Agenda view (A)' }} />
      <Tooltip content="New event (N)">{(tip) => <span {...tip} className="inline-flex"><Button variant="primary" icon={Plus} onClick={onNew}>New event</Button></span>}</Tooltip>
    </div>
  )
}

export const CalendarButtonIcon = CalendarDays

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { DEMO_TODAY } from '../../lib/dates'
import { addMonths, longDate, monthGrid, monthName, sameMonth } from '../../lib/calendarLogic'
import { CalendarDay } from '../ui/CalendarDay'
import { IconButton } from '../ui/IconButton'

// Mini month for jumping to a date. Today is the purple circle, the date being viewed is outlined.
export function MiniCalendar({ date, onPick }: { date: string; onPick: (day: string) => void }) {
  const [shown, setShown] = useState(date)
  const [seen, setSeen] = useState(date)
  if (seen !== date) { setSeen(date); setShown(date) }
  const days = monthGrid(shown)
  return (
    <div className="flex flex-col gap-2" data-mini-calendar>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium" aria-live="polite">{monthName(shown)} {shown.slice(0, 4)}</h3>
        <span className="flex gap-1">
          <IconButton icon={ChevronLeft} label="Previous month" size="xs" onClick={() => setShown(addMonths(shown, -1))} />
          <IconButton icon={ChevronRight} label="Next month" size="xs" onClick={() => setShown(addMonths(shown, 1))} />
        </span>
      </div>
      <div className="grid grid-cols-7 place-items-center gap-y-0.5" role="grid" aria-label={`${monthName(shown)} ${shown.slice(0, 4)}`}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((h, i) => <span key={i} role="columnheader" aria-hidden className="grid size-8 place-items-center text-xs font-medium text-text-secondary">{h}</span>)}
        {days.map((d) => <CalendarDay key={d} size="sm" day={Number(d.slice(8))} today={d === DEMO_TODAY} selected={d === date && d !== DEMO_TODAY} muted={!sameMonth(d, shown)} label={longDate(d)} onClick={() => onPick(d)} />)}
      </div>
    </div>
  )
}

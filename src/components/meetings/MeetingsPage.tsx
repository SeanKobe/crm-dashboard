import { CalendarDays, SearchX } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { Link, useMatch, useNavigate, useSearchParams } from 'react-router'
import { useToast } from '../../context/toastContext'
import { cn } from '../../lib/cn'
import { dateOf, eventTimeText } from '../../lib/calendarLogic'
import { formatShort } from '../../lib/dates'
import { motion, prefersReducedMotion } from '../../lib/motion'
import { recordPath } from '../../lib/recordPath'
import { useEvent } from '../../lib/useEvents'
import { useMeetings } from '../../lib/useMeetings'
import { eventsService } from '../../services/events'
import { groupMeetings, MEETING_PLATFORMS, MEETING_STATUSES, type Meeting } from '../../services/meetings'
import type { EventPlatform, EventStatus, ScheduleEvent } from '../../types'
import { EventDrawerBody } from '../calendar/EventDrawer'
import { platformIcon } from '../calendar/eventMeta'
import { Button } from '../ui/Button'
import { Drawer } from '../ui/Drawer'
import { EmptyState } from '../ui/EmptyState'
import { Highlight } from '../ui/Highlight'
import { SearchInput } from '../ui/SearchInput'
import { Select } from '../ui/Select'
import { SkeletonBlock, SkeletonLine } from '../ui/Skeleton'
import { Tag, type TagTone } from '../ui/Tag'

// Meetings (/meetings): the Meeting-type events of the Calendar, split into Upcoming (today and later) and Past by the app's fixed today.
// /meetings/:id opens the same event details as the Calendar.
const STATUS_TONE: Record<EventStatus, TagTone> = { Scheduled: 'primary', Completed: 'success', Cancelled: 'neutral' }
const STATUS_OPTIONS: { value: EventStatus | 'all'; label: string }[] = [{ value: 'all', label: 'All statuses' }, ...MEETING_STATUSES.map((s) => ({ value: s, label: s }))]
const PLATFORM_OPTIONS: { value: EventPlatform | 'all'; label: string }[] = [{ value: 'all', label: 'All platforms' }, ...MEETING_PLATFORMS.map((p) => ({ value: p, label: p }))]
const TH = 'px-3 text-left text-xs font-medium text-text-secondary'

const matchesMeeting = (m: Meeting, query: string): boolean => {
  const q = query.trim().toLowerCase()
  return !q || `${m.event.title} ${m.linked?.name ?? ''} ${m.event.platform ?? ''} ${m.event.location}`.toLowerCase().includes(q)
}

function MeetingTable({ title, meetings, query, openId }: { title: string; meetings: Meeting[]; query: string; openId: string | null }) {
  return (
    <section aria-label={`${title} meetings`} data-meetings-group={title.toLowerCase()} className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
      <h2 className="flex h-11 items-center gap-2 border-b border-border px-4 text-sm font-medium">{title}<span className="text-text-secondary tabular-nums">{meetings.length}</span></h2>
      {meetings.length === 0 ? (
        <p className="px-4 py-6 text-center text-compact text-text-secondary">{title === 'Upcoming' ? 'No upcoming meetings match.' : 'No past meetings match.'}</p>
      ) : (
        <table className="w-full table-fixed border-collapse">
          <caption className="sr-only">{title} meetings</caption>
          <thead>
            <tr className="h-9 bg-surface-subtle shadow-[inset_0_-1px_0_var(--color-border)]">
              <th scope="col" className={cn(TH, 'pl-4')}>Meeting</th>
              <th scope="col" className={cn(TH, 'w-44')}>Date and time</th>
              <th scope="col" className={cn(TH, 'w-32 max-xl:hidden')}>Platform</th>
              <th scope="col" className={cn(TH, 'w-28')}>Status</th>
              <th scope="col" className={cn(TH, 'w-44 pr-4 max-lg:hidden')}>Company or contact</th>
            </tr>
          </thead>
          <tbody>
            {meetings.map(({ event: e, linked }) => {
              const Icon = e.platform ? platformIcon[e.platform] : null
              const href = linked ? recordPath(linked) ?? (linked.type === 'company' ? `/companies/${linked.id}` : null) : null
              return (
                <tr key={e.id} data-meeting-id={e.id} className={cn('h-14 border-b border-border transition-colors duration-hover ease-out last:border-b-0 motion-reduce:transition-none hover:bg-surface-subtle', openId === e.id && 'bg-primary-soft')}>
                  <th scope="row" className="pl-4 text-left font-normal">
                    <Link to={`/meetings/${e.id}`} className={cn('block truncate rounded-sm text-sm font-medium outline-none focus-ring', e.status === 'Cancelled' && 'line-through')}><Highlight text={e.title} query={query} /></Link>
                    {linked && <span className="block truncate text-xs text-text-secondary lg:hidden">{linked.name}</span>}
                  </th>
                  <td className="px-3 text-compact"><span className="block truncate">{formatShort(dateOf(e.start))}</span><span className="block truncate text-xs text-text-secondary">{eventTimeText(e)}</span></td>
                  <td className="px-3 text-compact max-xl:hidden"><span className="flex items-center gap-1.5">{Icon && <Icon aria-hidden className="size-4 shrink-0 text-text-secondary" strokeWidth={1.75} />}<span className="truncate"><Highlight text={e.platform ?? '—'} query={query} /></span></span></td>
                  <td className="px-3"><Tag tone={STATUS_TONE[e.status]}>{e.status}</Tag></td>
                  <td className="px-3 pr-4 text-compact max-lg:hidden">
                    {linked && href ? <Link to={href} className="block truncate rounded-sm text-primary outline-none hover:underline focus-ring"><Highlight text={linked.name} query={query} /></Link> : linked ? linked.name : <span className="text-text-muted">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </section>
  )
}

export function MeetingsPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const errorFlag = params.get('error') === '1'
  const toast = useToast()
  const openId = useMatch('/meetings/:id')?.params.id ?? null
  const { data, status, error, reload: reloadList } = useMeetings(prefersReducedMotion() ? 0 : motion.skeleton, errorFlag)
  const reload = () => { setParams((p) => { p.delete('error'); return p }, { replace: true }); reloadList() }
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all')
  const [platformFilter, setPlatformFilter] = useState<EventPlatform | 'all'>('all')
  const filtered = useMemo(() => (data ?? []).filter((m) => (statusFilter === 'all' || m.event.status === statusFilter) && (platformFilter === 'all' || m.event.platform === platformFilter) && matchesMeeting(m, query)), [data, query, statusFilter, platformFilter])
  const groups = useMemo(() => groupMeetings(filtered), [filtered])
  const filtering = Boolean(query.trim()) || statusFilter !== 'all' || platformFilter !== 'all'
  const clearFilters = () => { setQuery(''); setStatusFilter('all'); setPlatformFilter('all') }
  const close = useCallback(() => navigate('/meetings'), [navigate])
  const [shownId, setShownId] = useState(openId)
  if (openId && openId !== shownId) setShownId(openId)
  const { event: shown } = useEvent(shownId)

  const remove = async (e: ScheduleEvent) => {
    await eventsService.delete(e.id)
    close()
    toast({ type: 'info', title: `Deleted ${e.title}`, action: { label: 'Undo', onClick: () => { void eventsService.restore(e.id) } } })
  }
  const duplicate = async (e: ScheduleEvent) => {
    const copy = await eventsService.create({ title: `Copy of ${e.title}`, type: e.type, start: e.start, end: e.end, allDay: e.allDay, platform: e.platform, location: e.location, attendees: e.attendees, links: e.links, description: e.description, ownerId: e.ownerId })
    toast({ type: 'success', title: 'Event duplicated', message: copy.title, action: { label: 'Undo', onClick: () => { void eventsService.delete(copy.id) } } })
  }

  if (status === 'error' && !data) {
    return (
      <div className="grid flex-1 place-items-center rounded-lg border border-border bg-surface shadow-card">
        <EmptyState icon={CalendarDays} tone="danger" title="We couldn’t load the meetings" description={error ?? 'Something went wrong while loading.'} action={<Button variant="primary" onClick={reload}>Retry</Button>} />
      </div>
    )
  }
  const loading = status === 'loading' && !data
  const total = data?.length ?? 0
  const shownCount = groups.upcoming.length + groups.past.length

  const drawerBody = !shownId ? null : shown === undefined ? (
    <div role="status" aria-busy="true" aria-label="Loading event" className="flex flex-col gap-3 p-6"><SkeletonLine className="h-6 w-56" /><SkeletonBlock className="h-40" /></div>
  ) : shown === null ? (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h2 className="text-base font-medium">We couldn’t find that meeting</h2>
      <p className="max-w-72 text-sm leading-4.25 text-text-secondary">No event matches “{shownId}”. It may have been removed, or the link is wrong.</p>
      <Button variant="primary" onClick={close}>Back to meetings</Button>
    </div>
  ) : shown.deletedAt ? (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h2 className="text-base font-medium">This event was deleted</h2>
      <p className="max-w-72 text-sm leading-4.25 text-text-secondary">“{shown.title}” is in the trash. You can bring it back.</p>
      <div className="flex gap-2"><Button onClick={close}>Close</Button><Button variant="primary" onClick={() => { void eventsService.restore(shown.id) }}>Restore event</Button></div>
    </div>
  ) : <EventDrawerBody key={shown.id} event={shown} onClose={close} onDuplicate={(e) => { void duplicate(e) }} onDelete={(e) => { void remove(e) }} onViewConflict={(id) => navigate(`/meetings/${id}`)} />

  return (
    <div className="flex flex-1 flex-col gap-4 animate-fade-in">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput label="Search meetings" placeholder="Search meetings, companies, contacts" value={query} onChange={setQuery} className="w-80 max-sm:w-full" />
        <Select label="Status" hideLabel className="w-44" value={statusFilter} options={STATUS_OPTIONS} onChange={setStatusFilter} />
        <Select label="Platform" hideLabel className="w-44" value={platformFilter} options={PLATFORM_OPTIONS} onChange={setPlatformFilter} />
        {filtering && <Button onClick={clearFilters}>Clear filters</Button>}
        <p role="status" aria-live="polite" className="ml-auto text-compact text-text-secondary">{loading ? 'Loading meetings…' : `${shownCount} of ${total} ${total === 1 ? 'meeting' : 'meetings'}`}</p>
      </div>
      {loading ? (
        <div role="status" aria-label="Loading meetings" aria-busy="true" className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-card">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="flex items-center gap-6"><SkeletonLine className="h-4 w-56" /><SkeletonLine className="ml-auto w-28" /><SkeletonLine className="w-20" /><SkeletonLine className="w-16" /><SkeletonLine className="w-28" /></div>)}
        </div>
      ) : total === 0 ? (
        <div className="grid flex-1 place-items-center rounded-lg border border-border bg-surface shadow-card"><EmptyState icon={CalendarDays} title="No meetings yet" description="Meetings you add to the Calendar show up here, grouped as upcoming and past." action={<Button variant="primary" onClick={() => navigate('/calendar')}>Open the Calendar</Button>} /></div>
      ) : shownCount === 0 ? (
        <div className="grid flex-1 place-items-center rounded-lg border border-border bg-surface shadow-card"><EmptyState icon={SearchX} title="No meetings match" description="Try a different search or clear the filters." action={<Button onClick={clearFilters}>Clear filters</Button>} /></div>
      ) : (
        <>
          <MeetingTable title="Upcoming" meetings={groups.upcoming} query={query} openId={openId} />
          <MeetingTable title="Past" meetings={groups.past} query={query} openId={openId} />
        </>
      )}
      <Drawer open={Boolean(openId)} onClose={close} title={shown ? `Event details: ${shown.title}` : 'Event details'} returnFocus={() => document.querySelector<HTMLElement>(`[data-meeting-id="${shownId}"] a`)}>{drawerBody}</Drawer>
    </div>
  )
}

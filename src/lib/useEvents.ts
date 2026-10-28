import { useEffect, useRef, useState } from 'react'
import { configureEventsService, eventsService, subscribeEvents, type EventListOptions } from '../services/events'
import { listDerived, subscribeDerived } from '../services/calendarLayers'
import type { DerivedItem, EventRange, ScheduleEvent } from '../types'

// Data hooks for the calendar. They only talk to the services. useEvents(range) loads the events in a range and stays in step with
// every write; useEvent(id) loads one event; useDerivedItems(range) loads the read-only deal-close and follow-up items.
export type EventsStatus = 'loading' | 'ready' | 'error'

export interface UseEvents {
  events: ScheduleEvent[]
  status: EventsStatus
  error: string | null
  reload: () => void
}

let firstLoadDone = false
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

export function useEvents(range: EventRange, options: EventListOptions & { minLoadMs?: number; simulateError?: boolean } = {}): UseEvents {
  const { linkId, attendeeId, minLoadMs = 0, simulateError } = options
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [status, setStatus] = useState<EventsStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const rangeRef = useRef(range)
  useEffect(() => { rangeRef.current = range })

  useEffect(() => {
    let live = true
    if (simulateError !== undefined) configureEventsService({ failReads: simulateError })
    const wait = !firstLoadDone && minLoadMs ? sleep(minLoadMs) : Promise.resolve()
    Promise.all([eventsService.list(rangeRef.current, { linkId, attendeeId }), wait])
      .then(([rows]) => { if (!live) return; firstLoadDone = true; setEvents(rows); setError(null); setStatus('ready') })
      .catch((e: unknown) => { if (!live) return; setError(e instanceof Error ? e.message : 'Could not load events.'); setStatus('error') })
    return () => { live = false }
  }, [range.from, range.to, linkId, attendeeId, minLoadMs, simulateError, tick])

  // Writes arrive as events: apply them straight away (no refetch), so moves and edits never flicker back.
  useEffect(() => subscribeEvents((e) => {
    const r = rangeRef.current
    setEvents((list) => {
      let next = list
      for (const ev of e.events) {
        const rest = next.filter((x) => x.id !== ev.id)
        const inRange = ev.start.slice(0, 10) <= r.to && ev.end.slice(0, 10) >= r.from && (!linkId || ev.links.some((l) => l.id === linkId)) && (!attendeeId || ev.attendees.some((a) => a.id === attendeeId))
        next = ev.deletedAt === null && inRange ? [...rest, ev] : rest
      }
      return next === list ? list : [...next].sort((a, b) => a.start.localeCompare(b.start))
    })
  }), [linkId, attendeeId])
  return { events, status, error, reload: () => { setStatus('loading'); setTick((t) => t + 1) } }
}

export function useEvent(id: string | null): { event: ScheduleEvent | null | undefined } {
  const [state, setState] = useState<{ id: string | null; event: ScheduleEvent | null | undefined }>({ id, event: undefined })
  useEffect(() => {
    if (!id) return undefined
    let live = true
    eventsService.get(id).then((e) => { if (live) setState({ id, event: e }) }).catch(() => { if (live) setState({ id, event: null }) })
    return () => { live = false }
  }, [id])
  useEffect(() => subscribeEvents((e) => {
    const hit = e.events.find((x) => x.id === id)
    if (hit) setState({ id, event: hit })
  }), [id])
  return state.id === id ? { event: state.event } : { event: undefined }
}

export function useDerivedItems(range: EventRange, enabled: boolean): DerivedItem[] {
  const [items, setItems] = useState<DerivedItem[]>([])
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!enabled) return undefined
    let live = true
    listDerived({ from: range.from, to: range.to }).then((r) => { if (live) setItems(r) }).catch(() => {})
    return () => { live = false }
  }, [range.from, range.to, enabled, tick])
  useEffect(() => subscribeDerived(() => setTick((t) => t + 1)), [])
  return enabled ? items : []
}

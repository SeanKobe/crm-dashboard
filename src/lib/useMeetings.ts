import { useCallback } from 'react'
import { configureEventsService } from '../services/events'
import { meetingsService, subscribeMeetings, type Meeting } from '../services/meetings'
import { useLiveList, type LiveList } from './useLiveList'

/** `simulateError` is the test hook (?error=1): reads fail until it is removed. */
export function useMeetings(minLoadMs = 0, simulateError = false): LiveList<Meeting[]> {
  const load = useCallback(() => { configureEventsService({ failReads: simulateError }); return meetingsService.list() }, [simulateError])
  return useLiveList(load, subscribeMeetings, minLoadMs)
}

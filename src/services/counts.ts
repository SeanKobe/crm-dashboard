import { companiesService, subscribeCompanies } from './companies'
import { countMeetings, subscribeEvents } from './events'
import { listRecords, subscribeRecords } from './records'

// Live counts for the sidebar Favorites rows. Contacts = contacts that are not soft-deleted; Companies = distinct companies across
// contacts and deals (the same list the Companies page shows); Meetings = events of type Meeting in the events service (not deleted). Kept out of the sidebar component on purpose.
export interface Counts {
  contacts: number
  companies: number
  meetings: number
}

export async function getCounts(): Promise<Counts> {
  const [records, companies, meetings] = await Promise.all([listRecords(), companiesService.count(), countMeetings()])
  return {
    contacts: records.filter((r) => r.type === 'contact' && !r.deleted).length,
    companies,
    meetings,
  }
}

/** Calls `fn` whenever something that changes a count is written (contacts, deals or events). */
export function subscribeCounts(fn: () => void): () => void {
  const a = subscribeRecords(fn)
  const b = subscribeEvents(fn)
  const c = subscribeCompanies(fn)
  return () => { a(); b(); c() }
}

export const countsService = { get: getCounts }

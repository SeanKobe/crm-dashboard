import { buildReport, resolvePeriod } from '../lib/reportsLogic'
import { subscribeDeals, dealsService } from './deals'
import { contactsService, subscribeContacts } from './contacts'
import { eventsService, subscribeEvents } from './events'
import type { ReportData, ReportPrefs } from '../types'

// Reports are derived on request from the deals, contacts and events services: nothing is stored, so a report always agrees with
// the Deals, Contacts and Calendar pages. `failReads` lets the page show its error state (?error=1).
export interface ReportsServiceConfig { failReads?: boolean }
let failReads = false
export function configureReportsService(c: ReportsServiceConfig): void { if (c.failReads !== undefined) failReads = c.failReads }

export class ReportsServiceError extends Error {
  constructor(message: string) { super(message); this.name = 'ReportsServiceError' }
}

export async function getReport(prefs: Pick<ReportPrefs, 'range' | 'from' | 'to' | 'compare'>): Promise<ReportData> {
  if (failReads) { await new Promise((r) => setTimeout(r, 150)); throw new ReportsServiceError('Could not load reports.') }
  const period = resolvePeriod(prefs)
  const [deals, contacts, events] = await Promise.all([
    dealsService.list(),
    contactsService.all(),
    eventsService.list({ from: period.from, to: period.to }),
  ])
  return buildReport({ deals, contacts, events }, period, prefs.compare)
}
/** Calls `fn` whenever something a report is built from changes (deals, contacts or events). */
export function subscribeReports(fn: () => void): () => void {
  const a = subscribeDeals(fn)
  const b = subscribeContacts(fn)
  const c = subscribeEvents(fn)
  return () => { a(); b(); c() }
}

export const reportsService = { get: getReport }

import { contactsService, subscribeContacts } from './contacts'
import { dealsService, subscribeDeals } from './deals'
import { addDays, daysBetween, DEMO_TODAY } from '../lib/dates'
import { allContactsQuery } from '../lib/useContacts'
import { FOLLOW_UP_DAYS, needsFollowUp } from '../lib/contactsLogic'
import type { DerivedItem, EventRange } from '../types'

// Read-only calendar items derived from other services: open deals' close dates, and the day each contact's follow-up is due.
export async function listDerived(range: EventRange): Promise<DerivedItem[]> {
  const [deals, contacts] = await Promise.all([dealsService.list(), contactsService.list(allContactsQuery)])
  const out: DerivedItem[] = []
  for (const d of deals) {
    if (d.stage === 'won' || d.stage === 'lost') continue
    if (d.closeDate >= range.from && d.closeDate <= range.to) out.push({ kind: 'deal-close', id: `close-${d.id}`, date: d.closeDate, title: `${d.title} closes`, recordId: d.id, recordType: 'deal', overdue: d.closeDate < DEMO_TODAY })
  }
  for (const c of contacts.items) {
    if (!needsFollowUp(c)) continue
    const due = addDays((c.lastContactedAt ?? c.createdAt).slice(0, 10), FOLLOW_UP_DAYS + 1)
    if (due >= range.from && due <= range.to) out.push({ kind: 'follow-up', id: `follow-${c.id}`, date: due, title: `Follow up with ${c.name}`, recordId: c.id, recordType: 'contact', overdue: daysBetween(due, DEMO_TODAY) > 0 })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title))
}

export function subscribeDerived(fn: () => void): () => void {
  const a = subscribeDeals(fn)
  const b = subscribeContacts(fn)
  return () => { a(); b() }
}

import type { Contact, ContactActivity, ContactSource, LeadStatus } from '../types'
import { DEMO_TODAY, addDays } from '../lib/dates'
import { seedDeals } from './deals'
import { contactId } from './records'

// 62 sample contacts: the 24 people already named on deals (so deal and contact links line up) plus 38 more.
// Dates are relative to the fixed demo "today" (2025-10-20).
const at = (daysAgo: number, time = '10:00'): string => `${addDays(DEMO_TODAY, -daysAgo)}T${time}:00`
let seed = 20251020
const rnd = (): number => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }
const pick = <T,>(list: readonly T[]): T => list[Math.floor(rnd() * list.length)]

const SOURCES: ContactSource[] = ['Website', 'Referral', 'LinkedIn', 'Event', 'Cold outreach']
const TAGS = ['vip', 'enterprise', 'smb', 'partner', 'newsletter', 'event-2025', 'decision-maker', 'champion']
const OWNERS = ['o1', 'o2', 'o3', 'o4']
const domain = (company: string): string => `${company.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com`
const TITLES = ['VP of Operations', 'Head of Procurement', 'IT Director', 'Chief Operating Officer', 'Marketing Manager', 'Finance Director', 'Product Lead', 'Operations Manager', 'Founder', 'Sales Director', 'Office Manager', 'Chief Technology Officer']

const EXTRA: { name: string; company: string }[] = [
  ['Helena Brandt', 'Brandt & Sons'], ['Marcus Odom', 'Odom Logistics'], ['Yuki Tanaka', 'Tanaka Robotics'], ['Priscilla Ward', 'Wardline Media'], ['Diego Fuentes', 'Fuentes Agro'],
  ['Noor Haddad', 'Haddad Textiles'], ['Callum Reid', 'Reid Analytics'], ['Sienna Morales', 'Morales Dental'], ['Anders Holm', 'Holm Shipping'], ['Fatima Qureshi', 'Qureshi Pharma'],
  ['Declan Murphy', 'Murphy Builders'], ['Ayesha Khan', 'Khan Legal'], ['Tobias Lang', 'Lang Optics'], ['Imani Cole', 'Cole Studios'], ['Rafael Duarte', 'Duarte Coffee'],
  ['Linnea Berg', 'Berg Furniture'], ['Kwame Boateng', 'Boateng Energy'], ['Mei Lin', 'Lin Biotech'], ['Owen Gallagher', 'Gallagher Foods'], ['Zara Ahmed', 'Ahmed Retail'],
  ['Viktor Novak', 'Novak Software'], ['Camila Rojas', 'Rojas Travel'], ['Elliot Park', 'Parkside Realty'], ['Ines Carvalho', 'Carvalho Wines'], ['Hugo Lambert', 'Lambert Aero'],
  ['Tamsin Hale', 'Hale Education'], ['Joaquin Vega', 'Vega Mining'], ['Selin Aydin', 'Aydin Ceramics'], ['Bruno Costa', 'Costa Marine'], ['Naomi Fischer', 'Fischer Labs'],
  ['Arjun Mehta', 'Mehta Consulting'], ['Greta Olsen', 'Olsen Bikes'], ['Malik Brown', 'Brown Fitness'], ['Sofia Petrova', 'Petrova Design'], ['Leon Dubois', 'Dubois Hotels'],
  ['Hana Kimura', 'Kimura Foods'], ['Patrick Doyle', 'Doyle Insurance'], ['Rosa Mendes', 'Mendes Clinics'], ['Theo Becker', 'Becker Print'],
].slice(0, 38).map(([name, company]) => ({ name, company }))

const statusForStage: Record<string, LeadStatus> = { new: 'New', contacted: 'Contacted', qualified: 'Qualified', proposal: 'Qualified', won: 'Customer', lost: 'Unqualified' }
// Extra contacts: 14 New total, 14 Contacted, 12 Qualified, 8 Unqualified, 14 Customer overall across the 62.
const EXTRA_STATUSES: LeadStatus[] = ['New', 'New', 'New', 'New', 'New', 'New', 'New', 'New', 'New', 'Contacted', 'Contacted', 'Contacted', 'Contacted', 'Contacted', 'Contacted', 'Contacted', 'Contacted', 'Contacted', 'Qualified', 'Qualified', 'Qualified', 'Qualified', 'Qualified', 'Qualified', 'Qualified', 'Unqualified', 'Unqualified', 'Unqualified', 'Unqualified', 'Unqualified', 'Customer', 'Customer', 'Customer', 'Customer', 'Customer', 'Customer', 'Customer', 'Customer']

function activityFor(name: string, status: LeadStatus, ownerId: string, created: number, last: number | null, n: number): ContactActivity[] {
  const first = name.split(' ')[0]
  const list: ContactActivity[] = []
  if (last !== null) {
    list.push({ id: `${n}-a1`, kind: n % 2 ? 'call' : 'email', title: n % 2 ? `Call with ${first}` : `Email sent to ${first}`, description: n % 2 ? 'Discussed needs and timeline.' : 'Shared an overview and asked for a good time to talk.', ownerId, at: at(last, '11:30') })
    if (created - last > 6) list.push({ id: `${n}-a2`, kind: 'meeting', title: 'Intro meeting', description: 'Walked through the product and answered questions.', ownerId, at: at(Math.min(created - 2, last + 6), '15:00') })
  }
  if (status !== 'New') list.push({ id: `${n}-a3`, kind: 'status', title: `Status changed to ${status}`, description: `Moved to ${status}.`, ownerId, at: at(Math.max(0, created - 3), '09:30') })
  list.push({ id: `${n}-a0`, kind: 'note', title: 'Contact created', description: 'Added to the CRM.', ownerId, at: at(created, '09:00') })
  return list.sort((a, b) => b.at.localeCompare(a.at))
}

export function seedContacts(): Contact[] {
  const deals = seedDeals()
  const out: Contact[] = []
  let n = 0
  const make = (name: string, company: string, status: LeadStatus, dealIds: string[], noteIds: string[]): Contact => {
    n += 1
    const created = Math.floor(rnd() * 110) + (n % 9 === 0 ? 0 : 1)
    const recentlyNew = n % 7 === 0 ? Math.floor(rnd() * 6) : created
    const createdDays = status === 'New' && n % 3 === 0 ? Math.floor(rnd() * 6) : recentlyNew
    // Last contacted: overdue for roughly a quarter of the open leads, never for some brand-new ones.
    const overdue = (status === 'Contacted' || status === 'Qualified' || status === 'New') && n % 4 === 0
    const last: number | null = status === 'New' && n % 5 === 0 ? null : overdue ? 15 + Math.floor(rnd() * 40) : Math.min(createdDays, Math.floor(rnd() * 12))
    const ownerId = OWNERS[n % 4]
    const first = name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '')
    const lastName = name.split(' ').slice(-1)[0].toLowerCase().replace(/[^a-z]/g, '')
    return {
      id: contactId(name),
      name,
      email: `${first}.${lastName}@${domain(company)}`,
      phone: `+1 (${pick([212, 415, 312, 617, 206, 303])}) 555-${String(100 + Math.floor(rnd() * 899)).padStart(4, '0')}`,
      company,
      jobTitle: pick(TITLES),
      status,
      source: pick(SOURCES),
      ownerId,
      tags: [...new Set(Array.from({ length: Math.floor(rnd() * 3) }, () => pick(TAGS)))],
      createdAt: at(Math.max(createdDays, last ?? 0), '09:00'),
      lastContactedAt: last === null ? null : at(last, '11:30'),
      dealIds,
      noteIds,
      activity: activityFor(name, status, ownerId, Math.max(createdDays, last ?? 0), last, n),
      deletedAt: null,
    }
  }
  const noteLinks: Record<string, string[]> = { 'Ingrid Larsen': ['n-006'], 'Avery Brooks': ['n-010'] }
  const seen = new Set<string>()
  for (const d of deals) {
    if (!d.contact || seen.has(d.contact)) continue
    seen.add(d.contact)
    out.push(make(d.contact, d.company, statusForStage[d.stage], deals.filter((x) => x.contact === d.contact).map((x) => x.id), noteLinks[d.contact] ?? []))
  }
  EXTRA.forEach((e, i) => out.push(make(e.name, e.company, EXTRA_STATUSES[i], [], [])))
  return out
}

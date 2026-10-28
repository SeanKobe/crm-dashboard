// The demo lives in October 2025 (the same period as the Dashboard calendar), so "today" is fixed.
// That keeps the "Overdue" flags and "days in stage" stable no matter when the demo is opened.
export const DEMO_TODAY = '2025-10-20'
const DEMO_NOW_MS = new Date('2025-10-20T10:00:00').getTime()
const SESSION_START = Date.now()

/** Demo clock: starts at 10:00 on the demo day and runs in real time. */
export const demoNow = (): Date => new Date(DEMO_NOW_MS + (Date.now() - SESSION_START))
export const toISODate = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const pad = (n: number): string => String(n).padStart(2, '0')
/** Local date-time without a zone ("2025-10-20T10:05:00"), the same shape as the seed data so strings sort correctly. */
export const toLocalISO = (d: Date): string => `${toISODate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`

const DAY = 86_400_000
const dayStart = (iso: string): number => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

export const addDays = (iso: string, days: number): string => toISODate(new Date(dayStart(iso) + days * DAY + DAY / 2))
export const daysBetween = (fromIso: string, toIso: string): number => Math.round((dayStart(toIso) - dayStart(fromIso)) / DAY)

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** "Oct 12" (adds the year when it is not the demo year). */
export function formatShort(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${MONTHS[m - 1]} ${d}${y === 2025 ? '' : `, ${y}`}`
}

/** "Just now", "2 hours ago", "Yesterday", "5 days ago", "Oct 3". */
export function relativeTime(iso: string): string {
  const diff = demoNow().getTime() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = daysBetween(iso, toISODate(demoNow()))
  if (days === 1) return 'Yesterday'
  if (days < 14) return `${days} days ago`
  return formatShort(iso)
}

export const daysInStage = (stageSince: string): number => Math.max(0, daysBetween(stageSince, DEMO_TODAY))

/** "Just now", "2 min ago", "3 hr ago", "Yesterday", "5 days ago", "Oct 3" (compact form used in lists). */
export function shortRelative(iso: string): string {
  const min = Math.floor((demoNow().getTime() - new Date(iso).getTime()) / 60_000)
  if (min < 1) return 'Just now'
  if (min < 60) return `${min} min ago`
  const hours = Math.floor(min / 60)
  if (hours < 24 && daysBetween(iso, toISODate(demoNow())) === 0) return `${hours} hr ago`
  const days = daysBetween(iso, toISODate(demoNow()))
  if (days === 1) return 'Yesterday'
  if (days < 14) return `${days} days ago`
  return formatShort(iso)
}

export type DateGroup = 'Today' | 'This week' | 'Earlier'
/** Today, the previous six days ("This week"), or Earlier, relative to the demo clock. */
export function dateGroup(iso: string): DateGroup {
  const d = daysBetween(iso, toISODate(demoNow()))
  return d <= 0 ? 'Today' : d < 7 ? 'This week' : 'Earlier'
}
export const daysAgo = (iso: string): number => daysBetween(iso, toISODate(demoNow()))

/** "10/20/2025" for a stored "2025-10-20" ("" when empty). */
export const toDisplayDate = (iso: string): string => (iso ? `${iso.slice(5, 7)}/${iso.slice(8, 10)}/${iso.slice(0, 4)}` : '')
/** Progressive mm/dd/yyyy mask for whatever the person has typed so far. */
export function maskDate(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8)
  return d.length <= 2 ? d : d.length <= 4 ? `${d.slice(0, 2)}/${d.slice(2)}` : `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}
/** "2025-10-20" for a complete, real "10/20/2025"; null otherwise. */
export function parseDisplayDate(text: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text)
  if (!m) return null
  const [mo, da, ye] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const d = new Date(ye, mo - 1, da)
  if (ye < 1900 || d.getFullYear() !== ye || d.getMonth() !== mo - 1 || d.getDate() !== da) return null
  return `${m[3]}-${m[1]}-${m[2]}`
}
/** Message for a From/To pair where To is earlier than From; null when fine or when either end is empty. */
export const dateRangeError = (from: string, to: string): string | null => (from && to && to < from ? 'The end date can’t be before the start date.' : null)

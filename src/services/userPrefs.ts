import { remoteData } from '../lib/ids'
import { db } from './remote/db'
import { CURRENT_USER_ID } from './session'

// Each person's view settings (filters, views, sort, recent searches...) live in the browser for speed and, when the data is in
// Supabase, are mirrored to the `user_prefs` table so they follow the person to another browser. Reading stays synchronous (the pages
// read these while they render); writing sends the new value to the database a moment later; signing in pulls the saved values
// into the browser before the app opens. Failing to sync never interrupts anyone: the browser copy keeps working.
export type PrefId = 'deals' | 'contacts' | 'notes' | 'calendar' | 'reports' | 'projects' | 'search'
const STORAGE: Record<PrefId, string> = {
  deals: 'crm.deals.v1', // holds only these settings in Supabase mode (the deals themselves are in the database)
  contacts: 'crm.contacts.prefs.v1',
  notes: 'crm.notes.prefs.v1',
  calendar: 'crm.calendar.prefs.v1',
  reports: 'crm.reports.prefs.v1',
  projects: 'crm.projects.prefs.v1',
  search: 'crm.recent-searches',
}
const DEAL_FIELDS = ['filters', 'view', 'sort', 'collapsed'] as const
const timers = new Map<PrefId, number>()

function local(id: PrefId): unknown {
  try {
    const raw = localStorage.getItem(STORAGE[id])
    const v: unknown = raw ? JSON.parse(raw) : null
    if (id === 'deals' && v && typeof v === 'object') return Object.fromEntries(DEAL_FIELDS.filter((k) => k in (v as Record<string, unknown>)).map((k) => [k, (v as Record<string, unknown>)[k]]))
    return v
  } catch {
    return null
  }
}

/** Called after a setting is saved in the browser: sends the new value to the database shortly after (calendar scrolling and typing don't send every change). */
export function mirrorPref(id: PrefId): void {
  if (!remoteData) return
  window.clearTimeout(timers.get(id))
  timers.set(id, window.setTimeout(() => {
    timers.delete(id)
    const value = local(id)
    if (value === null) return
    void db().then((sb) => sb.from('user_prefs').upsert({ user_id: CURRENT_USER_ID, key: id, value }, { onConflict: 'user_id,key' })).catch(() => undefined)
  }, 800))
}

/** Pulls the signed-in person's saved settings into the browser (before the app renders). */
export async function hydratePrefs(): Promise<void> {
  try {
    const sb = await db()
    const { data } = await sb.from('user_prefs').select('key, value')
    for (const row of (data ?? []) as { key: PrefId; value: unknown }[]) {
      const key = STORAGE[row.key]
      if (!key) continue
      if (row.key === 'deals') {
        const prev = JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, unknown>
        localStorage.setItem(key, JSON.stringify({ ...prev, ...(row.value as Record<string, unknown>) }))
      } else localStorage.setItem(key, JSON.stringify(row.value))
    }
  } catch { /* the browser's own copy (or the defaults) is used */ }
}

/** Forgets the previous person's settings when somebody signs out. */
export function clearLocalPrefs(): void {
  for (const k of Object.values(STORAGE)) { try { localStorage.removeItem(k) } catch { /* ignore */ } }
}

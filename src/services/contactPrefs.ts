import { mirrorPref } from './userPrefs'
import { emptyContactFilters } from '../lib/contactsLogic'
import type { ContactPrefs } from '../types'

// Contacts page preferences (filters, sort, density, hidden columns, page, saved views, last selected). Stays on the device.
const KEY = 'crm.contacts.prefs.v1'
const defaults: ContactPrefs = { filters: emptyContactFilters, sort: null, density: 'comfortable', hiddenColumns: [], page: 1, pageSize: 25, savedViews: [], selectedId: null }

export function loadContactPrefs(): ContactPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaults
    const p = JSON.parse(raw) as Partial<ContactPrefs>
    return {
      filters: { ...emptyContactFilters, ...p.filters },
      sort: p.sort && typeof p.sort.key === 'string' ? p.sort : null,
      density: p.density === 'compact' ? 'compact' : 'comfortable',
      hiddenColumns: Array.isArray(p.hiddenColumns) ? p.hiddenColumns : [],
      page: typeof p.page === 'number' && p.page > 0 ? p.page : 1,
      pageSize: p.pageSize === 50 || p.pageSize === 100 ? p.pageSize : 25,
      savedViews: Array.isArray(p.savedViews) ? p.savedViews : [],
      selectedId: typeof p.selectedId === 'string' ? p.selectedId : null,
    }
  } catch {
    return defaults
  }
}

export function saveContactPrefs(patch: Partial<ContactPrefs>): void {
  try { localStorage.setItem(KEY, JSON.stringify({ ...loadContactPrefs(), ...patch })) } catch { /* ignore */ }
  mirrorPref('contacts')
}

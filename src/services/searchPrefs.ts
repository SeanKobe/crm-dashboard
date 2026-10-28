import { mirrorPref } from './userPrefs'

// Recent searches for the header search (same pattern as notePrefs and contactPrefs): the only code that touches storage for this feature.
// With Supabase they are also saved to the person's account (see userPrefs).
const KEY = 'crm.recent-searches'
export const MAX_RECENT_SEARCHES = 5

export function loadRecentSearches(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string').slice(0, MAX_RECENT_SEARCHES) : []
  } catch {
    return [] // storage can be blocked or hold something unexpected
  }
}

export function saveRecentSearches(list: string[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list))
    mirrorPref('search')
  } catch {
    // keep working in memory when storage is unavailable
  }
}

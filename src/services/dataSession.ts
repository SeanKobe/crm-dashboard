import type { Profile } from '../types'
import { resetContactsCache } from './contacts'
import { resetDealsCache } from './deals'
import { resetEventsCache } from './events'
import { resetNotesCache } from './notes'
import { loadPeople } from './people'
import { resetProjectsCache } from './projects'
import { setServiceSession } from './session'
import { clearLocalPrefs, hydratePrefs } from './userPrefs'

// Gets the data services ready for the person who just signed in (and clears them when they sign out): who they are and their role,
// the list of people, their saved view settings, and empty caches so nothing from another account is shown.
function resetCaches(): void {
  resetDealsCache(); resetContactsCache(); resetNotesCache(); resetEventsCache(); resetProjectsCache()
}

export async function prepareDataFor(profile: Profile): Promise<void> {
  setServiceSession(profile.id, profile.role)
  resetCaches()
  await Promise.all([loadPeople().catch(() => undefined), hydratePrefs()])
}

export function clearDataSession(): void {
  setServiceSession(null, null)
  resetCaches()
  clearLocalPrefs()
}

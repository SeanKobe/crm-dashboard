import { useCallback, useState } from 'react'
import { loadRecentSearches, MAX_RECENT_SEARCHES, saveRecentSearches } from '../services/searchPrefs'

// Recent searches, newest first (max 5, no duplicates), persisted through services/searchPrefs.ts.
export function useRecentSearches() {
  const [recents, setRecents] = useState<string[]>(loadRecentSearches)
  const add = useCallback((term: string) => {
    const t = term.trim()
    if (!t) return
    setRecents((list) => {
      const next = [t, ...list.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, MAX_RECENT_SEARCHES)
      saveRecentSearches(next)
      return next
    })
  }, [])
  const clear = useCallback(() => {
    saveRecentSearches([])
    setRecents([])
  }, [])
  return { recents, add, clear }
}

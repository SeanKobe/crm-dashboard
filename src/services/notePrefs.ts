import { mirrorPref } from './userPrefs'
import type { NoteFilters, NotePrefs } from '../types'

// UI preferences for the Notes page (selected note, filters, sort, list scroll). Kept apart from the notes service because
// this stays on the device even after notes move to an API.
const KEY = 'crm.notes.prefs.v1'
export const defaultNoteFilters: NoteFilters = { query: '', linkTypes: [], tags: [], date: 'any' }
const defaults: NotePrefs = { selectedId: null, filters: defaultNoteFilters, sort: 'edited', scrollTop: 0 }

export function loadNotePrefs(): NotePrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaults
    const p = JSON.parse(raw) as Partial<NotePrefs>
    return {
      selectedId: typeof p.selectedId === 'string' ? p.selectedId : null,
      filters: { ...defaultNoteFilters, ...p.filters },
      sort: p.sort === 'created' || p.sort === 'title' ? p.sort : 'edited',
      scrollTop: typeof p.scrollTop === 'number' ? p.scrollTop : 0,
    }
  } catch {
    return defaults
  }
}

export function saveNotePrefs(patch: Partial<NotePrefs>): void {
  try { localStorage.setItem(KEY, JSON.stringify({ ...loadNotePrefs(), ...patch })) } catch { /* ignore */ }
  mirrorPref('notes')
}

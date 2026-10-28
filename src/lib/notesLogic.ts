import type { Note, NoteFilters, NoteSort } from '../types'
import { dateGroup, daysAgo, type DateGroup } from './dates'
import { htmlToText } from './noteText'

const textCache = new WeakMap<Note, string>()
/** Lower-cased searchable text: title, body, tags (cached) plus the linked record's current name (passed in, never stored on the note). */
export function searchText(n: Note, linkName = ''): string {
  let t = textCache.get(n)
  if (t === undefined) {
    t = `${n.title} ${htmlToText(n.body)} ${n.tags.join(' ')}`.toLowerCase()
    textCache.set(n, t)
  }
  return linkName ? `${t} ${linkName.toLowerCase()}` : t
}

export const hasNoteFilters = (f: NoteFilters): boolean => Boolean(f.query.trim() || f.linkTypes.length || f.tags.length || f.date !== 'any')

export function filterNotes(notes: Note[], f: NoteFilters, linkName: (n: Note) => string = () => ''): Note[] {
  const terms = f.query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return notes.filter((n) => {
    if (terms.length) { const t = searchText(n, linkName(n)); if (!terms.every((x) => t.includes(x))) return false }
    if (f.linkTypes.length && !(n.link && f.linkTypes.includes(n.link.type))) return false
    if (f.tags.length && !f.tags.some((t) => n.tags.includes(t))) return false
    if (f.date !== 'any') {
      const d = daysAgo(n.updatedAt)
      if (f.date === 'today' && d > 0) return false
      if (f.date === 'week' && d >= 7) return false
      if (f.date === 'month' && d >= 30) return false
    }
    return true
  })
}

export function sortNotes(notes: Note[], sort: NoteSort): Note[] {
  const by = (a: Note, b: Note): number =>
    sort === 'title' ? (a.title || 'Untitled note').localeCompare(b.title || 'Untitled note') : sort === 'created' ? b.createdAt.localeCompare(a.createdAt) : b.updatedAt.localeCompare(a.updatedAt)
  return [...notes].sort(by)
}

export interface NoteGroup { label: 'Pinned' | DateGroup; notes: Note[] }

/** Pinned first, then the rest grouped by Today, This week and Earlier (dated by edit time, or creation time when sorting by created). */
export function groupNotes(sorted: Note[], sort: NoteSort): NoteGroup[] {
  const groups: NoteGroup[] = []
  const pinned = sorted.filter((n) => n.pinned)
  if (pinned.length) groups.push({ label: 'Pinned', notes: pinned })
  for (const label of ['Today', 'This week', 'Earlier'] as const) {
    const items = sorted.filter((n) => !n.pinned && dateGroup(sort === 'created' ? n.createdAt : n.updatedAt) === label)
    if (items.length) groups.push({ label, notes: items })
  }
  return groups
}

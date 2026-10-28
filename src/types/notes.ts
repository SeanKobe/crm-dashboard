export type RecordType = 'deal' | 'contact' | 'company' | 'note' | 'project'

/** The record a note is linked to. Only the type and id are stored; the current name is resolved when it is shown (see services/records.ts). */
export interface NoteLink {
  type: RecordType
  id: string
}

export interface Note {
  id: string
  title: string
  /** Rich text as HTML (the editor's native format). Plain text is derived with `htmlToText`. */
  body: string
  tags: string[]
  pinned: boolean
  link: NoteLink | null
  /** Local date-time (YYYY-MM-DDTHH:mm:ss). */
  createdAt: string
  updatedAt: string
  /** Set while the note is soft-deleted; restorable with `restore`. */
  deletedAt: string | null
}

export type NoteInput = Partial<Pick<Note, 'title' | 'body' | 'tags' | 'pinned' | 'link'>>
export type NotePatch = NoteInput

export interface NoteListOptions {
  /** Only notes linked to this record id. */
  linkId?: string
}

export type NoteSort = 'edited' | 'created' | 'title'
export type NoteDateFilter = 'any' | 'today' | 'week' | 'month'

export interface NoteFilters {
  query: string
  linkTypes: RecordType[]
  tags: string[]
  date: NoteDateFilter
}

export interface NotePrefs {
  selectedId: string | null
  filters: NoteFilters
  sort: NoteSort
  scrollTop: number
}

/** A record the picker can link to. */
export interface RecordRef extends NoteLink {
  name: string
  hint: string
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

import type { Note } from '../../types'
import { check, db, wall, wallOrNull } from './db'
import { updateRow } from './dealsStore'
import { loadLinks, syncLinks, type AppLink } from './links'
import { createRemoteStore, type RemoteStore } from './store'

// Notes <-> `notes`. The one record a note is linked to is a row in `links`.
interface NoteRow { id: string; title: string; body: string; tags: string[]; pinned: boolean; created_at: string; updated_at: string; deleted_at: string | null }
const linkOf = (n: Note): AppLink[] => (n.link ? [{ type: n.link.type, id: n.link.id }] : [])
const toRow = (n: Note) => ({ id: n.id, title: n.title, body: n.body, tags: n.tags, pinned: n.pinned, updated_at: n.updatedAt, deleted_at: n.deletedAt })

async function load(): Promise<Note[]> {
  const sb = await db()
  const rows = check<NoteRow[]>(await sb.from('notes').select('*').order('updated_at', { ascending: false }), 'load notes')
  const links = await loadLinks('note', rows.map((r) => r.id))
  return rows.map((r) => {
    const l = links.get(r.id)?.[0]
    return { id: r.id, title: r.title, body: r.body, tags: r.tags ?? [], pinned: r.pinned, link: l ? { type: l.type as NonNullable<Note['link']>['type'], id: l.id } : null, createdAt: wall(r.created_at), updatedAt: wall(r.updated_at), deletedAt: wallOrNull(r.deleted_at) }
  })
}

export function createNotesStore(onReload: (list: Note[]) => void): RemoteStore<Note> {
  return createRemoteStore<Note>({
    noun: 'the note',
    load,
    onReload,
    insert: async (n) => {
      const sb = await db()
      check(await sb.from('notes').insert({ ...toRow(n), created_at: n.createdAt }), 'create notes')
      await syncLinks('note', n.id, [], linkOf(n))
    },
    update: async (n, prev) => {
      await updateRow('notes', n.id, toRow(n), 'change this note')
      await syncLinks('note', n.id, linkOf(prev), linkOf(n))
    },
    drop: async (prev) => { await updateRow('notes', prev.id, { deleted_at: new Date().toISOString() }, 'delete this note') },
  })
}

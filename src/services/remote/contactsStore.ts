import type { Contact, ContactActivity } from '../../types'
import { loadActivity, syncActivity, type TimelineEntry } from './activity'
import { check, db, wall, wallOrNull } from './db'
import { updateRow } from './dealsStore'
import { loadLinks, syncLinks, type AppLink } from './links'
import { createRemoteStore, type RemoteStore } from './store'

// Contacts <-> `contacts`. Their timeline is in `activity`; the deals and notes they are linked to are rows in `links`.
interface ContactRow {
  id: string; name: string; email: string; phone: string; company: string; job_title: string; status: Contact['status']; source: Contact['source']; owner_id: string
  tags: string[]; last_contacted_at: string | null; created_at: string; deleted_at: string | null
}
const toEntry = (a: ContactActivity): TimelineEntry => ({ id: a.id, kind: a.kind, title: a.title, description: a.description, actorId: a.ownerId, at: a.at })
const fromEntry = (e: TimelineEntry): ContactActivity => ({ id: e.id, kind: e.kind as ContactActivity['kind'], title: e.title, description: e.description, ownerId: e.actorId, at: e.at })
const linksOf = (c: Contact): AppLink[] => [...c.dealIds.map((id) => ({ type: 'deal', id })), ...c.noteIds.map((id) => ({ type: 'note', id }))]

const toRow = (c: Contact) => ({
  id: c.id, name: c.name, email: c.email, phone: c.phone, company: c.company, job_title: c.jobTitle, status: c.status, source: c.source, owner_id: c.ownerId, tags: c.tags,
  last_contacted_at: c.lastContactedAt, deleted_at: c.deletedAt,
})

async function load(): Promise<Contact[]> {
  const sb = await db()
  const rows = check<ContactRow[]>(await sb.from('contacts').select('*').order('created_at', { ascending: false }), 'load contacts')
  const ids = rows.map((r) => r.id)
  const [timelines, links] = await Promise.all([loadActivity('contact', ids), loadLinks('contact', ids)])
  return rows.map((r) => {
    const l = links.get(r.id) ?? []
    return {
      id: r.id, name: r.name, email: r.email, phone: r.phone, company: r.company, jobTitle: r.job_title, status: r.status, source: r.source, ownerId: r.owner_id, tags: r.tags ?? [],
      createdAt: wall(r.created_at), lastContactedAt: wallOrNull(r.last_contacted_at), dealIds: l.filter((x) => x.type === 'deal').map((x) => x.id), noteIds: l.filter((x) => x.type === 'note').map((x) => x.id),
      activity: (timelines.get(r.id) ?? []).map(fromEntry), deletedAt: wallOrNull(r.deleted_at),
    }
  })
}

export function createContactsStore(onReload: (list: Contact[]) => void): RemoteStore<Contact> {
  return createRemoteStore<Contact>({
    noun: 'the contact',
    load,
    onReload,
    insert: async (c) => {
      const sb = await db()
      check(await sb.from('contacts').insert({ ...toRow(c), created_at: c.createdAt }), 'create contacts')
      await syncActivity('contact', c.id, [], c.activity.map(toEntry))
      await syncLinks('contact', c.id, [], linksOf(c))
    },
    update: async (c, prev) => {
      await updateRow('contacts', c.id, toRow(c), 'change this contact')
      await syncActivity('contact', c.id, prev.activity.map(toEntry), c.activity.map(toEntry))
      await syncLinks('contact', c.id, linksOf(prev), linksOf(c))
    },
    drop: async (prev) => { await updateRow('contacts', prev.id, { deleted_at: new Date().toISOString() }, 'delete this contact') },
  })
}

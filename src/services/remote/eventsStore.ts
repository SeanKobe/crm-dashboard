import type { ScheduleEvent } from '../../types'
import { check, db, wall, wallOrNull } from './db'
import { updateRow } from './dealsStore'
import { loadLinks, syncLinks } from './links'
import { createRemoteStore, type RemoteStore } from './store'

// Calendar events <-> `events`. Attendees are a jsonb column ([{ kind, id }]); linked records are rows in `links`.
interface EventRow {
  id: string; title: string; type: ScheduleEvent['type']; start_at: string; end_at: string; all_day: boolean; platform: ScheduleEvent['platform']; location: string
  attendees: ScheduleEvent['attendees'] | null; description: string; status: ScheduleEvent['status']; owner_id: string; created_at: string; updated_at: string; deleted_at: string | null
}
const toRow = (e: ScheduleEvent) => ({
  id: e.id, title: e.title, type: e.type, start_at: e.start, end_at: e.end, all_day: e.allDay, platform: e.platform, location: e.location, attendees: e.attendees, description: e.description,
  status: e.status, owner_id: e.ownerId, updated_at: e.updatedAt, deleted_at: e.deletedAt,
})

async function load(): Promise<ScheduleEvent[]> {
  const sb = await db()
  const rows = check<EventRow[]>(await sb.from('events').select('*').order('start_at', { ascending: true }), 'load events')
  const links = await loadLinks('event', rows.map((r) => r.id))
  return rows.map((r) => ({
    id: r.id, title: r.title, type: r.type, start: wall(r.start_at), end: wall(r.end_at), allDay: r.all_day, platform: r.platform, location: r.location, attendees: r.attendees ?? [],
    links: (links.get(r.id) ?? []).map((l) => ({ type: l.type as ScheduleEvent['links'][number]['type'], id: l.id })), description: r.description, status: r.status, ownerId: r.owner_id,
    createdAt: wall(r.created_at), updatedAt: wall(r.updated_at), deletedAt: wallOrNull(r.deleted_at),
  }))
}

export function createEventsStore(onReload: (list: ScheduleEvent[]) => void): RemoteStore<ScheduleEvent> {
  return createRemoteStore<ScheduleEvent>({
    noun: 'the event',
    load,
    onReload,
    insert: async (e) => {
      const sb = await db()
      check(await sb.from('events').insert({ ...toRow(e), created_at: e.createdAt }), 'create events')
      await syncLinks('event', e.id, [], e.links)
    },
    update: async (e, prev) => {
      await updateRow('events', e.id, toRow(e), 'change this event')
      await syncLinks('event', e.id, prev.links, e.links)
    },
    drop: async (prev) => { await updateRow('events', prev.id, { deleted_at: new Date().toISOString() }, 'delete this event') },
  })
}

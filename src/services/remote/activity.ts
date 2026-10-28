import { check, db, inChunks, wall } from './db'

// The shared `activity` timeline table, one entry per row for every kind of record.
export interface TimelineEntry { id: string; kind: string; title: string; description: string; actorId: string; at: string }
type EntityType = 'deal' | 'contact' | 'note' | 'event' | 'project' | 'task'
interface ActivityRow { id: string; entity_id: string; kind: string; title: string; description: string; actor_id: string | null; occurred_at: string }

/** Timelines of many records at once, newest first: record id -> entries. */
export async function loadActivity(entity: EntityType, ids: string[]): Promise<Map<string, TimelineEntry[]>> {
  const sb = await db()
  const rows = await inChunks(ids, async (chunk) => check<ActivityRow[]>(await sb.from('activity').select('id, entity_id, kind, title, description, actor_id, occurred_at').eq('entity_type', entity).in('entity_id', chunk), 'load activity'))
  const out = new Map<string, TimelineEntry[]>()
  for (const r of rows) {
    const list = out.get(r.entity_id) ?? []
    list.push({ id: r.id, kind: r.kind, title: r.title, description: r.description, actorId: r.actor_id ?? '', at: wall(r.occurred_at) })
    out.set(r.entity_id, list)
  }
  for (const list of out.values()) list.sort((a, b) => b.at.localeCompare(a.at))
  return out
}

/** Adds the entries that are new. Entries that went away (an Undo) are removed when the database allows it: only an admin may delete timeline entries. */
export async function syncActivity(entity: EntityType, entityId: string, prev: TimelineEntry[], next: TimelineEntry[]): Promise<void> {
  const sb = await db()
  const added = next.filter((n) => !prev.some((p) => p.id === n.id))
  const removed = prev.filter((p) => !next.some((n) => n.id === p.id))
  if (added.length) {
    check(await sb.from('activity').insert(added.map((a) => ({ id: a.id, entity_type: entity, entity_id: entityId, kind: a.kind, title: a.title, description: a.description, actor_id: a.actorId || null, occurred_at: a.at }))), 'add to the timeline')
  }
  if (removed.length) await sb.from('activity').delete().in('id', removed.map((r) => r.id)) // best effort: not allowed for everyone, and not worth failing an Undo over
}

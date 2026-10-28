import { check, db, inChunks } from './db'

// The `links` table: { type, id } pairs between records. A link to a company has no uuid (companies have no table), so it carries
// a key (the company slug) instead; here that is simply the link's `id`.
export interface AppLink { type: string; id: string }
type SourceType = 'deal' | 'contact' | 'note' | 'event' | 'project' | 'task'
interface LinkRow { source_id: string; target_type: string; target_id: string | null; target_key: string | null }

/** Live links of many records at once: source id -> its links. */
export async function loadLinks(source: SourceType, ids: string[]): Promise<Map<string, AppLink[]>> {
  const sb = await db()
  const rows = await inChunks(ids, async (chunk) => check<LinkRow[]>(await sb.from('links').select('source_id, target_type, target_id, target_key').eq('source_type', source).in('source_id', chunk).is('deleted_at', null), 'load links'))
  const out = new Map<string, AppLink[]>()
  for (const r of rows) {
    const list = out.get(r.source_id) ?? []
    list.push({ type: r.target_type, id: (r.target_type === 'company' ? r.target_key : r.target_id) ?? '' })
    out.set(r.source_id, list)
  }
  return out
}

const sameLink = (a: AppLink, b: AppLink): boolean => a.type === b.type && a.id === b.id

/** Adds the links that are new and soft-deletes the ones that went away. */
export async function syncLinks(source: SourceType, sourceId: string, prev: AppLink[], next: AppLink[]): Promise<void> {
  const sb = await db()
  const added = next.filter((n) => !prev.some((p) => sameLink(p, n)))
  const removed = prev.filter((p) => !next.some((n) => sameLink(p, n)))
  if (added.length) {
    check(await sb.from('links').insert(added.map((l) => ({ source_type: source, source_id: sourceId, target_type: l.type, target_id: l.type === 'company' ? null : l.id, target_key: l.type === 'company' ? l.id : null }))), 'link records')
  }
  for (const l of removed) {
    let q = sb.from('links').update({ deleted_at: new Date().toISOString() }).eq('source_type', source).eq('source_id', sourceId).eq('target_type', l.type).is('deleted_at', null)
    q = l.type === 'company' ? q.eq('target_key', l.id) : q.eq('target_id', l.id)
    check(await q, 'unlink records')
  }
}

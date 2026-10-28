import { money } from '../../lib/dealsLogic'
import type { DealActivity, PipelineDeal } from '../../types'
import { loadActivity, syncActivity, type TimelineEntry } from './activity'
import { check, db, dateOnly, orNull, wall } from './db'
import { DataError } from './errors'
import { createRemoteStore, type RemoteStore } from './store'

// Deals <-> the `deals` table (+ their timeline in `activity`). The deal's contact is the `contact_id` column.
interface DealRow {
  id: string; title: string; company: string; contact_name: string; contact_id: string | null; value: number; stage: PipelineDeal['stage']; priority: PipelineDeal['priority']
  owner_id: string; close_date: string | null; stage_since: string; next_step: string; notes: string; lost_reason: PipelineDeal['lostReason'] | null
}
const toEntry = (a: DealActivity): TimelineEntry => ({ id: a.id, kind: a.kind, title: a.title, description: a.description, actorId: a.ownerId, at: a.at })
const fromEntry = (e: TimelineEntry): DealActivity => ({ id: e.id, kind: e.kind as DealActivity['kind'], title: e.title, description: e.description, ownerId: e.actorId, at: e.at })

const toRow = (d: PipelineDeal) => ({
  id: d.id, title: d.title, company: d.company, contact_name: d.contact, contact_id: orNull(d.contactId), value: d.value, stage: d.stage, priority: d.priority, owner_id: d.ownerId,
  close_date: orNull(d.closeDate), stage_since: d.stageSince, next_step: d.nextStep, notes: d.notes, lost_reason: d.stage === 'lost' ? d.lostReason ?? 'Other' : null, deleted_at: null as string | null,
})

async function load(): Promise<PipelineDeal[]> {
  const sb = await db()
  const rows = check<DealRow[]>(await sb.from('deals').select('*').is('deleted_at', null).order('updated_at', { ascending: false }), 'load deals')
  const timelines = await loadActivity('deal', rows.map((r) => r.id))
  return rows.map((r) => ({
    id: r.id, group: 'Deals', icon: 'handshake', title: r.title, hint: `${r.company || 'No company'} · ${money(r.value)}`, company: r.company, contact: r.contact_name, contactId: r.contact_id ?? undefined,
    value: r.value, stage: r.stage, ownerId: r.owner_id, closeDate: dateOnly(r.close_date), priority: r.priority, stageSince: wall(r.stage_since), nextStep: r.next_step, notes: r.notes,
    lostReason: r.lost_reason ?? undefined, activity: (timelines.get(r.id) ?? []).map(fromEntry),
  }))
}

/** Changes one existing row and makes sure it really changed (a row the person may not see or edit would match nothing, silently). */
async function updateRow(table: string, id: string, values: Record<string, unknown>, action: string): Promise<void> {
  const sb = await db()
  const rows = check<{ id: string }[]>(await sb.from(table).update(values).eq('id', id).select('id'), action)
  if (rows.length === 0) throw new DataError(`You don’t have permission to ${action}. Ask a manager or an admin.`, 'permission')
}

export function createDealsStore(onReload: (list: PipelineDeal[]) => void): RemoteStore<PipelineDeal> {
  return createRemoteStore<PipelineDeal>({
    noun: 'the deal',
    load,
    onReload,
    insert: async (d) => {
      const sb = await db()
      check(await sb.from('deals').insert(toRow(d)), 'create deals')
      await syncActivity('deal', d.id, [], d.activity.map(toEntry))
    },
    update: async (d, prev) => {
      const { deleted_at, ...row } = toRow(d)
      await updateRow('deals', d.id, { ...row, deleted_at }, 'change this deal')
      await syncActivity('deal', d.id, prev.activity.map(toEntry), d.activity.map(toEntry))
    },
    drop: async (prev) => { await updateRow('deals', prev.id, { deleted_at: new Date().toISOString() }, 'delete this deal') },
  })
}
export { updateRow }

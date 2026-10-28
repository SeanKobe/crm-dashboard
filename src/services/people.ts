import { owners } from '../data/deals'
import type { DealOwner, Tone } from '../types'
import { check, db } from './remote/db'

// In Supabase mode the "owners" the pages show (names, initials, avatar tints, the filters and pickers) are the profiles. The list the
// pages import is replaced in place, so nothing that already imports it has to change.
const TONES: Tone[] = ['purple', 'green', 'orange', 'amber', 'red']
interface ProfileRow { id: string; full_name: string | null; email: string | null; avatar_color: string | null }

export async function loadPeople(): Promise<void> {
  const sb = await db()
  const rows = check<ProfileRow[]>(await sb.from('profiles').select('id, full_name, email, avatar_color').order('full_name', { ascending: true }), 'load people')
  const list: DealOwner[] = rows.map((r) => {
    const name = r.full_name?.trim() || (r.email ?? '').split('@')[0] || 'Someone'
    return { id: r.id, name, initial: name[0]?.toUpperCase() ?? '?', tone: TONES.find((t) => t === r.avatar_color) ?? 'purple' }
  })
  if (list.length) owners.splice(0, owners.length, ...list)
}

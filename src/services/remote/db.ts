import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabase } from '../../lib/supabase'
import { DataError, describeDbError } from './errors'

// The only door to Supabase for the data services. Components never import this.
let client: SupabaseClient | null = null
export async function db(): Promise<SupabaseClient> {
  client ??= await getSupabase()
  if (!client) throw new DataError('The database is not configured.', 'config')
  return client
}

/** Throws a friendly DataError when a query failed. */
export function check<T>(result: { data: T | null; error: unknown }, action = 'save that'): T {
  if (result.error) throw describeDbError(result.error, action)
  return result.data as T
}

/** "2025-10-18T09:00:00+00:00" (what Postgres returns) -> "2025-10-18T09:00:00" (the wall-clock string the app uses). */
export const wall = (v: string | null | undefined): string => (v ? v.slice(0, 19) : '')
export const wallOrNull = (v: string | null | undefined): string | null => (v ? v.slice(0, 19) : null)
export const dateOnly = (v: string | null | undefined): string => (v ? v.slice(0, 10) : '')
/** "" and undefined -> null (database columns that are optional). */
export const orNull = <T,>(v: T | '' | undefined | null): T | null => (v === '' || v === undefined || v === null ? null : v)

/** Runs a query over a list of ids in chunks (PostgREST puts them in the URL). */
export async function inChunks<T>(ids: string[], run: (chunk: string[]) => Promise<T[]>, size = 80): Promise<T[]> {
  const out: T[] = []
  for (let i = 0; i < ids.length; i += size) out.push(...(await run(ids.slice(i, i + size))))
  return out
}

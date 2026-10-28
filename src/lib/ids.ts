import { isDemoMode } from './supabase'

/** True when data lives in Supabase: new records then need real uuids (the database's primary keys). */
export const remoteData: boolean = !isDemoMode

/** An id for a new record: a uuid when data lives in Supabase, the short readable id the demo has always used otherwise. */
export function makeId(prefix: string, local: () => string): string {
  return remoteData ? crypto.randomUUID() : `${prefix}-${local()}`
}

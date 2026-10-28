// Who is signed in, as far as the data services are concerned. The sign-in context sets this once the profile is known; in demo
// mode (no Supabase) it stays the first demo owner, exactly as before. Importers see updates because these are live bindings.
import type { UserRole } from '../types'

export let CURRENT_USER_ID = 'o1'
let role: UserRole | null = null

export function setServiceSession(userId: string | null, userRole: UserRole | null): void {
  CURRENT_USER_ID = userId ?? 'o1'
  role = userRole
}
export const currentRole = (): UserRole | null => role
/** Managers and admins may give records to other people; a sales rep may only keep their own (the database enforces it too). */
export const canReassign = (): boolean => role === null || role === 'manager' || role === 'admin'

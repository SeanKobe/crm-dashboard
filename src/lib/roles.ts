import type { UserRole } from '../types'

/** What each role is called on screen. The word is always shown next to any colour, so the role never depends on colour alone. */
export const ROLE_LABEL: Record<UserRole, string> = { admin: 'Admin', manager: 'Manager', sales_rep: 'Sales rep' }

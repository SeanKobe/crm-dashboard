import { isDemoMode } from './supabase'
import type { UserRole } from '../types'

// The "Try the demo" experience: three ready-made accounts (one per role) that hold sample data only. Their shared password is read from
// VITE_DEMO_PASSWORD at build time (never written in the repo); without it the sign-in page simply has no demo buttons.
export interface DemoAccount { role: UserRole; label: string; email: string }
export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  { role: 'admin', label: 'Admin', email: 'admin@pivora.test' },
  { role: 'manager', label: 'Manager', email: 'manager@pivora.test' },
  { role: 'sales_rep', label: 'Sales rep', email: 'rep@pivora.test' },
]

export const demoPassword: string = import.meta.env.VITE_DEMO_PASSWORD?.trim() ?? ''
/** The demo buttons show only with Supabase connected and a demo password set. */
export const demoLoginEnabled: boolean = !isDemoMode && demoPassword !== ''
export const isDemoAccount = (email: string | null | undefined): boolean => DEMO_ACCOUNTS.some((a) => a.email === (email ?? '').trim().toLowerCase())

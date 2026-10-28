import type { Tone } from './common'

// ---- Sign-in. The role comes from the profiles table (see supabase/migrations); the app never decides it.
export type UserRole = 'admin' | 'manager' | 'sales_rep'

export interface AuthUser {
  id: string
  email: string
}

export interface Profile {
  id: string
  fullName: string
  email: string
  role: UserRole
  /** The Avatar tint. */
  avatarColor: Tone
}

export type AuthErrorCode =
  | 'invalid-credentials'
  | 'email-taken'
  | 'email-not-confirmed'
  | 'invalid-email'
  | 'weak-password'
  | 'rate-limited'
  | 'signups-disabled'
  | 'session-expired'
  | 'network'
  | 'demo'
  | 'unknown'

export interface AuthFailure {
  code: AuthErrorCode
  /** A sentence for the person using the app. */
  message: string
}

export interface AuthResult {
  ok: boolean
  error?: AuthFailure
  /** Sign-up worked but the project wants the email confirmed before the first sign-in. */
  needsConfirmation?: boolean
}

export interface AuthApi {
  /** True when Supabase is not configured: nobody signs in and the app runs as it always has. */
  demo: boolean
  user: AuthUser | null
  profile: Profile | null
  role: UserRole | null
  /** True while the stored session (and the profile) are being read; the app shows its skeleton. */
  loading: boolean
  /** True right after an explicit sign out, so the login page doesn't send people "back" to where they were. */
  signedOut: boolean
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (email: string, password: string, fullName: string) => Promise<AuthResult>
  signOut: () => Promise<void>
  /** Counts up after the demo data was reset: the app remounts under it so every page loads fresh data. */
  dataVersion: number
  /** Re-prepares the data services for the signed-in person (empty caches, saved view settings) and refreshes every page. */
  refreshData: () => Promise<void>
  resetPassword: (email: string) => Promise<AuthResult>
  /** Sets a new password for the signed-in person (the reset link signs them in first). */
  updatePassword: (password: string) => Promise<AuthResult>
}

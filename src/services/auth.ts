import type { AuthError, Session, User } from '@supabase/supabase-js'
import { getSupabase } from '../lib/supabase'
import type { AuthFailure, AuthResult, AuthUser, Profile, Tone, UserRole } from '../types'

// Sign-in service: the only place that talks to Supabase Auth (components and the context never import the client). Every function
// returns plain data or a friendly AuthFailure, never a raw library error.
const demoFailure: AuthFailure = { code: 'demo', message: 'Sign-in is not available in demo mode.' }
const fail = (error: AuthFailure): AuthResult => ({ ok: false, error })

type Action = 'signIn' | 'signUp' | 'reset' | 'update'
const text = (e: AuthError): string => `${e.code ?? ''} ${e.message ?? ''}`.toLowerCase()

/** Turns a Supabase error into a specific message for the person (never "invalid_grant"). */
export function describeAuthError(e: AuthError | Error, action: Action): AuthFailure {
  const raw = 'code' in e || 'status' in e ? (e as AuthError) : null
  const t = raw ? text(raw) : e.message.toLowerCase()
  const status = raw?.status
  if (/failed to fetch|network|retryable|fetch/.test(t) && !status) return { code: 'network', message: 'We can’t reach the server. Check your connection and try again.' }
  if (/invalid_credentials|invalid login credentials/.test(t)) return { code: 'invalid-credentials', message: 'Wrong email or password.' }
  if (/email_not_confirmed|email not confirmed/.test(t)) return { code: 'email-not-confirmed', message: 'Confirm your email first. Check your inbox for the link we sent when you signed up.' }
  if (/user_already_exists|already registered|already been registered|email_exists/.test(t)) return { code: 'email-taken', message: 'An account with this email already exists.' }
  if (/weak_password|password should be|password is too/.test(t)) return { code: 'weak-password', message: 'Choose a stronger password with at least 8 characters.' }
  if (/email_address_invalid|invalid email|unable to validate email/.test(t)) return { code: 'invalid-email', message: 'That email address isn’t valid. Check it and try again.' }
  if (/signup_disabled|signups not allowed|signup is disabled/.test(t)) return { code: 'signups-disabled', message: 'New sign-ups are turned off for this project.' }
  if (/over_request_rate_limit|over_email_send_rate_limit|rate limit|too many/.test(t) || status === 429) return { code: 'rate-limited', message: 'Too many attempts. Wait a minute and try again.' }
  if (/session_not_found|jwt expired|not authenticated|auth session missing/.test(t)) return { code: 'session-expired', message: action === 'update' ? 'This link has expired. Request a new reset link.' : 'Your session has ended. Sign in again.' }
  return { code: 'unknown', message: 'Something went wrong. Try again in a moment.' }
}

const unreachable = (e: unknown, action: Action): AuthResult => fail(describeAuthError(e instanceof Error ? e : new Error(String(e)), action))
const toAuthUser = (u: User): AuthUser => ({ id: u.id, email: u.email ?? '' })

/** The signed-in user from the stored session (no network call unless the token needs refreshing), or null. */
export async function currentUser(): Promise<AuthUser | null> {
  const supabase = await getSupabase()
  if (!supabase) return null
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) return null
  return toAuthUser(data.session.user)
}

export type SessionEvent = 'signed-in' | 'signed-out' | 'user-updated' | 'password-recovery'
/** Calls `fn` when the session changes in this tab or another one. Returns the unsubscribe function. */
export async function watchSession(fn: (event: SessionEvent, user: AuthUser | null) => void): Promise<() => void> {
  const supabase = await getSupabase()
  if (!supabase) return () => undefined
  const { data } = supabase.auth.onAuthStateChange((event, session: Session | null) => {
    const user = session ? toAuthUser(session.user) : null
    if (event === 'SIGNED_IN') fn('signed-in', user)
    else if (event === 'SIGNED_OUT') fn('signed-out', null)
    else if (event === 'USER_UPDATED') fn('user-updated', user)
    else if (event === 'PASSWORD_RECOVERY') fn('password-recovery', user)
  })
  return () => data.subscription.unsubscribe()
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult & { user?: AuthUser }> {
  const supabase = await getSupabase()
  if (!supabase) return fail(demoFailure)
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error || !data.user) return fail(error ? describeAuthError(error, 'signIn') : { code: 'unknown', message: 'Something went wrong. Try again in a moment.' })
    return { ok: true, user: toAuthUser(data.user) }
  } catch (e) {
    return unreachable(e, 'signIn')
  }
}

export async function signUpWithPassword(email: string, password: string, fullName: string): Promise<AuthResult & { user?: AuthUser }> {
  const supabase = await getSupabase()
  if (!supabase) return fail(demoFailure)
  try {
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: fullName.trim() } } })
    if (error) return fail(describeAuthError(error, 'signUp'))
    // With "confirm email" on, signing up an address that already exists does not error: it returns a user with no identities.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return fail({ code: 'email-taken', message: 'An account with this email already exists.' })
    if (data.session && data.user) return { ok: true, user: toAuthUser(data.user) }
    return { ok: true, needsConfirmation: true }
  } catch (e) {
    return unreachable(e, 'signUp')
  }
}

export async function signOutUser(): Promise<void> {
  const supabase = await getSupabase()
  if (!supabase) return
  try { await supabase.auth.signOut() } catch { /* the local session is cleared either way */ }
}

export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const supabase = await getSupabase()
  if (!supabase) return fail(demoFailure)
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` })
    return error ? fail(describeAuthError(error, 'reset')) : { ok: true }
  } catch (e) {
    return unreachable(e, 'reset')
  }
}

export async function setNewPassword(password: string): Promise<AuthResult> {
  const supabase = await getSupabase()
  if (!supabase) return fail(demoFailure)
  try {
    const { error } = await supabase.auth.updateUser({ password })
    return error ? fail(describeAuthError(error, 'update')) : { ok: true }
  } catch (e) {
    return unreachable(e, 'update')
  }
}

// ---- profile (name, role, avatar tint) ----------------------------------------------------------------------------------------
interface ProfileRow { id: string; full_name: string | null; email: string | null; role: string | null; avatar_color: string | null }
const ROLES: UserRole[] = ['admin', 'manager', 'sales_rep']
const TONES: Tone[] = ['purple', 'green', 'orange', 'amber', 'red']

/**
 * The signed-in person's profile row. If it cannot be read (not created yet, or the request fails) a safe sales_rep profile is built
 * from the sign-in data, so the app still opens. Role-based access is enforced by the database, not by this value.
 */
export async function fetchProfile(user: AuthUser): Promise<Profile> {
  const supabase = await getSupabase()
  const fallback: Profile = { id: user.id, fullName: user.email.split('@')[0], email: user.email, role: 'sales_rep', avatarColor: 'purple' }
  if (!supabase) return fallback
  try {
    const { data } = await supabase.from('profiles').select('id, full_name, email, role, avatar_color').eq('id', user.id).maybeSingle()
    const row = data as ProfileRow | null
    if (!row) return fallback
    return {
      id: row.id,
      fullName: row.full_name?.trim() || fallback.fullName,
      email: row.email || user.email,
      role: ROLES.find((r) => r === row.role) ?? 'sales_rep',
      avatarColor: TONES.find((t) => t === row.avatar_color) ?? 'purple',
    }
  } catch {
    return fallback
  }
}

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { isDemoMode } from '../lib/supabase'
import { clearDataSession, prepareDataFor } from '../services/dataSession'
import { currentUser, fetchProfile, requestPasswordReset, setNewPassword, signInWithPassword, signOutUser, signUpWithPassword, watchSession } from '../services/auth'
import type { AuthApi, AuthResult, AuthUser, Profile } from '../types'
import { AuthContext } from './authContext'

// Keeps the session, the profile and the "is it still loading" flag. The session is stored by Supabase in the browser, so a refresh keeps
// you signed in; other tabs are followed through the auth change events.
interface Session { user: AuthUser | null; profile: Profile | null; loading: boolean }
const demoResult: AuthResult = { ok: false, error: { code: 'demo', message: 'Sign-in is not available in demo mode.' } }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ user: null, profile: null, loading: !isDemoMode })
  const [signedOut, setSignedOut] = useState(false)
  // Every change of who is signed in takes a number; a slow profile request for an older number is dropped when it finally answers
  // (otherwise a sign out that happens while a profile is still loading would be undone by it).
  const turn = useRef(0)
  // The person the data services were last prepared for: a repeated sign-in event for the same person must not reset their data or settings.
  const prepared = useRef<string | null>(null)
  const prepare = useCallback(async (user: AuthUser, profile: Profile) => {
    if (prepared.current === user.id) return
    await prepareDataFor(profile)
    prepared.current = user.id
  }, [])
  const forget = useCallback(() => { prepared.current = null; clearDataSession() }, [])

  useEffect(() => {
    if (isDemoMode) return undefined
    let live = true
    let unsubscribe: () => void = () => undefined
    const apply = async (user: AuthUser | null) => {
      const mine = ++turn.current
      if (!user) { forget(); if (live) setSession({ user: null, profile: null, loading: false }); return }
      const profile = await fetchProfile(user)
      if (!live || mine !== turn.current) return
      await prepare(user, profile)
      if (live && mine === turn.current) setSession({ user, profile, loading: false })
    }
    currentUser().then(apply).catch(() => { if (live) setSession({ user: null, profile: null, loading: false }) })
    // Calling Supabase from inside its own change callback can deadlock, so the work is moved out of the callback.
    watchSession((event, user) => {
      setTimeout(() => {
        if (event === 'signed-out') { turn.current += 1; forget(); setSession({ user: null, profile: null, loading: false }) }
        else void apply(user)
      }, 0)
    }).then((stop) => { if (live) unsubscribe = stop; else stop() }).catch(() => undefined)
    return () => { live = false; unsubscribe() }
  }, [prepare, forget])

  const finishSignIn = useCallback(async (user: AuthUser) => {
    const mine = ++turn.current
    const profile = await fetchProfile(user)
    if (mine !== turn.current) return
    await prepare(user, profile)
    if (mine !== turn.current) return
    setSignedOut(false)
    setSession({ user, profile, loading: false })
  }, [prepare])

  const signIn = useCallback<AuthApi['signIn']>(async (email, password) => {
    if (isDemoMode) return demoResult
    const r = await signInWithPassword(email, password)
    if (r.ok && r.user) await finishSignIn(r.user)
    return { ok: r.ok, error: r.error }
  }, [finishSignIn])

  const signUp = useCallback<AuthApi['signUp']>(async (email, password, fullName) => {
    if (isDemoMode) return demoResult
    const r = await signUpWithPassword(email, password, fullName)
    if (r.ok && r.user) await finishSignIn(r.user)
    return { ok: r.ok, error: r.error, needsConfirmation: r.needsConfirmation }
  }, [finishSignIn])

  const signOut = useCallback<AuthApi['signOut']>(async () => {
    turn.current += 1
    await signOutUser()
    turn.current += 1
    forget()
    setSignedOut(true)
    setSession({ user: null, profile: null, loading: false })
  }, [forget])

  const resetPassword = useCallback<AuthApi['resetPassword']>(async (email) => (isDemoMode ? demoResult : requestPasswordReset(email)), [])
  const updatePassword = useCallback<AuthApi['updatePassword']>(async (password) => (isDemoMode ? demoResult : setNewPassword(password)), [])

  const value = useMemo<AuthApi>(() => ({
    demo: isDemoMode,
    user: session.user,
    profile: session.profile,
    role: session.profile?.role ?? null,
    loading: session.loading,
    signedOut,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  }), [session, signedOut, signIn, signUp, signOut, resetPassword, updatePassword])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

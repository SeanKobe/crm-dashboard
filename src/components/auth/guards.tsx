import type { ReactNode } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router'
import { useAuth } from '../../context/authContext'
import { loginPath, safeNext } from '../../lib/authRedirect'
import { AppShellSkeleton } from '../RouteFallbacks'

// Route guards. Demo mode (no Supabase variables) lets everything through, so the app behaves exactly as it did before login existed.

/** Signed-out people go to /login and come back to the page they asked for once they're in. While the session loads, the app skeleton shows. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { demo, user, loading, signedOut } = useAuth()
  const location = useLocation()
  if (demo) return <>{children}</>
  if (loading) return <AppShellSkeleton />
  if (!user) return <Navigate to={signedOut ? '/login' : loginPath(`${location.pathname}${location.search}${location.hash}`)} replace />
  return <>{children}</>
}

/** The sign-in screens: people who are already signed in go on to the page they asked for (or the Dashboard); demo mode has no login at all. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { demo, user, loading } = useAuth()
  const [params] = useSearchParams()
  if (demo) return <Navigate to="/" replace />
  if (loading) return <AppShellSkeleton />
  if (user) return <Navigate to={safeNext(params.get('next'))} replace />
  return <>{children}</>
}

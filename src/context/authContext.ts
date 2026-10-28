import { createContext, useContext } from 'react'
import type { AuthApi } from '../types'

// The signed-in person. In demo mode (no Supabase variables) `demo` is true, nobody signs in and the app runs as it always has.
export const AuthContext = createContext<AuthApi | null>(null)

export function useAuth(): AuthApi {
  const v = useContext(AuthContext)
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>')
  return v
}

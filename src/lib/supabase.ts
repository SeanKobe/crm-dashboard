import type { SupabaseClient } from '@supabase/supabase-js'

// The one place that knows about the Supabase connection. It reads the project URL and the public anon key from the environment
// (see .env.example). With either one missing the app is in DEMO MODE: no login, and everything keeps working from the browser exactly as
// before. Only the public anon key is ever used here; row level security in the database decides what each signed-in user can see.
const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

/** True when the Supabase variables are not set: the app runs without login. */
export const isDemoMode: boolean = !url || !anonKey

let client: Promise<SupabaseClient | null> | null = null

/**
 * The Supabase client, created on first use (the library is its own chunk, so demo mode never downloads it).
 * Resolves to null in demo mode.
 */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (isDemoMode || !url || !anonKey) return Promise.resolve(null)
  client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }),
  )
  return client
}

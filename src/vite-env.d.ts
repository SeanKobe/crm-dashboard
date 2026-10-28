/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL. Leave unset to run in demo mode (no login, data stays in the browser). */
  readonly VITE_SUPABASE_URL?: string
  /** Supabase public (anon) key. */
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

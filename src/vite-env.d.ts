/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL. Leave unset to run in demo mode (no login, data stays in the browser). */
  readonly VITE_SUPABASE_URL?: string
  /** Supabase public (anon) key. */
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** Shared password of the three demo accounts. Unset = no "Try the demo" buttons on the sign-in page. */
  readonly VITE_DEMO_PASSWORD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

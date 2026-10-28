// Where to go after signing in. Only paths inside this app are accepted ("/deals?x=1"), never another site ("//evil.com", "https://...").
const AUTH_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password']

export function safeNext(next: string | null | undefined): string {
  if (!next) return '/'
  let path = next
  try { path = decodeURIComponent(next) } catch { return '/' }
  if (!path.startsWith('/') || path.startsWith('//') || path.startsWith('/\\') || /[\r\n]/.test(path)) return '/'
  if (AUTH_PATHS.some((p) => path === p || path.startsWith(`${p}?`) || path.startsWith(`${p}/`))) return '/'
  return path
}

/** "/login" or "/login?next=%2Fdeals%3Fx%3D1": the login address that remembers where the person was going. */
export function loginPath(from: string): string {
  return from === '/' || from === '' ? '/login' : `/login?next=${encodeURIComponent(from)}`
}

// Save failures raised inside the data services reach the person through one channel: a toast. Pages that handle an error themselves
// still work (the promise rejects too); this makes sure a failed background save is never silent.
export interface DataFailure { title: string; message: string }
const listeners = new Set<(f: DataFailure) => void>()
export function subscribeDataFailures(fn: (f: DataFailure) => void): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}
export const notifyDataFailure = (f: DataFailure): void => listeners.forEach((l) => l(f))

/** An error whose message is already written for the person. */
export class DataError extends Error {
  constructor(message: string, public code = 'unknown') { super(message); this.name = 'DataError' }
}

interface Postgrest { code?: string; message?: string; details?: string | null; status?: number }

/** Turns a Supabase / PostgREST error into a sentence for the person. */
export function describeDbError(e: unknown, action = 'save that'): DataError {
  const err = (e ?? {}) as Postgrest
  const text = `${err.code ?? ''} ${err.message ?? ''}`.toLowerCase()
  if (err.code === '42501' || /row-level security|permission denied|violates row-level/.test(text)) return new DataError(`You don’t have permission to ${action}. Ask a manager or an admin.`, 'permission')
  if (/jwt|pgrst30[0-9]|not authenticated/.test(text) || err.status === 401) return new DataError('Your session has ended. Sign in again.', 'session')
  if (err.code === '23505') return new DataError('That already exists.', 'duplicate')
  if (err.code === '23503') return new DataError('That record is linked to something that no longer exists.', 'reference')
  if (/failed to fetch|network|load failed|fetch/.test(text) && !err.code) return new DataError('We can’t reach the server. Check your connection and try again.', 'network')
  if (err instanceof DataError) return err
  return new DataError(err.message ? `Something went wrong: ${err.message}` : 'Something went wrong. Try again in a moment.', 'unknown')
}

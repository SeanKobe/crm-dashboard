import { DataError, describeDbError, notifyDataFailure } from './errors'

// A cache of one kind of record that writes itself back to the database.
//
// The data services keep their original shape: read the whole list, change it in memory, write the whole list back. In Supabase mode
// `get()` returns the cache and `set(next)` compares it with the previous list and sends only what changed: new rows are inserted,
// changed rows are updated (an update never needs the insert policy, so people who may edit a row but not create one still can),
// and rows that left the list are soft-deleted. Writes are queued in order. If one fails the cache is reloaded from the database
// (so the screen shows what is really saved), listeners are told, and a toast explains it.
export interface RemoteStoreOptions<T extends { id: string }> {
  /** What a save is about, for messages: "the deal". */
  noun: string
  load: () => Promise<T[]>
  insert: (item: T) => Promise<void>
  update: (item: T, prev: T) => Promise<void>
  /** An item left the list (the app's delete): soft delete it. */
  drop: (prev: T) => Promise<void>
  /** Called with the database's version after a failed save. */
  onReload?: (list: T[]) => void
}

export interface RemoteStore<T extends { id: string }> {
  /** Loads the list the first time, and again when it is older than `maxAgeMs` (never while a write is still on its way). */
  ensure: (maxAgeMs?: number) => Promise<void>
  get: () => T[]
  set: (next: T[]) => void
  /** Resolves when every queued write has finished; rejects with the friendly error of the first one that failed. */
  flush: () => Promise<void>
  /** Forget everything (sign out, or a different person signs in). */
  reset: () => void
}

export function createRemoteStore<T extends { id: string }>(o: RemoteStoreOptions<T>): RemoteStore<T> {
  let cache: T[] = []
  let loadedAt = 0
  let loading: Promise<void> | null = null
  let tail: Promise<void> = Promise.resolve()
  let pending = 0
  let failure: DataError | null = null
  const known = new Set<string>()
  const dropped = new Map<string, T>()
  const same = (a: T, b: T): boolean => JSON.stringify(a) === JSON.stringify(b)

  const reload = async (): Promise<void> => {
    try { cache = await o.load() } catch (e) { throw describeDbError(e, `load ${o.noun}`) }
    loadedAt = Date.now()
    known.clear(); dropped.clear()
    for (const i of cache) known.add(i.id)
  }

  const ensure: RemoteStore<T>['ensure'] = async (maxAgeMs = 4000) => {
    if (pending > 0) return
    if (loading) return loading
    if (loadedAt > 0 && Date.now() - loadedAt < maxAgeMs) return
    loading = reload().finally(() => { loading = null })
    return loading
  }

  const set: RemoteStore<T>['set'] = (next) => {
    const before = new Map(cache.map((i) => [i.id, i]))
    const ids = new Set(next.map((i) => i.id))
    const ops: (() => Promise<void>)[] = []
    for (const item of next) {
      const p = before.get(item.id)
      if (!p) {
        const back = dropped.get(item.id)
        if (back) { dropped.delete(item.id); ops.push(() => o.update(item, back)) } // brought back after a delete
        else ops.push(async () => { await o.insert(item); known.add(item.id) })
      } else if (!same(p, item)) ops.push(() => o.update(item, p))
    }
    for (const p of before.values()) if (!ids.has(p.id)) { dropped.set(p.id, p); ops.push(() => o.drop(p)) }
    cache = next
    if (ops.length === 0) return
    pending += 1
    tail = tail.then(async () => { for (const op of ops) await op() }).catch(async (e: unknown) => {
      const friendly = describeDbError(e, `save ${o.noun}`)
      failure ??= friendly
      notifyDataFailure({ title: `Couldn’t save ${o.noun}`, message: friendly.message })
      try { await reload(); o.onReload?.(cache) } catch { /* the next read will try again */ }
    }).finally(() => { pending -= 1 })
  }

  const flush: RemoteStore<T>['flush'] = async () => {
    await tail
    if (failure) { const f = failure; failure = null; throw f }
  }

  const reset: RemoteStore<T>['reset'] = () => { cache = []; loadedAt = 0; loading = null; known.clear(); dropped.clear(); failure = null }
  return { ensure, get: () => cache, set, flush, reset }
}

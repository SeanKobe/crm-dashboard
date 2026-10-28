import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { listRecords, restoreRecord, subscribeRecords, type RecordEntry } from '../services/records'
import { RecordsContext, type RecordsApi } from './recordsContext'

// Loads the record directory once and keeps it fresh when deals or contacts change.
export function RecordsProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<RecordEntry[]>([])
  const [ready, setReady] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let live = true
    listRecords().then((r) => { if (live) { setEntries(r); setReady(true) } }).catch(() => { if (live) setReady(true) })
    return () => { live = false }
  }, [tick])
  useEffect(() => subscribeRecords(() => setTick((t) => t + 1)), [])

  const byKey = useMemo(() => new Map(entries.map((e) => [`${e.type}:${e.id}`, e])), [entries])
  const restore = useCallback(async (link: { type: RecordEntry['type']; id: string }) => {
    const ok = await restoreRecord(link.type, link.id)
    if (ok) setTick((t) => t + 1)
    return ok
  }, [])

  const api = useMemo<RecordsApi>(() => ({
    ready,
    records: entries.filter((e) => !e.deleted),
    resolve: (link) => {
      if (!link) return null
      if (!ready) return { name: null, deleted: false, canRestore: false, type: link.type }
      const e = byKey.get(`${link.type}:${link.id}`)
      return e ? { name: e.deleted ? null : e.name, deleted: e.deleted, canRestore: e.canRestore, type: link.type } : { name: null, deleted: true, canRestore: false, type: link.type }
    },
    restore,
  }), [ready, entries, byKey, restore])

  return <RecordsContext.Provider value={api}>{children}</RecordsContext.Provider>
}

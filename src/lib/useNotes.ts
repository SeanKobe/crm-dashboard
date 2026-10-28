import { useCallback, useEffect, useRef, useState } from 'react'
import { configureNotesService, notesService, subscribeNotes } from '../services/notes'
import type { Note, NoteInput, NoteListOptions, NotePatch } from '../types'

// Data hook for notes: loading / error state, the list, and mutations with their own pending / error state.
// It only talks to the notes service, so swapping localStorage for an API never touches components.
export type LoadStatus = 'loading' | 'ready' | 'error'

export interface UseNotesOptions extends NoteListOptions {
  /** Hold the loading state for at least this long on the first load of the session (skeleton). */
  minLoadMs?: number
  /** Test hook: make reads fail (?error=1). */
  simulateError?: boolean
}

export interface UseNotes {
  notes: Note[]
  status: LoadStatus
  error: string | null
  reload: () => void
  /** Number of mutations in flight. */
  pending: number
  mutationError: string | null
  create: (input?: NoteInput) => Promise<Note>
  update: (id: string, patch: NotePatch) => Promise<Note>
  remove: (id: string) => Promise<Note>
  restore: (id: string) => Promise<Note>
}

let firstLoadDone = false
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

export function useNotes({ linkId, minLoadMs = 0, simulateError = false }: UseNotesOptions = {}): UseNotes {
  const [notes, setNotes] = useState<Note[]>([])
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(0)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const linkRef = useRef(linkId)
  useEffect(() => { linkRef.current = linkId })

  useEffect(() => {
    let live = true
    configureNotesService({ failReads: simulateError })
    const wait = !firstLoadDone && minLoadMs ? sleep(minLoadMs) : Promise.resolve()
    Promise.all([notesService.list({ linkId }), wait])
      .then(([rows]) => { if (!live) return; firstLoadDone = true; setNotes(rows); setError(null); setStatus('ready') })
      .catch((e: unknown) => { if (!live) return; setError(e instanceof Error ? e.message : 'Could not load notes.'); setStatus('error') })
    return () => { live = false }
  }, [linkId, minLoadMs, simulateError, tick])

  // Keep every hook instance in step with writes made anywhere (the service emits after each write).
  useEffect(() => subscribeNotes((e) => {
    if (e.type !== 'upsert') return
    const n = e.note
    const wanted = n.deletedAt === null && (!linkRef.current || n.link?.id === linkRef.current)
    setNotes((list) => {
      const rest = list.filter((x) => x.id !== n.id)
      if (!wanted) return rest
      const i = list.findIndex((x) => x.id === n.id)
      if (i < 0) return [n, ...rest]
      const next = [...list]
      next[i] = n
      return next
    })
  }), [])

  const track = useCallback(async <T,>(run: () => Promise<T>): Promise<T> => {
    setPending((p) => p + 1)
    try {
      const result = await run()
      setMutationError(null)
      return result
    } catch (e) {
      setMutationError(e instanceof Error ? e.message : 'Something went wrong.')
      throw e
    } finally {
      setPending((p) => p - 1)
    }
  }, [])

  return {
    notes,
    status,
    error,
    reload: useCallback(() => { setStatus('loading'); setTick((t) => t + 1) }, []),
    pending,
    mutationError,
    create: useCallback((input) => track(() => notesService.create(input)), [track]),
    update: useCallback((id, patch) => track(() => notesService.update(id, patch)), [track]),
    remove: useCallback((id) => track(() => notesService.delete(id)), [track]),
    restore: useCallback((id) => track(() => notesService.restore(id)), [track]),
  }
}

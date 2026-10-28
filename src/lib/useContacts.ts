import { useCallback, useEffect, useRef, useState } from 'react'
import { configureContactsService, contactsService, subscribeContacts } from '../services/contacts'
import type { Contact, ContactPage, ContactQuery } from '../types'

// Data hooks for contacts. They only talk to services/contacts.ts. Two shapes:
//  - useContacts(query): one page of results plus loading / refreshing / error state
//  - useContact(id): one contact, kept in sync with writes made anywhere
/** Every contact (up to 1000), by name: for pickers that need the whole list. */
export const allContactsQuery: ContactQuery = { filters: { query: '', statuses: [], sources: [], ownerIds: [], tags: [], createdFrom: '', createdTo: '', followUp: false }, sort: { key: 'name', dir: 'asc' }, page: 1, pageSize: 1000 }

export type ContactsStatus = 'loading' | 'ready' | 'error'

export interface UseContacts {
  page: ContactPage | null
  status: ContactsStatus
  /** A new page or filter is being fetched; the previous rows stay on screen. */
  fetching: boolean
  error: string | null
  reload: () => void
}

let firstLoadDone = false
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

export function useContacts(query: ContactQuery, { minLoadMs = 0, simulateError }: { minLoadMs?: number; simulateError?: boolean } = {}): UseContacts {
  const [page, setPage] = useState<ContactPage | null>(null)
  const [status, setStatus] = useState<ContactsStatus>('loading')
  const [doneKey, setDoneKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const key = JSON.stringify(query)
  const queryRef = useRef(query)
  useEffect(() => { queryRef.current = query })

  useEffect(() => {
    let live = true
    if (simulateError !== undefined) configureContactsService({ failReads: simulateError })
    const wait = !firstLoadDone && minLoadMs ? sleep(minLoadMs) : Promise.resolve()
    Promise.all([contactsService.list(queryRef.current), wait])
      .then(([p]) => { if (!live) return; firstLoadDone = true; setPage(p); setError(null); setStatus('ready'); setDoneKey(key) })
      .catch((e: unknown) => { if (!live) return; setError(e instanceof Error ? e.message : 'Could not load contacts.'); setStatus('error'); setDoneKey(key) })
    return () => { live = false }
  }, [key, minLoadMs, simulateError, tick])

  // Any write (this page, the drawer, another page) can change which rows match: fetch again.
  useEffect(() => subscribeContacts(() => setTick((t) => t + 1)), [])

  return { page, status, fetching: doneKey !== key, error, reload: useCallback(() => { setStatus('loading'); setTick((t) => t + 1) }, []) }
}

export interface UseContact {
  /** undefined while loading, null when it does not exist. */
  contact: Contact | null | undefined
  error: string | null
}

export function useContact(id: string | null): UseContact {
  const [state, setState] = useState<{ id: string | null; contact: Contact | null | undefined; error: string | null }>({ id, contact: undefined, error: null })
  useEffect(() => {
    if (!id) return undefined
    let live = true
    contactsService.get(id).then((c) => { if (live) setState({ id, contact: c, error: null }) }).catch((e: unknown) => { if (live) setState({ id, contact: null, error: e instanceof Error ? e.message : 'Could not load the contact.' }) })
    return () => { live = false }
  }, [id])
  useEffect(() => subscribeContacts((e) => {
    const hit = e.contacts.find((c) => c.id === id)
    if (hit) setState((s) => ({ ...s, id, contact: hit }))
  }), [id])
  return state.id === id ? { contact: state.contact, error: state.error } : { contact: undefined, error: null }
}

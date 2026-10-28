import { createContext, useContext } from 'react'
import type { NoteLink, RecordType } from '../types'
import type { RecordEntry } from '../services/records'

export interface ResolvedRecord {
  /** Current name, or null while records are loading. */
  name: string | null
  /** The record was deleted (or no longer exists). */
  deleted: boolean
  canRestore: boolean
  type: RecordType
}

export interface RecordsApi {
  ready: boolean
  /** Records that exist right now (not deleted): what the "Link to record" picker offers. */
  records: RecordEntry[]
  resolve: (link: NoteLink | null | undefined) => ResolvedRecord | null
  /** Restores a deleted record that can be restored; resolves false otherwise. */
  restore: (link: NoteLink) => Promise<boolean>
}

export const RecordsContext = createContext<RecordsApi | null>(null)

export function useRecords(): RecordsApi {
  const ctx = useContext(RecordsContext)
  if (!ctx) throw new Error('useRecords must be used inside <RecordsProvider>')
  return ctx
}

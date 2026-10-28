import type { RecordType } from '../types'

/** Where a linked record lives in the app (companies have no page of their own). */
export const recordPath = (l: { type: RecordType; id: string }): string | null =>
  l.type === 'deal' ? `/deals/${l.id}` : l.type === 'contact' ? `/contacts/${l.id}` : l.type === 'note' ? `/notes/${l.id}` : l.type === 'project' ? `/projects/${l.id}` : null

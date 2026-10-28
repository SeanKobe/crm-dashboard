import { owners } from '../data/deals'
import { toneFor } from '../components/contacts/contactMeta'
import type { AttendeeRef, Tone } from '../types'

export interface AttendeeInfo {
  ref: AttendeeRef
  /** Current name ("Deleted contact" when the contact no longer exists). */
  name: string
  /** Two letters, like the Dashboard card shows. */
  initials: string
  tone: Tone
  deleted: boolean
}

const initialsOf = (name: string): string => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('')

/** Resolves an attendee to what the UI shows. `contactName` gives a contact's current name (null when unknown). */
export function attendeeInfo(ref: AttendeeRef, contactName: (id: string) => string | null): AttendeeInfo {
  if (ref.kind === 'owner') {
    const o = owners.find((x) => x.id === ref.id) ?? owners[0]
    return { ref, name: o.name, initials: initialsOf(o.name), tone: o.tone, deleted: false }
  }
  const name = contactName(ref.id)
  return name ? { ref, name, initials: initialsOf(name), tone: toneFor(name), deleted: false } : { ref, name: 'Deleted contact', initials: '?', tone: 'amber', deleted: true }
}

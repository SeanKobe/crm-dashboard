import { useEffect, useRef, useState } from 'react'
import { owners } from '../../data/deals'
import { useDeals } from '../../context/dealsContext'
import { LEAD_STATUSES, validateContactName, validateEmail, validatePhone } from '../../lib/contactsLogic'
import { contactsService, DuplicateEmailError } from '../../services/contacts'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import { TextField } from '../ui/TextField'
import { TagInput } from '../notes/TagInput'
import { SOURCES } from './contactMeta'
import type { Contact, ContactSource, LeadStatus } from '../../types'

// "Add contact": labeled fields with helper text and validation. A duplicate email is found as you type and blocks Create,
// with a link to the existing contact. On a failed submit, focus goes to the first invalid field.
export interface AddContactModalProps {
  open: boolean
  onClose: () => void
  onCreated: (c: Contact) => void
  onOpenExisting: (id: string) => void
}

const statusOptions = LEAD_STATUSES.map((s) => ({ value: s, label: s }))
const sourceOptions = SOURCES.map((s) => ({ value: s, label: s }))

export function AddContactModal({ open, onClose, onCreated, onOpenExisting }: AddContactModalProps) {
  const { currentUserId } = useDeals()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [status, setStatus] = useState<LeadStatus>('New')
  const [source, setSource] = useState<ContactSource>('Website')
  const [ownerId, setOwnerId] = useState(currentUserId)
  const [tags, setTags] = useState<string[]>([])
  const [attempted, setAttempted] = useState(0)
  const [touched, setTouched] = useState({ name: false, email: false, phone: false })
  const [dup, setDup] = useState<{ id: string; name: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  const errors = { name: validateContactName(name), email: validateEmail(email), phone: validatePhone(phone) }
  const show = (k: 'name' | 'email' | 'phone', value: string) => (attempted > 0 || (touched[k] && value) ? errors[k] : null)

  // Duplicate check follows the email as it is typed (only when it is a valid address).
  useEffect(() => {
    if (!open || errors.email) return undefined
    let live = true
    const t = setTimeout(() => { contactsService.findByEmail(email).then((c) => { if (live) setDup(c ? { id: c.id, name: c.name } : null) }).catch(() => {}) }, 250)
    return () => { live = false; clearTimeout(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, open])
  const dupShown = !errors.email && dup !== null
  useEffect(() => {
    if (!attempted) return
    ;(bodyRef.current?.closest('[role="dialog"]')?.querySelector<HTMLElement>('[aria-invalid="true"]'))?.focus()
  }, [attempted])

  const submit = async () => {
    setAttempted((n) => n + 1)
    if (errors.name || errors.email || errors.phone || dupShown) return
    setSaving(true)
    try {
      const c = await contactsService.create({ name, email, phone, company, jobTitle, status, source, ownerId, tags })
      onCreated(c)
    } catch (e) {
      if (e instanceof DuplicateEmailError) setDup({ id: e.existingId, name: 'this contact' })
    } finally {
      setSaving(false)
    }
  }
  const enter = (e: { key: string; preventDefault: () => void }) => { if (e.key === 'Enter') { e.preventDefault(); void submit() } }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add contact"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" state={dupShown ? 'disabled' : saving ? 'loading' : 'default'} onClick={() => { void submit() }}>Create contact</Button></>}
    >
      <div ref={bodyRef} className="grid grid-cols-2 gap-x-4 gap-y-4">
        <TextField className="col-span-2" label="Full name" required autoFocus value={name} onChange={setName} placeholder="Avery Brooks" error={show('name', name)} onBlur={() => setTouched((t) => ({ ...t, name: true }))} onKeyDown={enter} />
        <div className="col-span-2 flex flex-col gap-2">
          <TextField label="Email" required value={email} onChange={setEmail} placeholder="avery@acme.co" helper={dupShown ? undefined : 'Used to detect duplicates.'} error={dupShown ? 'A contact with this email already exists.' : show('email', email)} onBlur={() => setTouched((t) => ({ ...t, email: true }))} onKeyDown={enter} />
          {dupShown && dup && <button type="button" onClick={() => onOpenExisting(dup.id)} className="w-fit rounded-xs text-compact font-medium text-primary underline underline-offset-2 outline-none focus-ring">Open {dup.name === 'this contact' ? 'the existing contact' : dup.name}</button>}
        </div>
        <TextField label="Phone" value={phone} onChange={setPhone} placeholder="+1 415 555 0132" helper="Optional. Include the country code." error={show('phone', phone)} onBlur={() => setTouched((t) => ({ ...t, phone: true }))} onKeyDown={enter} />
        <TextField label="Company" value={company} onChange={setCompany} placeholder="Acme Corp" onKeyDown={enter} />
        <TextField className="col-span-2" label="Job title" value={jobTitle} onChange={setJobTitle} placeholder="Head of Procurement" onKeyDown={enter} />
        <Select label="Lead status" value={status} options={statusOptions} onChange={setStatus} />
        <Select label="Source" value={source} options={sourceOptions} onChange={setSource} />
        <Select className="col-span-2" label="Owner" value={ownerId} options={owners.map((o) => ({ value: o.id, label: o.name, leading: <Avatar initial={o.initial} tone={o.tone} size="S" /> }))} onChange={setOwnerId} />
        <div className="col-span-2 flex flex-col gap-1.5">
          <span className="text-compact font-medium leading-4 text-text-primary">Tags</span>
          <TagInput tags={tags} onChange={setTags} />
        </div>
      </div>
    </Modal>
  )
}

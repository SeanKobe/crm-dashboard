import { useEffect, useState } from 'react'
import { priorityLabel, stages } from '../../data/deals'
import { useDeals } from '../../context/dealsContext'
import { DEMO_TODAY, addDays } from '../../lib/dates'
import { parseMoney, validateName, validateValue } from '../../lib/dealsLogic'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { DateField } from '../ui/DateField'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import { TextField } from '../ui/TextField'
import type { NewDealInput, Priority, Stage } from '../../types'

// Header "Add deal": every field in one modal. Name and value are required; value must be a positive number.
export interface AddDealModalProps {
  open: boolean
  onClose: () => void
  onAdd: (input: NewDealInput) => void
}

const stageOptions = stages.filter((s) => s.id !== 'lost').map((s) => ({ value: s.id, label: s.label }))
const priorityOptions = (['high', 'medium', 'low'] as Priority[]).map((p) => ({ value: p, label: priorityLabel[p] }))

export function AddDealModal({ open, onClose, onAdd }: AddDealModalProps) {
  const { owners, currentUserId } = useDeals()
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [contact, setContact] = useState('')
  const [value, setValue] = useState('')
  const [stage, setStage] = useState<Stage>('new')
  const [ownerId, setOwnerId] = useState(currentUserId)
  const [closeDate, setCloseDate] = useState(addDays(DEMO_TODAY, 30))
  const [priority, setPriority] = useState<Priority>('medium')
  const [attempted, setAttempted] = useState(0)
  const [touched, setTouched] = useState({ name: false, value: false })

  const errors = { name: validateName(name), value: validateValue(value), date: closeDate ? null : 'Pick a close date.' }
  const show = (k: 'name' | 'value') => (attempted > 0 || (touched[k] && (k === 'name' ? name : value)) ? errors[k] : null)

  // After a failed submit, focus the first invalid field.
  useEffect(() => {
    if (!attempted) return
    const bad = document.querySelector<HTMLElement>('[role="dialog"] [aria-invalid="true"]')
    bad?.focus()
  }, [attempted])

  const submit = () => {
    setAttempted((n) => n + 1)
    if (errors.name || errors.value || errors.date) return
    onAdd({ name, company, contact, value: parseMoney(value) ?? 0, stage, ownerId, closeDate, priority })
  }
  const enter = (e: { key: string; preventDefault: () => void }) => { if (e.key === 'Enter') { e.preventDefault(); submit() } }

  return (
    <Modal open={open} onClose={onClose} title="Add deal" footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={submit}>Add deal</Button></>}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        <TextField className="col-span-2" label="Deal name" required autoFocus value={name} onChange={setName} placeholder="e.g. Acme renewal" error={show('name')} onBlur={() => setTouched((t) => ({ ...t, name: true }))} onKeyDown={enter} />
        <TextField label="Company" value={company} onChange={setCompany} placeholder="Acme Corp" onKeyDown={enter} />
        <TextField label="Contact" value={contact} onChange={setContact} placeholder="Avery Brooks" onKeyDown={enter} />
        <TextField label="Value" required prefix="$" inputMode="numeric" value={value} onChange={setValue} placeholder="12000" error={show('value')} onBlur={() => setTouched((t) => ({ ...t, value: true }))} onKeyDown={enter} />
        <DateField label="Close date" value={closeDate} onChange={setCloseDate} error={attempted ? errors.date : null} />
        <Select label="Stage" value={stage} options={stageOptions} onChange={setStage} />
        <Select label="Owner" value={ownerId} options={owners.map((o) => ({ value: o.id, label: o.name, leading: <Avatar initial={o.initial} tone={o.tone} size="S" /> }))} onChange={setOwnerId} />
        <Select label="Priority" value={priority} options={priorityOptions} onChange={setPriority} />
      </div>
    </Modal>
  )
}

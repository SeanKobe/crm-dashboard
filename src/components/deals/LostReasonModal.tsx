import { useState } from 'react'
import { LOST_REASONS } from '../../data/deals'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import type { LostReason } from '../../types'

// Moving a deal to Lost needs a reason (Price, Timing, Competitor, No response, Other). Built on Modal.
export interface LostReasonModalProps {
  open: boolean
  /** Names of the deals being moved. */
  names: string[]
  onCancel: () => void
  onConfirm: (reason: LostReason) => void
}

const options = LOST_REASONS.map((r) => ({ value: r, label: r }))

export function LostReasonModal({ open, names, onCancel, onConfirm }: LostReasonModalProps) {
  const [reason, setReason] = useState<LostReason | ''>('')
  const [error, setError] = useState<string | null>(null)
  const confirm = () => {
    if (!reason) { setError('Choose a reason before moving to Lost.'); return }
    onConfirm(reason)
  }
  const many = names.length > 1
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title="Move to Lost"
      footer={<><Button onClick={onCancel}>Cancel</Button><Button variant="destructive" strong onClick={confirm}>Move to Lost</Button></>}
    >
      <p className="mb-4">{many ? `Why were these ${names.length} deals lost?` : <>Why was <strong className="font-medium text-text-primary">{names[0]}</strong> lost?</>} The reason is saved with the deal.</p>
      <Select label="Reason" required autoFocus value={reason} options={options} placeholder="Select a reason" error={error} onChange={(v) => { setReason(v); setError(null) }} />
    </Modal>
  )
}

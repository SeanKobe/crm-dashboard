import { Button } from './Button'
import { Modal } from './Modal'

// Confirmation built on Modal (Figma "Confirm Modal"): focus lands on Cancel, Escape cancels, the destructive action is last.
export interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({ open, title, message, confirmLabel, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      footer={<><Button onClick={onCancel}>Cancel</Button><Button variant="destructive" strong onClick={onConfirm}>{confirmLabel}</Button></>}
    >
      {message}
    </Modal>
  )
}

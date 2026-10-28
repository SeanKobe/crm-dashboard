import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { parseMoney, validateName, validateValue } from '../../lib/dealsLogic'
import { Button } from '../ui/Button'
import { TextField } from '../ui/TextField'
import type { Stage } from '../../types'

// Quick add inside a column: name (required), company, value (positive number). Enter saves, Escape cancels.
export interface InlineAddDealProps {
  stage: Stage
  stageLabel: string
  onAdd: (input: { name: string; company: string; value: number; stage: Stage }) => void
  onCancel: () => void
}

export function InlineAddDeal({ stage, stageLabel, onAdd, onCancel }: InlineAddDealProps) {
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [value, setValue] = useState('')
  const [touched, setTouched] = useState({ name: false, value: false })
  const [submitted, setSubmitted] = useState(false)
  const nameRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  const valueRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  useEffect(() => { nameRef.current?.focus({ preventScroll: false }) }, [])

  const nameError = validateName(name)
  const valueError = validateValue(value)
  const submit = () => {
    setSubmitted(true)
    if (nameError) { nameRef.current?.focus(); return }
    if (valueError) { valueRef.current?.focus(); return }
    onAdd({ name: name.trim(), company: company.trim(), value: parseMoney(value) ?? 0, stage })
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); submit() }
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCancel() }
  }
  return (
    <form
      aria-label={`Add a deal to ${stageLabel}`}
      onSubmit={(e) => { e.preventDefault(); submit() }}
      className="flex animate-row-in flex-col gap-3 rounded-lg border border-primary bg-surface p-3 shadow-card"
    >
      <TextField label="Deal name" required value={name} onChange={setName} placeholder="e.g. Acme renewal" error={submitted || (touched.name && name) ? nameError : null} onBlur={() => setTouched((t) => ({ ...t, name: true }))} onKeyDown={onKeyDown} inputRef={nameRef} />
      <TextField label="Company" value={company} onChange={setCompany} placeholder="Optional" onKeyDown={onKeyDown} />
      <TextField label="Value" required prefix="$" inputMode="numeric" value={value} onChange={setValue} placeholder="12000" error={submitted || (touched.value && value) ? valueError : null} onBlur={() => setTouched((t) => ({ ...t, value: true }))} onKeyDown={onKeyDown} inputRef={valueRef} />
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={submit}>Add deal</Button>
      </div>
    </form>
  )
}

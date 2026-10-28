import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/cn'
import { DuplicateProjectError, projectsService } from '../../services/projects'
import { useProjects } from '../../lib/useProjects'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { DateField } from '../ui/DateField'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import { FieldRow, TextField } from '../ui/TextField'
import { LinkPicker } from '../calendar/pickers'
import { CURRENT_USER, PROJECT_STATUSES, allOwners, statusStyle } from './projectMeta'
import type { EventLink, Project, ProjectStatus } from '../../types'

// "New project" form (Modal): name (required, unique), description, status, owner, due date and linked records.
// Opened from the Projects page, and from the Deal and Contact drawers with the record already linked.
export interface ProjectFormModalProps {
  open: boolean
  onClose: () => void
  onCreated: (project: Project) => void
  /** Records the project starts out linked to. */
  initialLinks?: EventLink[]
  /** A name to start with ("Acme renewal: project"). */
  initialName?: string
}

const NAME_MAX = 60
const STATUS_OPTIONS = PROJECT_STATUSES.map((s) => ({ value: s, label: s, leading: <span aria-hidden className={cn('size-2 rounded-full', statusStyle[s].dot)} /> }))
const OWNER_OPTIONS = allOwners.map((o) => ({ value: o.id, label: o.name, leading: <Avatar initial={o.initial} tone={o.tone} size="M" /> }))

export function ProjectFormModal({ open, onClose, onCreated, initialLinks = [], initialName = '' }: ProjectFormModalProps) {
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<ProjectStatus>('Planned')
  const [ownerId, setOwnerId] = useState(CURRENT_USER)
  const [dueDate, setDueDate] = useState('')
  const [links, setLinks] = useState<EventLink[]>(initialLinks)
  const [attempted, setAttempted] = useState(0)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const body = useRef<HTMLDivElement>(null)
  const { projects } = useProjects()
  const trimmed = name.trim()
  const duplicate = trimmed !== '' && projects.some((p) => p.name.trim().toLowerCase() === trimmed.toLowerCase())
  const nameError = !trimmed ? 'Enter a project name.' : trimmed.length > NAME_MAX ? `Use ${NAME_MAX} characters or fewer.` : duplicate ? 'A project with this name already exists.' : serverError
  const shownNameError = attempted > 0 || duplicate ? nameError : null

  useEffect(() => {
    if (!attempted) return
    body.current?.closest('[role="dialog"]')?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [attempted])

  const submit = async () => {
    setAttempted((n) => n + 1)
    if (nameError) return
    setSaving(true)
    try {
      const created = await projectsService.create({ name: trimmed, description: description.trim(), status, ownerId, dueDate, links })
      onCreated(created)
    } catch (e) {
      setServerError(e instanceof DuplicateProjectError ? e.message : 'Couldn’t create the project. Try again.')
      setAttempted((n) => n + 1)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New project"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" state={saving ? 'loading' : 'default'} onClick={() => { void submit() }}>Create project</Button></>}
    >
      <div ref={body} className="flex flex-col gap-4" onKeyDown={(e) => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT' && (e.target as HTMLInputElement).type === 'text') { e.preventDefault(); void submit() } }}>
        <TextField label="Name" required autoFocus value={name} onChange={(v) => { setName(v); setServerError(null) }} placeholder="Name your project" error={shownNameError} helper="Use a short, unique name (up to 60 characters)." maxLength={NAME_MAX + 10} />
        <TextField label="Description" multiline rows={3} value={description} onChange={setDescription} placeholder="What is this project for?" />
        <FieldRow>
          <Select label="Status" value={status} options={STATUS_OPTIONS} onChange={setStatus} />
          <Select label="Owner" value={ownerId} options={OWNER_OPTIONS} onChange={setOwnerId} />
        </FieldRow>
        <DateField label="Due date" value={dueDate} onChange={setDueDate} helper="Optional." />
        <div className="flex flex-col gap-1.5">
          <span className="text-compact font-medium leading-4">Linked records</span>
          <LinkPicker value={links} onChange={setLinks} types={['deal', 'contact', 'company']} />
        </div>
      </div>
    </Modal>
  )
}

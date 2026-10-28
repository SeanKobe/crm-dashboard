import { Check, TriangleAlert, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { priorityLabel, stages } from '../../data/deals'
import { useDeals } from '../../context/dealsContext'
import { cn } from '../../lib/cn'
import { daysInStage, formatShort } from '../../lib/dates'
import { isOverdue, parseMoney, validateName, validateValue } from '../../lib/dealsLogic'
import { Avatar } from '../ui/Avatar'
import { Button } from '../ui/Button'
import { DateField } from '../ui/DateField'
import { IconButton } from '../ui/IconButton'
import { Select } from '../ui/Select'
import { StatusPill } from '../ui/StatusPill'
import { TextField } from '../ui/TextField'
import { useRecords } from '../../context/recordsContext'
import { DealContactLink } from '../contacts/DealContactLink'
import { DealNotes } from '../notes/DealNotes'
import { UpcomingEvents } from '../calendar/UpcomingEvents'
import { LinkedProjects } from '../projects/LinkedProjects'
import { ActivityTimelineItem } from './ActivityTimelineItem'
import { stageStyle } from './stageStyles'
import type { ActivityKind, PipelineDeal, Priority, Stage } from '../../types'

// Deal detail drawer body (no Figma version: built from Text Field, Select, Date Picker Field, Status Pill and Activity Timeline Item).
// Every change saves by itself; text fields wait 400ms after typing, pickers save at once. A "Saved" mark confirms it.
const SAVE_DELAY = 400
const stageOptions = stages.map((s) => ({ value: s.id, label: s.label, leading: <span aria-hidden className={cn('size-2 rounded-full', stageStyle[s.id].dot)} /> }))
const priorityOptions = (['high', 'medium', 'low'] as Priority[]).map((p) => ({ value: p, label: priorityLabel[p] }))
const LOG_KINDS: { value: Extract<ActivityKind, 'note' | 'call' | 'email' | 'meeting'>; label: string }[] = [
  { value: 'note', label: 'Note' }, { value: 'call', label: 'Call' }, { value: 'email', label: 'Email' }, { value: 'meeting', label: 'Meeting' },
]

interface Draft {
  title: string
  company: string
  contact: string
  value: string
  nextStep: string
  notes: string
}
const toDraft = (d: PipelineDeal): Draft => ({ title: d.title, company: d.company, contact: d.contact, value: String(d.value), nextStep: d.nextStep, notes: d.notes })

export interface DealDrawerBodyProps {
  deal: PipelineDeal
  onClose: () => void
  onMove: (id: string, to: Stage) => void
}

export function DealDrawerBody({ deal, onClose, onMove }: DealDrawerBodyProps) {
  const { updateDeal, addActivity, owners, ownerById } = useDeals()
  const { resolve } = useRecords()
  const linkedContact = deal.contactId ? resolve({ type: 'contact', id: deal.contactId }) : null
  const [draft, setDraft] = useState<Draft>(() => toDraft(deal))
  const [saved, setSaved] = useState(false)
  const [logKind, setLogKind] = useState<(typeof LOG_KINDS)[number]['value']>('note')
  const [logText, setLogText] = useState('')
  const [logError, setLogError] = useState<string | null>(null)
  const dealRef = useRef(deal)
  const dirty = useRef(false)
  const savedTimer = useRef(0)
  useEffect(() => { dealRef.current = deal })
  useEffect(() => () => clearTimeout(savedTimer.current), [])

  const flash = () => {
    setSaved(true)
    clearTimeout(savedTimer.current)
    savedTimer.current = window.setTimeout(() => setSaved(false), 2000)
  }
  const save = (patch: Partial<PipelineDeal>) => { updateDeal(deal.id, patch); flash() }

  const errors = { title: validateName(draft.title), value: validateValue(draft.value) }
  const commit = () => {
    const d = dealRef.current
    const patch: Partial<PipelineDeal> = {}
    if (!errors.title && draft.title.trim() !== d.title) patch.title = draft.title.trim()
    const v = parseMoney(draft.value)
    if (!errors.value && v !== null && v !== d.value) patch.value = v
    if (draft.company.trim() !== d.company) patch.company = draft.company.trim()
    if (draft.contact.trim() !== d.contact) patch.contact = draft.contact.trim()
    if (draft.nextStep !== d.nextStep) patch.nextStep = draft.nextStep
    if (draft.notes !== d.notes) patch.notes = draft.notes
    if (Object.keys(patch).length) save(patch)
  }
  const edit = (patch: Partial<Draft>) => { dirty.current = true; setDraft((x) => ({ ...x, ...patch })) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!dirty.current) return undefined; const t = setTimeout(commit, SAVE_DELAY); return () => clearTimeout(t) }, [draft])

  const log = () => {
    if (!logText.trim()) { setLogError('Add a short description of what happened.'); return }
    addActivity(deal.id, { kind: logKind, title: logKind === 'note' ? 'Note added' : `${LOG_KINDS.find((k) => k.value === logKind)?.label} logged`, description: logText.trim() })
    setLogText('')
    setLogError(null)
    flash()
  }

  const days = daysInStage(deal.stageSince)
  const owner = ownerById(deal.ownerId)
  return (
    <>
      <header className="flex shrink-0 flex-col gap-3 border-b border-border px-6 pb-4 pt-5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <TextField label="Deal name" hideLabel value={draft.title} onChange={(v) => edit({ title: v })} onBlur={commit} error={errors.title} />
          </div>
          <span aria-live="polite" className={cn('mt-2.5 flex h-5 shrink-0 items-center gap-1 text-xs font-medium text-success-strong transition-opacity duration-move ease-out motion-reduce:transition-none', saved ? 'opacity-100' : 'opacity-0')}>
            {saved && <><Check aria-hidden className="size-4" strokeWidth={2} />Saved</>}
          </span>
          <IconButton icon={X} label="Close deal details" size="sm" onClick={onClose} />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs leading-3.75 text-text-secondary">
          <StatusPill stage={deal.stage} />
          <span>{days} {days === 1 ? 'day' : 'days'} in stage</span>
          {isOverdue(deal) && <span className="flex items-center gap-1 font-medium text-warning-foreground"><TriangleAlert aria-hidden className="size-4" strokeWidth={1.75} />Overdue · {formatShort(deal.closeDate)}</span>}
          {deal.stage === 'lost' && deal.lostReason && <span>Lost: {deal.lostReason}</span>}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pb-18 pt-5">
        <section aria-labelledby="drawer-details" className="flex flex-col gap-4">
          <h3 id="drawer-details" className="text-base font-medium">Details</h3>
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <Select label="Stage" value={deal.stage} options={stageOptions} onChange={(s) => onMove(deal.id, s)} />
            <Select label="Owner" value={deal.ownerId} options={owners.map((o) => ({ value: o.id, label: o.name, leading: <Avatar initial={o.initial} tone={o.tone} size="S" /> }))} onChange={(id) => save({ ownerId: id })} />
            <TextField label="Value" prefix="$" inputMode="numeric" value={draft.value} onChange={(v) => edit({ value: v })} onBlur={commit} error={errors.value} />
            <DateField label="Close date" partial="ignore" value={deal.closeDate} onChange={(v) => v && save({ closeDate: v })} />
            <Select label="Priority" value={deal.priority} options={priorityOptions} onChange={(p) => save({ priority: p })} />
            {deal.contactId ? (
              <TextField label="Contact" value={linkedContact?.deleted ? 'Deleted contact' : linkedContact?.name ?? ''} onChange={() => {}} disabled helper="Linked contact. Edit it in Contacts." />
            ) : (
              <TextField label="Contact" value={draft.contact} onChange={(v) => edit({ contact: v })} onBlur={commit} />
            )}
            <TextField className="col-span-2" label="Company" value={draft.company} onChange={(v) => edit({ company: v })} onBlur={commit} />
          </div>
        </section>

        <DealContactLink contactId={deal.contactId} />

        <TextField label="Next step" value={draft.nextStep} onChange={(v) => edit({ nextStep: v })} onBlur={commit} placeholder="What needs to happen next?" helper={`Owned by ${owner.name}.`} />
        <TextField label="Notes" multiline rows={4} value={draft.notes} onChange={(v) => edit({ notes: v })} onBlur={commit} placeholder="Context, decisions, anything the team should know" />

        <DealNotes deal={deal} />

        <LinkedProjects link={{ type: 'deal', id: deal.id }} nameHint={`${deal.title}: project`} />

        <UpcomingEvents link={{ type: 'deal', id: deal.id }} attendees={deal.contactId ? [{ kind: 'contact', id: deal.contactId }] : []} titleHint={`${deal.title}: meeting`} />

        <section aria-labelledby="drawer-activity" className="flex flex-col gap-4">
          <h3 id="drawer-activity" className="text-base font-medium">Activity</h3>
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <Select label="Activity type" hideLabel className="w-32 shrink-0" value={logKind} options={LOG_KINDS} onChange={setLogKind} />
              <TextField label="What happened?" hideLabel className="min-w-0 flex-1" placeholder="What happened?" value={logText} onChange={(v) => { setLogText(v); setLogError(null) }} error={null} invalid={Boolean(logError)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); log() } }} />
              <Button onClick={log}>Log</Button>
            </div>
            {logError && <p role="alert" className="text-xs leading-3.75 text-danger-strong">{logError}</p>}
          </div>
          <ol className="flex flex-col" aria-label="Activity timeline">
            {deal.activity.map((a, i) => <ActivityTimelineItem key={a.id} activity={a} owner={ownerById(a.ownerId)} last={i === deal.activity.length - 1} />)}
          </ol>
        </section>
      </div>
    </>
  )
}

export function DealNotFound({ id, onClose }: { id: string; onClose: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h2 className="text-base font-medium">We couldn’t find that deal</h2>
      <p className="max-w-72 text-sm leading-4.25 text-text-secondary">No deal matches “{id}”. It may have been deleted, or the link is wrong.</p>
      <Button variant="primary" onClick={onClose}>Back to deals</Button>
    </div>
  )
}

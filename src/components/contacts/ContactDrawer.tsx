import { Check, ChevronDown, ChevronUp, Handshake, Mail, Phone, StickyNote, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { owners } from '../../data/deals'
import { stageLabel } from '../../data/deals'
import { useDeals } from '../../context/dealsContext'
import { useToast } from '../../context/toastContext'
import { cn } from '../../lib/cn'
import { LEAD_STATUSES, validateContactName, validateEmail, validatePhone } from '../../lib/contactsLogic'
import { formatShort, shortRelative } from '../../lib/dates'
import { money } from '../../lib/dealsLogic'
import { preview } from '../../lib/noteText'
import { useAutosave } from '../../lib/useAutosave'
import { useNotes } from '../../lib/useNotes'
import { contactsService } from '../../services/contacts'
import { Avatar } from '../ui/Avatar'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { DateField } from '../ui/DateField'
import { IconButton } from '../ui/IconButton'
import { Select } from '../ui/Select'
import { SkeletonBlock, SkeletonLine } from '../ui/Skeleton'
import { StatusPill } from '../ui/StatusPill'
import { Tabs } from '../ui/Tabs'
import { panelId, tabId } from '../ui/tabIds'
import { TextField } from '../ui/TextField'
import { ActivityTimelineItem } from '../deals/ActivityTimelineItem'
import { TagInput } from '../notes/TagInput'
import { ScheduleButton, UpcomingEvents } from '../calendar/UpcomingEvents'
import { LinkedProjects } from '../projects/LinkedProjects'
import { toneFor, SOURCES } from './contactMeta'
import type { Contact, ContactPatch, ContactSource, LeadStatus } from '../../types'

// Contact detail drawer body: header (avatar, name, "job title at company", status, quick actions, prev / next), tabs, autosave.
type TabId = 'overview' | 'activity' | 'notes' | 'deals'
const ID_BASE = 'contact-drawer'
const statusOptions = LEAD_STATUSES.map((s) => ({ value: s, label: s }))
const sourceOptions = SOURCES.map((s) => ({ value: s, label: s }))
const ownerOptions = owners.map((o) => ({ value: o.id, label: o.name, leading: <Avatar initial={o.initial} tone={o.tone} size="S" /> }))

interface Draft { name: string; email: string; phone: string; company: string; jobTitle: string }
const toDraft = (c: Contact): Draft => ({ name: c.name, email: c.email, phone: c.phone, company: c.company, jobTitle: c.jobTitle })

export interface ContactDrawerBodyProps {
  contact: Contact
  /** Ids of the filtered list, for Previous / Next and J / K. */
  ids: string[]
  onGo: (id: string) => void
  onClose: () => void
}

export function ContactDrawerBody({ contact, ids, onGo, onClose }: ContactDrawerBodyProps) {
  const navigate = useNavigate()
  const toast = useToast()
  const { state: dealState, addDeal, currentUserId } = useDeals()
  const [tab, setTab] = useState<TabId>('overview')
  const [draft, setDraft] = useState<Draft>(() => toDraft(contact))
  const [dupEmail, setDupEmail] = useState<{ id: string; name: string } | null>(null)
  const [copied, setCopied] = useState<'email' | 'phone' | null>(null)
  const [announce, setAnnounce] = useState('')
  const copiedTimer = useRef(0)
  const save = useAutosave<ContactPatch>((patch) => contactsService.update(contact.id, patch), 600)
  const notes = useNotes({ linkId: contact.id })
  const contactRef = useRef(contact)
  useEffect(() => { contactRef.current = contact })
  useEffect(() => () => clearTimeout(copiedTimer.current), [])

  const errors = { name: validateContactName(draft.name), email: validateEmail(draft.email), phone: validatePhone(draft.phone) }
  const index = ids.indexOf(contact.id)

  const edit = (field: keyof Draft, value: string) => {
    setDraft((d) => ({ ...d, [field]: value }))
    const trimmed = value.trim()
    if (field === 'name') { if (!validateContactName(value)) save.queue({ name: trimmed }) }
    else if (field === 'phone') { if (!validatePhone(value)) save.queue({ phone: trimmed }) }
    else if (field === 'email') {
      setDupEmail(null)
      if (validateEmail(value) || trimmed.toLowerCase() === contactRef.current.email.toLowerCase()) return
      void contactsService.findByEmail(trimmed, contact.id).then((hit) => { if (hit) setDupEmail({ id: hit.id, name: hit.name }); else save.queue({ email: trimmed }) })
    } else save.queue({ [field]: trimmed } as ContactPatch)
  }

  const changeStatus = async (status: LeadStatus) => {
    if (status === contact.status) return
    await contactsService.bulkUpdate([contact.id], { status })
    setAnnounce(`Status changed to ${status}.`)
  }

  const copy = async (what: 'email' | 'phone') => {
    const text = what === 'email' ? contact.email : contact.phone
    try { await navigator.clipboard.writeText(text) } catch { /* clipboard blocked: the confirmation still shows */ }
    setCopied(what)
    setAnnounce(`${what === 'email' ? 'Email' : 'Phone number'} copied.`)
    window.clearTimeout(copiedTimer.current)
    copiedTimer.current = window.setTimeout(() => setCopied(null), 1600)
  }

  const addNote = async () => {
    const n = await notes.create({ title: '', link: { type: 'contact', id: contact.id } })
    await contactsService.update(contact.id, { noteIds: [...new Set([...contactRef.current.noteIds, n.id])] })
    await contactsService.addActivity(contact.id, { kind: 'note', title: 'Note added', description: 'Started a new note.' }, currentUserId)
    navigate(`/notes/${n.id}`)
  }

  const createDeal = async () => {
    const d = await addDeal({ name: `${contact.company || contact.name} deal`, company: contact.company, contact: contact.name, contactId: contact.id, value: 5000, stage: 'new', ownerId: contact.ownerId })
    await contactsService.update(contact.id, { dealIds: [...new Set([...contactRef.current.dealIds, d.id])] })
    await contactsService.addActivity(contact.id, { kind: 'deal', title: 'Deal created', description: `${d.title} added to New.` }, currentUserId)
    setTab('deals')
    setAnnounce('Deal created.')
    toast({ type: 'success', title: 'Deal created', message: `${d.title} is in New. Set its real value in the deal.`, action: { label: 'Open deal', onClick: () => navigate(`/deals/${d.id}`) } })
  }

  // J / K move through the filtered list while no field has focus.
  const goRef = useRef({ ids, index, onGo })
  useEffect(() => { goRef.current = { ids, index, onGo } })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (e.metaKey || e.ctrlKey || e.altKey || (t && t.closest('input, textarea, select, [contenteditable=true], [role=combobox], [role=listbox], [role=menu]'))) return
      const { ids: list, index: i, onGo: go } = goRef.current
      if (e.key.toLowerCase() === 'j' && list[i + 1]) { e.preventDefault(); go(list[i + 1]) }
      else if (e.key.toLowerCase() === 'k' && i > 0) { e.preventDefault(); go(list[i - 1]) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const linkedDeals = contact.dealIds.map((id) => dealState.deals.find((d) => d.id === id)).filter((d): d is NonNullable<typeof d> => Boolean(d))
  const saveStatus = save.status

  return (
    <>
      <header className="flex shrink-0 flex-col gap-4 border-b border-border px-6 pb-4 pt-5 max-lg:px-4">
        <div className="flex items-start gap-3">
          <Avatar initial={contact.name[0] ?? '?'} tone={toneFor(contact.name)} size="XL" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-medium leading-6">{contact.name}</h2>
            <p className="truncate text-compact text-text-secondary">{contact.jobTitle ? `${contact.jobTitle}${contact.company ? ` at ${contact.company}` : ''}` : contact.company || 'No job title yet'}</p>
          </div>
          <span aria-live="polite" role="status" data-save-status={saveStatus} className="mt-1.5 flex h-5 shrink-0 items-center gap-1 text-xs font-medium">
            {saveStatus === 'saving' && <span className="text-text-secondary">Saving…</span>}
            {saveStatus === 'saved' && <span className="flex items-center gap-1 text-success-strong"><Check aria-hidden className="size-4" strokeWidth={2} />Saved</span>}
            {saveStatus === 'error' && <span className="text-danger-strong">Couldn’t save. <button type="button" onClick={() => { void save.retry() }} className="underline underline-offset-2">Retry</button></span>}
          </span>
          <IconButton icon={ChevronUp} label="Previous contact (K)" size="sm" state={index > 0 ? 'default' : 'disabled'} onClick={() => onGo(ids[index - 1])} />
          <IconButton icon={ChevronDown} label="Next contact (J)" size="sm" state={index >= 0 && index < ids.length - 1 ? 'default' : 'disabled'} onClick={() => onGo(ids[index + 1])} />
          <IconButton icon={X} label="Close contact details" size="sm" onClick={onClose} />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <Select label="Status" className="w-44" value={contact.status} options={statusOptions} onChange={(s) => { void changeStatus(s) }} />
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Quick actions">
            <Button icon={copied === 'email' ? Check : Mail} onClick={() => { void copy('email') }}>{copied === 'email' ? 'Copied' : 'Copy email'}</Button>
            <Button icon={copied === 'phone' ? Check : Phone} state={contact.phone ? 'default' : 'disabled'} onClick={() => { void copy('phone') }}>{copied === 'phone' ? 'Copied' : 'Copy phone'}</Button>
            <Button icon={StickyNote} onClick={() => { void addNote() }}>Add note</Button>
            <Button icon={Handshake} onClick={() => { void createDeal() }}>Create deal</Button>
            <ScheduleButton link={{ type: 'contact', id: contact.id }} attendees={[{ kind: 'contact', id: contact.id }]} titleHint={`Meeting with ${contact.name}`} />
          </div>
        </div>
        <Tabs<TabId>
          label="Contact sections"
          idBase={ID_BASE}
          value={tab}
          onChange={setTab}
          tabs={[{ id: 'overview', label: 'Overview' }, { id: 'activity', label: 'Activity', count: contact.activity.length }, { id: 'notes', label: 'Notes', count: notes.notes.length }, { id: 'deals', label: 'Deals', count: linkedDeals.length }]}
        />
      </header>

      <div role="status" aria-live="polite" className="sr-only" data-contact-announcer>{announce}</div>
      <div id={panelId(ID_BASE, tab)} role="tabpanel" aria-labelledby={tabId(ID_BASE, tab)} tabIndex={0} className="min-h-0 flex-1 overflow-y-auto px-6 pb-18 pt-5 outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-focus-ring max-lg:px-4">
        {tab === 'overview' && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <TextField className="col-span-2" label="Full name" required value={draft.name} onChange={(v) => edit('name', v)} error={errors.name} />
            <div className="col-span-2 flex flex-col gap-2">
              <TextField label="Email" required value={draft.email} onChange={(v) => edit('email', v)} error={dupEmail ? 'A contact with this email already exists.' : errors.email} />
              {dupEmail && <button type="button" onClick={() => onGo(dupEmail.id)} className="w-fit rounded-xs text-compact font-medium text-primary underline underline-offset-2 outline-none focus-ring">Open {dupEmail.name}</button>}
            </div>
            <TextField label="Phone" value={draft.phone} onChange={(v) => edit('phone', v)} error={errors.phone} helper="Include the country code." />
            <TextField label="Company" value={draft.company} onChange={(v) => edit('company', v)} />
            <TextField className="col-span-2" label="Job title" value={draft.jobTitle} onChange={(v) => edit('jobTitle', v)} />
            <Select label="Source" value={contact.source} options={sourceOptions} onChange={(s: ContactSource) => save.queue({ source: s }, true)} />
            <Select label="Owner" value={contact.ownerId} options={ownerOptions} onChange={(o) => save.queue({ ownerId: o }, true)} />
            <DateField label="Last contacted" partial="ignore" value={contact.lastContactedAt?.slice(0, 10) ?? ''} onChange={(v) => save.queue({ lastContactedAt: v ? `${v}T09:00:00` : null }, true)} helper={contact.lastContactedAt ? `${shortRelative(contact.lastContactedAt)}.` : 'Not contacted yet.'} />
            <div className="flex flex-col gap-1.5">
              <span className="text-compact font-medium leading-4">Created</span>
              <p className="flex h-10 items-center text-sm text-text-secondary">{formatShort(contact.createdAt)}</p>
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <span className="text-compact font-medium leading-4">Tags</span>
              <TagInput tags={contact.tags} onChange={(tags) => save.queue({ tags }, true)} onAnnounce={setAnnounce} />
            </div>
            <div className="col-span-2"><LinkedProjects link={{ type: 'contact', id: contact.id }} nameHint={`${contact.name}: project`} /></div>
            <div className="col-span-2"><UpcomingEvents link={{ type: 'contact', id: contact.id }} attendeeId={contact.id} attendees={[{ kind: 'contact', id: contact.id }]} titleHint={`Meeting with ${contact.name}`} /></div>
          </div>
        )}
        {tab === 'activity' && (
          <ol aria-label="Activity timeline" className="flex flex-col">
            {contact.activity.map((a, i) => <ActivityTimelineItem key={a.id} activity={a} owner={owners.find((o) => o.id === a.ownerId) ?? owners[0]} last={i === contact.activity.length - 1} />)}
            {contact.activity.length === 0 && <p className="text-sm text-text-secondary">No activity yet.</p>}
          </ol>
        )}
        {tab === 'notes' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center"><p className="flex-1 text-sm text-text-secondary">Notes linked to {contact.name}.</p><Button icon={StickyNote} onClick={() => { void addNote() }}>Add note</Button></div>
            {notes.status === 'loading' && <div role="status" aria-busy="true" aria-label="Loading notes" className="flex flex-col gap-2"><SkeletonBlock className="h-14" /><SkeletonBlock className="h-14" /></div>}
            {notes.status === 'ready' && notes.notes.length === 0 && <p className="text-sm text-text-secondary">No notes yet. Add the first one.</p>}
            <ul className="flex flex-col gap-1" aria-label="Linked notes">
              {[...notes.notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((n) => (
                <li key={n.id}>
                  <button type="button" data-linked-note={n.id} onClick={() => navigate(`/notes/${n.id}`)} className="flex w-full items-start gap-3 rounded-md border border-border px-3 py-2 text-left outline-none transition-colors duration-hover ease-out hover:border-border-strong hover:bg-surface-subtle focus-ring motion-reduce:transition-none">
                    <StickyNote aria-hidden className="mt-0.5 size-5 shrink-0 text-text-secondary" strokeWidth={1.75} />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5"><span className="truncate text-sm font-medium leading-4.25">{n.title || 'Untitled note'}</span><span className="truncate text-compact leading-4 text-text-secondary">{preview(n.body, 90) || 'No content yet'}</span></span>
                    <span className="shrink-0 text-xs leading-3.75 text-text-secondary">{shortRelative(n.updatedAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {tab === 'deals' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center"><p className="flex-1 text-sm text-text-secondary">Deals linked to {contact.name}.</p><Button icon={Handshake} onClick={() => { void createDeal() }}>Create deal</Button></div>
            {linkedDeals.length === 0 && <p className="text-sm text-text-secondary">No deals yet. Create one to start tracking this opportunity.</p>}
            <ul className="flex flex-col gap-1" aria-label="Linked deals">
              {linkedDeals.map((d) => (
                <li key={d.id}>
                  <button type="button" data-linked-deal={d.id} onClick={() => navigate(`/deals/${d.id}`)} className="flex w-full items-center gap-3 rounded-md border border-border px-3 py-2.5 text-left outline-none transition-colors duration-hover ease-out hover:border-border-strong hover:bg-surface-subtle focus-ring motion-reduce:transition-none">
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5"><span className="truncate text-sm font-medium leading-4.25">{d.title}</span><span className="truncate text-xs leading-3.75 text-text-secondary">{money(d.value)} · closes {formatShort(d.closeDate)} · {stageLabel(d.stage)}</span></span>
                    <StatusPill stage={d.stage} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <footer className={cn('shrink-0 border-t border-border px-6 py-2 text-xs text-text-secondary max-lg:px-4')}>
        <span>Contact {index >= 0 ? `${index + 1} of ${ids.length}` : ''}</span>
        <span className="float-right max-lg:hidden">J next · K previous · Esc close</span>
        {notes.pending > 0 && <Badge className="ml-2">Syncing</Badge>}
      </footer>
    </>
  )
}

export function ContactDrawerSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading contact" className="flex flex-col gap-4 p-6">
      <div className="flex gap-3"><SkeletonBlock className="size-10 rounded-full" /><div className="flex flex-col gap-2"><SkeletonLine className="h-5 w-48" /><SkeletonLine className="w-64" /></div></div>
      <SkeletonBlock className="h-10 w-full" /><SkeletonBlock className="h-40 w-full" />
    </div>
  )
}

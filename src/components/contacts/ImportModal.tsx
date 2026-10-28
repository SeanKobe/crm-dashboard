import { CircleAlert, CircleCheck, FileSpreadsheet, Upload } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { owners } from '../../data/deals'
import { useDeals } from '../../context/dealsContext'
import { cn } from '../../lib/cn'
import { downloadText, parseCsv, toCsv } from '../../lib/csv'
import { LEAD_STATUSES, isEmail, validatePhone } from '../../lib/contactsLogic'
import { contactsService } from '../../services/contacts'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Select } from '../ui/Select'
import { SOURCES } from './contactMeta'
import type { Contact, ContactSource, LeadStatus, NewContactInput } from '../../types'

// CSV import: drop zone + template, preview of the first 5 rows, column mapping (auto-matched by header), a valid / invalid summary
// with row-level messages, and an Import button that stays disabled until at least one row is valid.
type Field = 'name' | 'email' | 'phone' | 'company' | 'jobTitle' | 'status' | 'source' | 'owner' | 'tags'
const FIELDS: { id: Field; label: string; required?: boolean; aliases: string[] }[] = [
  { id: 'name', label: 'Name', required: true, aliases: ['name', 'fullname', 'contactname', 'contact'] },
  { id: 'email', label: 'Email', required: true, aliases: ['email', 'emailaddress', 'e-mail', 'mail'] },
  { id: 'phone', label: 'Phone', aliases: ['phone', 'phonenumber', 'mobile', 'tel', 'telephone'] },
  { id: 'company', label: 'Company', aliases: ['company', 'organization', 'organisation', 'account'] },
  { id: 'jobTitle', label: 'Job title', aliases: ['jobtitle', 'title', 'role', 'position'] },
  { id: 'status', label: 'Lead status', aliases: ['status', 'leadstatus', 'stage'] },
  { id: 'source', label: 'Source', aliases: ['source', 'leadsource', 'origin'] },
  { id: 'owner', label: 'Owner', aliases: ['owner', 'assignedto', 'accountowner', 'rep'] },
  { id: 'tags', label: 'Tags', aliases: ['tags', 'labels', 'tag'] },
]
const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9-]/g, '')
const TEMPLATE = toCsv([['Name', 'Email', 'Phone', 'Company', 'Job title', 'Status', 'Source', 'Owner', 'Tags'], ['Avery Brooks', 'avery@acme.co', '+1 415 555 0132', 'Acme Corp', 'Head of Procurement', 'Qualified', 'Referral', 'Jordan Diaz', 'vip; enterprise']])

interface RowResult { row: number; input: NewContactInput | null; errors: string[]; cells: Record<Field, string> }

export interface ImportModalProps {
  open: boolean
  onClose: () => void
  onImported: (created: Contact[], skipped: number) => void
}

export function ImportModal({ open, onClose, onImported }: ImportModalProps) {
  const { currentUserId } = useDeals()
  const [fileName, setFileName] = useState<string | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<Field, number>>({} as Record<Field, number>)
  const [error, setError] = useState<string | null>(null)
  const [over, setOver] = useState(false)
  const [existing, setExisting] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const readFile = useCallback(async (file: File) => {
    if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') { setError('Choose a .csv file.'); return }
    const parsed = parseCsv(await file.text())
    if (parsed.length < 2) { setError('The file needs a header row and at least one data row.'); return }
    const [head, ...body] = parsed
    const map = {} as Record<Field, number>
    for (const f of FIELDS) map[f.id] = head.findIndex((h) => f.aliases.includes(norm(h)))
    setError(null); setFileName(file.name); setHeaders(head); setRows(body); setMapping(map)
  }, [])
  const onDrop = (e: DragEvent) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) void readFile(f) }

  const cell = (r: string[], f: Field): string => (mapping[f] >= 0 ? (r[mapping[f]] ?? '').trim() : '')
  const emails = useMemo(() => rows.map((r) => cell(r, 'email')).filter(Boolean), [rows, mapping]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!emails.length) return undefined
    let live = true
    contactsService.existingEmails(emails).then((e) => { if (live) setExisting(e) }).catch(() => {})
    return () => { live = false }
  }, [emails])

  const results = useMemo<RowResult[]>(() => {
    const seen = new Map<string, number>()
    return rows.map((r, i) => {
      const cells = Object.fromEntries(FIELDS.map((f) => [f.id, cell(r, f.id)])) as Record<Field, string>
      const errs: string[] = []
      if (!cells.name) errs.push('Name is missing.')
      if (!cells.email) errs.push('Email is missing.')
      else if (!isEmail(cells.email)) errs.push(`“${cells.email}” is not a valid email.`)
      else if (existing.includes(cells.email.toLowerCase())) errs.push('A contact with this email already exists.')
      else if (seen.has(cells.email.toLowerCase())) errs.push(`Same email as row ${seen.get(cells.email.toLowerCase())}.`)
      else seen.set(cells.email.toLowerCase(), i + 1)
      const ph = validatePhone(cells.phone); if (ph) errs.push(`Phone: ${ph}`)
      const status = cells.status ? LEAD_STATUSES.find((s) => s.toLowerCase() === cells.status.toLowerCase()) : 'New'
      if (!status) errs.push(`Status “${cells.status}” is not one of ${LEAD_STATUSES.join(', ')}.`)
      const source = cells.source ? SOURCES.find((s) => s.toLowerCase() === cells.source.toLowerCase()) : 'Website'
      if (!source) errs.push(`Source “${cells.source}” is not one of ${SOURCES.join(', ')}.`)
      const owner = cells.owner ? owners.find((o) => o.name.toLowerCase() === cells.owner.toLowerCase() || o.id === cells.owner.toLowerCase()) : owners.find((o) => o.id === currentUserId)
      if (!owner) errs.push(`Owner “${cells.owner}” is not on the team.`)
      if (errs.length) return { row: i + 1, input: null, errors: errs, cells }
      return { row: i + 1, errors: [], cells, input: { name: cells.name, email: cells.email, phone: cells.phone, company: cells.company, jobTitle: cells.jobTitle, status: status as LeadStatus, source: source as ContactSource, ownerId: owner?.id, tags: cells.tags.split(/[;,]/).map((t) => t.trim().toLowerCase()).filter(Boolean) } }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, mapping, existing, currentUserId])
  const valid = results.filter((r) => r.input)
  const invalid = results.filter((r) => !r.input)

  const submit = async () => {
    setBusy(true)
    try {
      const out = await contactsService.importContacts(valid.map((r) => r.input as NewContactInput))
      onImported(out.created, out.skipped.length)
    } finally { setBusy(false) }
  }
  const options = headers.map((h, i) => ({ value: String(i), label: h || `Column ${i + 1}` }))
  const selectOptions = [{ value: '-1', label: 'Don’t import' }, ...options]

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="Import contacts from CSV"
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" state={valid.length === 0 ? 'disabled' : busy ? 'loading' : 'default'} onClick={() => { void submit() }}>{valid.length ? `Import ${valid.length} contact${valid.length === 1 ? '' : 's'}` : 'Import'}</Button></>}
    >
      <div className="flex flex-col gap-5">
        <div
          onDragOver={(e) => { e.preventDefault(); setOver(true) }}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
          data-dropzone
          className={cn('flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-6 text-center transition-colors duration-hover ease-out motion-reduce:transition-none', over ? 'border-primary bg-primary-soft' : 'border-border-strong bg-surface-subtle')}
        >
          {fileName ? <FileSpreadsheet aria-hidden className="size-6 text-primary" strokeWidth={1.75} /> : <Upload aria-hidden className="size-6 text-text-secondary" strokeWidth={1.75} />}
          <p className="text-sm font-medium text-text-primary">{fileName ?? 'Drop a CSV file here'}</p>
          <p className="text-compact text-text-secondary">{fileName ? `${rows.length} data rows` : 'or choose one from your computer. The first row must be the column names.'}</p>
          <div className="flex items-center gap-3">
            <Button onClick={() => input.current?.click()}>{fileName ? 'Choose a different file' : 'Choose file'}</Button>
            <button type="button" onClick={() => downloadText('contacts-template.csv', TEMPLATE)} className="rounded-xs text-compact font-medium text-primary underline underline-offset-2 outline-none focus-ring">Download template</button>
          </div>
          <input ref={input} data-csv-input type="file" accept=".csv,text/csv" aria-label="CSV file" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void readFile(f); e.target.value = '' }} />
          {error && <p role="alert" className="text-compact font-medium text-danger-strong">{error}</p>}
        </div>

        {rows.length > 0 && (
          <>
            <section aria-labelledby="imp-map" className="flex flex-col gap-3">
              <h3 id="imp-map" className="text-sm font-medium text-text-primary">Match your columns</h3>
              <div className="grid grid-cols-3 gap-x-4 gap-y-3">
                {FIELDS.map((f) => (
                  <Select key={f.id} label={f.label} required={f.required} value={String(mapping[f.id])} options={selectOptions} onChange={(v) => setMapping((m) => ({ ...m, [f.id]: Number(v) }))} />
                ))}
              </div>
            </section>
            <section aria-labelledby="imp-prev" className="flex flex-col gap-2">
              <h3 id="imp-prev" className="text-sm font-medium text-text-primary">Preview (first 5 rows)</h3>
              <div className="overflow-auto rounded-md border border-border">
                <table className="w-full min-w-[560px] text-left text-compact" data-import-preview>
                  <thead className="bg-surface-subtle text-xs font-medium text-text-secondary"><tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Company</th><th className="px-3 py-2">Status</th></tr></thead>
                  <tbody>{results.slice(0, 5).map((r) => <tr key={r.row} className="border-t border-border"><td className="px-3 py-2 text-text-secondary">{r.row}</td><td className="px-3 py-2">{r.cells.name || '—'}</td><td className="px-3 py-2">{r.cells.email || '—'}</td><td className="px-3 py-2">{r.cells.company || '—'}</td><td className="px-3 py-2">{r.cells.status || 'New'}</td></tr>)}</tbody>
                </table>
              </div>
            </section>
            <section aria-labelledby="imp-sum" className="flex flex-col gap-2">
              <h3 id="imp-sum" className="text-sm font-medium text-text-primary">Summary</h3>
              <p role="status" className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm" data-import-summary>
                <span className="flex items-center gap-1.5 font-medium text-success-strong"><CircleCheck aria-hidden className="size-5" strokeWidth={1.75} />{valid.length} valid</span>
                <span className={cn('flex items-center gap-1.5 font-medium', invalid.length ? 'text-danger-strong' : 'text-text-secondary')}><CircleAlert aria-hidden className="size-5" strokeWidth={1.75} />{invalid.length} with errors</span>
              </p>
              {invalid.length > 0 && (
                <ul className="flex max-h-40 flex-col gap-1 overflow-auto rounded-md border border-border bg-surface-subtle p-3 text-compact" aria-label="Rows with errors" data-import-errors>
                  {invalid.map((r) => <li key={r.row}><span className="font-medium text-text-primary">Row {r.row}:</span> <span className="text-danger-strong">{r.errors.join(' ')}</span></li>)}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </Modal>
  )
}

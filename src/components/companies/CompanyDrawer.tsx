import { Building2, Handshake, StickyNote, Users, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { formatShort, shortRelative } from '../../lib/dates'
import { money } from '../../lib/dealsLogic'
import { preview } from '../../lib/noteText'
import { recordPath } from '../../lib/recordPath'
import type { Company } from '../../services/companies'
import { IconButton } from '../ui/IconButton'
import { StatusPill } from '../ui/StatusPill'

// Company detail panel (opens at /companies/:id). Read-only: every item links to the page where it is edited.
const ITEM = 'flex min-h-12 items-center gap-3 rounded-md px-3 py-2 outline-none transition-colors duration-hover ease-out motion-reduce:transition-none hover:bg-surface-subtle focus-ring'

function Section({ icon: Icon, title, count, empty, children }: { icon: typeof Users; title: string; count: number; empty: string; children: ReactNode }) {
  return (
    <section aria-label={`${title} (${count})`} className="flex flex-col gap-1">
      <h3 className="flex items-center gap-2 px-3 text-xs font-medium text-text-secondary"><Icon aria-hidden className="size-4" strokeWidth={1.75} />{title}<span className="tabular-nums">{count}</span></h3>
      {count === 0 ? <p className="px-3 py-2 text-compact text-text-muted">{empty}</p> : <ul className="flex flex-col">{children}</ul>}
    </section>
  )
}

export function CompanyDrawerBody({ company, onClose }: { company: Company; onClose: () => void }) {
  const stats = [
    { label: 'Contacts', value: String(company.contacts.length) },
    { label: 'Deals', value: String(company.deals.length) },
    { label: 'Open pipeline', value: money(company.openValue) },
    { label: 'Last activity', value: company.lastActivity ? shortRelative(company.lastActivity) : '—' },
  ]
  return (
    <>
      <header className="flex shrink-0 flex-col gap-4 border-b border-border px-6 pb-4 pt-5 max-lg:px-4">
        <div className="flex items-start gap-3">
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><Building2 className="size-5" strokeWidth={1.75} /></span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-medium leading-6">{company.name}</h2>
            <p className="text-compact text-text-secondary">{company.openDeals} open {company.openDeals === 1 ? 'deal' : 'deals'}</p>
          </div>
          <IconButton icon={X} label="Close company details" size="sm" onClick={onClose} />
        </div>
        <dl className="grid grid-cols-4 gap-3 max-sm:grid-cols-2">
          {stats.map((s) => <div key={s.label} className="flex flex-col"><dt className="text-xs text-text-secondary">{s.label}</dt><dd className="text-sm font-medium tabular-nums">{s.value}</dd></div>)}
        </dl>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3 py-4 max-lg:px-1">
        <Section icon={Users} title="Contacts" count={company.contacts.length} empty="No contacts at this company yet.">
          {company.contacts.map((c) => (
            <li key={c.id}><Link to={recordPath({ type: 'contact', id: c.id }) ?? '/contacts'} className={ITEM}>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{c.name}</span><span className="block truncate text-xs text-text-secondary">{c.jobTitle || c.email}</span></span>
              <span className="shrink-0 text-xs text-text-muted">{c.status}</span>
            </Link></li>
          ))}
        </Section>
        <Section icon={Handshake} title="Deals" count={company.deals.length} empty="No deals with this company yet.">
          {company.deals.map((d) => (
            <li key={d.id}><Link to={`/deals/${d.id}`} className={ITEM}>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{d.title}</span><span className="block truncate text-xs text-text-secondary">Closes {formatShort(d.closeDate)}</span></span>
              <StatusPill stage={d.stage} />
              <span className="w-20 shrink-0 text-right text-sm font-medium tabular-nums">{money(d.value)}</span>
            </Link></li>
          ))}
        </Section>
        <Section icon={StickyNote} title="Notes" count={company.notes.length} empty="No notes are linked to this company, its contacts or its deals.">
          {company.notes.map((n) => (
            <li key={n.id}><Link to={`/notes/${n.id}`} className={ITEM}>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{n.title || 'Untitled note'}</span><span className="block truncate text-xs text-text-secondary">{preview(n.body)}</span></span>
              <span className="shrink-0 text-xs text-text-muted">{shortRelative(n.updatedAt)}</span>
            </Link></li>
          ))}
        </Section>
      </div>
    </>
  )
}

import { Building2, SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useMatch, useNavigate, useSearchParams } from 'react-router'
import { cn } from '../../lib/cn'
import { shortRelative } from '../../lib/dates'
import { money } from '../../lib/dealsLogic'
import { motion, prefersReducedMotion } from '../../lib/motion'
import { useCompanies } from '../../lib/useCompanies'
import type { Company } from '../../services/companies'
import { Button } from '../ui/Button'
import { Drawer } from '../ui/Drawer'
import { EmptyState } from '../ui/EmptyState'
import { Highlight } from '../ui/Highlight'
import { SearchInput } from '../ui/SearchInput'
import { Select } from '../ui/Select'
import { SkeletonLine } from '../ui/Skeleton'
import { CompanyDrawerBody } from './CompanyDrawer'

// Companies (/companies): one row per distinct company name found on the contacts and deals this person may read.
// /companies/:id opens the company in a side panel with its contacts, deals and linked notes.
type SortId = 'name-asc' | 'name-desc' | 'value-desc' | 'deals-desc'
const SORTS: { value: SortId; label: string }[] = [
  { value: 'name-asc', label: 'Name (A to Z)' },
  { value: 'name-desc', label: 'Name (Z to A)' },
  { value: 'value-desc', label: 'Open value (high to low)' },
  { value: 'deals-desc', label: 'Deals (most first)' },
]
const COMPARE: Record<SortId, (a: Company, b: Company) => number> = {
  'name-asc': (a, b) => a.name.localeCompare(b.name),
  'name-desc': (a, b) => b.name.localeCompare(a.name),
  'value-desc': (a, b) => b.openValue - a.openValue || a.name.localeCompare(b.name),
  'deals-desc': (a, b) => b.deals.length - a.deals.length || a.name.localeCompare(b.name),
}

const matchesCompany = (c: Company, query: string): boolean => {
  const q = query.trim().toLowerCase()
  return !q || c.name.toLowerCase().includes(q) || c.contacts.some((x) => x.name.toLowerCase().includes(q)) || c.deals.some((d) => d.title.toLowerCase().includes(q))
}

const TH = 'px-3 text-left text-xs font-medium text-text-secondary'

export function CompaniesPage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const errorFlag = params.get('error') === '1'
  const openId = useMatch('/companies/:id')?.params.id ?? null
  const { data, status, error, reload: reloadList } = useCompanies(prefersReducedMotion() ? 0 : motion.skeleton, errorFlag)
  const reload = () => { setParams((p) => { p.delete('error'); return p }, { replace: true }); reloadList() }
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortId>('name-asc')
  const rows = useMemo(() => (data ?? []).filter((c) => matchesCompany(c, query)).sort(COMPARE[sort]), [data, query, sort])
  // The panel keeps showing the company it was opened for while it slides out.
  const [shownId, setShownId] = useState(openId)
  if (openId && openId !== shownId) setShownId(openId)
  const shown = shownId && data ? data.find((c) => c.id === shownId) : undefined
  const close = () => navigate('/companies')

  if (status === 'error' && !data) {
    return (
      <div className="grid flex-1 place-items-center rounded-lg border border-border bg-surface shadow-card">
        <EmptyState icon={Building2} tone="danger" title="We couldn’t load the companies" description={error ?? 'Something went wrong while loading.'} action={<Button variant="primary" onClick={reload}>Retry</Button>} />
      </div>
    )
  }
  const loading = status === 'loading' && !data
  const total = data?.length ?? 0

  return (
    <div className="flex flex-1 flex-col gap-4 animate-fade-in">
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput label="Search companies" placeholder="Search companies, contacts, deals" value={query} onChange={setQuery} className="w-80 max-sm:w-full" />
        <Select label="Sort by" hideLabel className="w-56" value={sort} options={SORTS} onChange={setSort} />
        <p role="status" aria-live="polite" className="ml-auto text-compact text-text-secondary">{loading ? 'Loading companies…' : `${rows.length} of ${total} ${total === 1 ? 'company' : 'companies'}`}</p>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card" aria-busy={loading}>
        {loading ? (
          <div role="status" aria-label="Loading companies" className="flex flex-col gap-4 p-4">
            {Array.from({ length: 8 }, (_, i) => <div key={i} className="flex items-center gap-6"><SkeletonLine className="h-4 w-56" /><SkeletonLine className="ml-auto w-16" /><SkeletonLine className="w-16" /><SkeletonLine className="w-24" /><SkeletonLine className="w-20" /></div>)}
          </div>
        ) : total === 0 ? (
          <EmptyState icon={Building2} title="No companies yet" description="Companies appear here as soon as a contact or a deal has a company name." action={<Button variant="primary" onClick={() => navigate('/contacts')}>Go to Contacts</Button>} />
        ) : rows.length === 0 ? (
          <EmptyState icon={SearchX} title="No companies match" description={`Nothing matches “${query.trim()}”. Check the spelling or try a broader term.`} action={<Button onClick={() => setQuery('')}>Clear search</Button>} />
        ) : (
          <table className="w-full table-fixed border-collapse">
            <caption className="sr-only">Companies</caption>
            <thead>
              <tr className="h-10 bg-surface-subtle shadow-[inset_0_-1px_0_var(--color-border)]">
                <th scope="col" className={cn(TH, 'pl-4')}>Company</th>
                <th scope="col" className={cn(TH, 'w-24 text-right max-lg:hidden')}>Contacts</th>
                <th scope="col" className={cn(TH, 'w-20 text-right')}>Deals</th>
                <th scope="col" className={cn(TH, 'w-36 text-right')}>Open pipeline</th>
                <th scope="col" className={cn(TH, 'w-36 pr-4 max-lg:hidden')}>Last activity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} data-company-id={c.id} onClick={() => navigate(`/companies/${c.id}`)} className={cn('h-14 cursor-pointer border-b border-border transition-colors duration-hover ease-out last:border-b-0 motion-reduce:transition-none hover:bg-surface-subtle', openId === c.id && 'bg-primary-soft')}>
                  <th scope="row" className="pl-4 text-left font-normal">
                    <Link to={`/companies/${c.id}`} onClick={(e) => e.stopPropagation()} className="flex max-w-full items-center gap-2.5 rounded-sm text-sm font-medium outline-none focus-ring">
                      <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-md bg-primary-soft text-primary"><Building2 className="size-4" strokeWidth={1.75} /></span>
                      <span className="truncate"><Highlight text={c.name} query={query} /></span>
                    </Link>
                  </th>
                  <td className="px-3 text-right text-sm tabular-nums max-lg:hidden">{c.contacts.length}</td>
                  <td className="px-3 text-right text-sm tabular-nums">{c.deals.length}</td>
                  <td className="px-3 text-right text-sm font-medium tabular-nums">{c.openValue ? money(c.openValue) : <span className="font-normal text-text-muted">{c.deals.length ? '$0' : '—'}</span>}</td>
                  <td className="px-3 pr-4 text-compact text-text-secondary max-lg:hidden">{c.lastActivity ? shortRelative(c.lastActivity) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Drawer open={Boolean(openId)} onClose={close} title={shown ? `Company details: ${shown.name}` : 'Company details'} returnFocus={() => document.querySelector<HTMLElement>(`[data-company-id="${shownId}"] a`)}>
        {!data ? (
          <div role="status" aria-busy="true" aria-label="Loading company" className="flex flex-col gap-3 p-6"><SkeletonLine className="h-6 w-56" /><SkeletonLine className="h-40 w-full" /></div>
        ) : shown ? <CompanyDrawerBody company={shown} onClose={close} /> : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <h2 className="text-base font-medium">We couldn’t find that company</h2>
            <p className="max-w-72 text-sm leading-4.25 text-text-secondary">No company matches “{shownId}”. It may have no contacts or deals left, or the link is wrong.</p>
            <Button variant="primary" onClick={close}>Back to companies</Button>
          </div>
        )}
      </Drawer>
    </div>
  )
}

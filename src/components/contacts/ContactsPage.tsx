import { Download, Plus, Upload, UserRound, TriangleAlert, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useMatch, useNavigate, useSearchParams } from 'react-router'
import { useDeals } from '../../context/dealsContext'
import { useToast } from '../../context/toastContext'
import { downloadText } from '../../lib/csv'
import { CONTACT_URL_KEYS, contactFiltersFromParams, emptyContactFilters, hasContactFilters } from '../../lib/contactsLogic'
import { motion, prefersReducedMotion } from '../../lib/motion'
import { useContact, useContacts } from '../../lib/useContacts'
import { contactsService } from '../../services/contacts'
import { loadContactPrefs, saveContactPrefs } from '../../services/contactPrefs'
import { AnimatedNumber } from '../ui/AnimatedNumber'
import { Button } from '../ui/Button'
import { Drawer } from '../ui/Drawer'
import { EmptyState } from '../ui/EmptyState'
import { Menu } from '../ui/Menu'
import { Pagination } from '../ui/Pagination'
import { Select } from '../ui/Select'
import { SkeletonLine } from '../ui/Skeleton'
import { AddContactModal } from './AddContactModal'
import { ContactBulkBar } from './ContactBulkBar'
import { ContactDrawerBody, ContactDrawerSkeleton } from './ContactDrawer'
import { ContactsTable } from './ContactsTable'
import { ContactsToolbar } from './ContactsToolbar'
import { ImportModal } from './ImportModal'
import type { Contact, ContactColumn, ContactDensity, ContactFilters, ContactQuery, ContactSort, ContactSortKey, LeadStatus, SavedContactView } from '../../types'

// Contacts page: saved views, filters, sortable paged table, bulk actions, detail drawer at /contacts/:id, CSV import / export.
const PAGE_SIZES = [{ value: '25', label: '25' }, { value: '50', label: '50' }, { value: '100', label: '100' }]

export function ContactsPage({ headerSlot }: { headerSlot: HTMLElement | null }) {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const { currentUserId } = useDeals()
  const [params, setParams] = useSearchParams()
  const errorFlag = params.get('error') === '1'
  const match = useMatch('/contacts/:id')
  const openId = match?.params.id ?? null

  const [prefs] = useState(loadContactPrefs)
  const [urlFilters] = useState(() => contactFiltersFromParams(params))
  const [filters, setFilters] = useState<ContactFilters>(() => urlFilters ?? prefs.filters)
  const [sort, setSort] = useState<ContactSort | null>(prefs.sort)
  const [density, setDensity] = useState<ContactDensity>(prefs.density)
  const [hidden, setHidden] = useState<ContactColumn[]>(prefs.hiddenColumns)
  const [pageNo, setPageNo] = useState(() => (urlFilters ? 1 : prefs.page))
  const [pageSize, setPageSize] = useState(prefs.pageSize)
  const [savedViews, setSavedViews] = useState<SavedContactView[]>(prefs.savedViews)
  const [activeId, setActiveId] = useState<string | null>(prefs.selectedId)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [announcement, setAnnouncement] = useState('')
  const [addKey, setAddKey] = useState(0)
  const [adding, setAdding] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importKey, setImportKey] = useState(0)
  const [shownId, setShownId] = useState<string | null>(openId)
  if (openId && openId !== shownId) setShownId(openId)
  const lastClicked = useRef<number | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Links from Reports (?source=Website&createdFrom=2025-10-01&createdTo=2025-10-20) open the table with those filters; the address is tidied right after.
  useEffect(() => { if (urlFilters) setParams((p) => { CONTACT_URL_KEYS.forEach((k) => p.delete(k)); return p }, { replace: true }) }, [setParams, urlFilters])

  const query = useMemo<ContactQuery>(() => ({ filters, sort, page: pageNo, pageSize }), [filters, sort, pageNo, pageSize])
  const data = useContacts(query, { minLoadMs: prefersReducedMotion() ? 0 : motion.skeleton, simulateError: errorFlag })
  const page = data.page
  const rows = useMemo(() => page?.items ?? [], [page])
  const matchingIds = useMemo(() => page?.matchingIds ?? [], [page])
  const total = page?.total ?? 0
  const totalAll = page?.totalAll ?? 0
  const shownPage = page?.page ?? pageNo
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const loading = data.status === 'loading'
  const filtersOn = hasContactFilters(filters)

  useEffect(() => { saveContactPrefs({ filters, sort, density, hiddenColumns: hidden, page: pageNo, pageSize, savedViews }) }, [filters, sort, density, hidden, pageNo, pageSize, savedViews])
  useEffect(() => { if (openId) saveContactPrefs({ selectedId: openId }) }, [openId])
  const announce = useCallback((msg: string) => setAnnouncement((p) => (p === msg ? `${msg}​` : msg)), [])

  // Selection only keeps ids that still match.
  const chosen = useMemo(() => { const m = new Set(matchingIds); return new Set([...selected].filter((id) => m.has(id))) }, [selected, matchingIds])
  const pageAllSelected = rows.length > 0 && rows.every((r) => chosen.has(r.id))
  const allMatchingSelected = total > 0 && chosen.size === total
  const announcedResults = useRef<number | null>(null)
  useEffect(() => {
    if (!page || data.fetching) return
    if (announcedResults.current !== null && announcedResults.current !== page.total) announce(`${page.total} ${page.total === 1 ? 'contact matches' : 'contacts match'}.`)
    announcedResults.current = page.total
  }, [page, data.fetching, announce])

  // ---- query changes always go back to page 1
  const patchFilters = (patch: Partial<ContactFilters>) => { setFilters((f) => ({ ...f, ...patch })); setPageNo(1) }
  const clearFilters = () => { setFilters(emptyContactFilters); setPageNo(1) }
  const applyView = (f: ContactFilters, s: ContactSort | null) => { setFilters(f); setSort(s); setPageNo(1) }
  const cycleSort = (key: ContactSortKey) => {
    const next: ContactSort | null = sort?.key !== key ? { key, dir: 'asc' } : sort.dir === 'asc' ? { key, dir: 'desc' } : null
    setSort(next); setPageNo(1)
    announce(next ? `Sorted by ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}, ${next.dir === 'asc' ? 'ascending' : 'descending'}.` : 'Sorting cleared.')
  }

  // ---- selection
  const onToggle = (id: string, on: boolean, range: boolean) => {
    const i = rows.findIndex((r) => r.id === id)
    setSelected((s) => {
      const n = new Set(s)
      if (range && lastClicked.current !== null && rows[lastClicked.current]) {
        const [a, b] = [Math.min(lastClicked.current, i), Math.max(lastClicked.current, i)]
        for (const r of rows.slice(a, b + 1)) { if (on) n.add(r.id); else n.delete(r.id) }
      } else if (on) n.add(id); else n.delete(id)
      announce(`${[...n].filter((x) => matchingIds.includes(x)).length} selected.`)
      return n
    })
    lastClicked.current = i
  }
  const onToggleAll = (on: boolean) => setSelected((s) => { const n = new Set(s); rows.forEach((r) => { if (on) n.add(r.id); else n.delete(r.id) }); announce(`${[...n].length} selected.`); return n })
  const selectAllMatching = () => { setSelected(new Set(matchingIds)); announce(`All ${total} matching contacts selected.`) }
  const clearSelection = () => { setSelected(new Set()); announce('Selection cleared.') }

  // ---- drawer
  const openContact = useCallback((id: string) => { setActiveId(id); navigate(`/contacts/${id}${location.search}`) }, [navigate, location.search])
  const goContact = useCallback((id: string) => { setActiveId(id); navigate(`/contacts/${id}${location.search}`, { replace: true }) }, [navigate, location.search])
  const closeContact = useCallback(() => navigate(`/contacts${location.search}`), [navigate, location.search])
  const { contact: shownContact } = useContact(shownId)
  const returnFocus = () => document.querySelector<HTMLElement>(`[data-contact-id="${shownId}"]`) ?? document.querySelector<HTMLElement>('[data-contacts-fallback]')

  // ---- bulk actions (each can be undone from its toast)
  const undoable = (title: string, previous: Contact[], message?: string) => {
    toast({ type: 'success', title, message, action: { label: 'Undo', onClick: () => { void contactsService.bulkRestoreValues(previous).then(() => announce('Change undone.')) } } })
    announce(`${title}. Undo is available.`)
  }
  const bulk = async (ids: string[], patch: Parameters<typeof contactsService.bulkUpdate>[1], title: string) => {
    const out = await contactsService.bulkUpdate(ids, patch)
    undoable(title, out.previous)
  }
  const ids = [...chosen]
  const plural = (n: number) => `${n} contact${n === 1 ? '' : 's'}`
  const onStatus = (s: LeadStatus) => { void bulk(ids, { status: s }, `Changed status of ${plural(ids.length)} to ${s}`) }
  const onOwner = (ownerId: string) => { void bulk(ids, { ownerId }, `Assigned ${plural(ids.length)}`) }
  const onTag = (tag: string) => { void bulk(ids, (c) => ({ tags: [...new Set([...c.tags, tag])] }), `Added tag “${tag}” to ${plural(ids.length)}`) }
  const exportSelected = async () => {
    downloadText('contacts-selected.csv', await contactsService.export({ ids }))
    toast({ type: 'success', title: `Exported ${plural(ids.length)}`, message: 'contacts-selected.csv is ready.' })
    announce(`Exported ${plural(ids.length)}.`)
  }
  const deleteSelected = async () => {
    const del = ids
    await contactsService.delete(del)
    setSelected(new Set())
    if (openId && del.includes(openId)) closeContact()
    toast({ type: 'info', title: `Deleted ${plural(del.length)}`, action: { label: 'Undo', onClick: () => { void contactsService.restore(del).then(() => announce(`Restored ${plural(del.length)}.`)) } } })
    announce(`Deleted ${plural(del.length)}. Undo is available.`)
  }
  const exportAll = async (current: boolean) => {
    const csv = await contactsService.export({ query: { filters: current ? filters : emptyContactFilters, sort: null, page: 1, pageSize: 1 } })
    downloadText(current ? 'contacts-filtered.csv' : 'contacts.csv', csv)
    toast({ type: 'success', title: 'Export ready', message: `${current ? 'contacts-filtered.csv' : 'contacts.csv'} has ${current ? total : totalAll} contacts.` })
  }

  // ---- keyboard: "/" focuses search, Escape clears the selection from the table
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const typing = Boolean(t && (t.matches('input, textarea, select') || t.isContentEditable))
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey && !openId) { e.preventDefault(); searchRef.current?.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openId])

  const from = total === 0 ? 0 : (shownPage - 1) * pageSize + 1
  const to = Math.min(total, shownPage * pageSize)
  const currentPageAriaLive = `Showing ${from}-${to} of ${total}`

  const headerBar = (
    <>
      <div className="flex min-w-0 items-baseline gap-2">
        {loading ? <SkeletonLine className="h-5 w-40" /> : data.status === 'error' ? <span className="text-sm text-text-secondary">Contacts unavailable</span> : (
          <>
            <span className="text-amount font-medium leading-6.5"><AnimatedNumber value={totalAll} /></span>
            <span className="truncate text-sm text-text-secondary">{totalAll === 1 ? 'contact' : 'contacts'}{filtersOn ? ` · ${total} match` : ''}</span>
          </>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Button icon={Upload} onClick={() => { setImportKey((k) => k + 1); setImporting(true) }}>Import CSV</Button>
        <Menu
          align="end"
          label="Export contacts"
          items={[
            { id: 'all', label: `Export all contacts (${totalAll})`, icon: Download, onSelect: () => { void exportAll(false) } },
            { id: 'filtered', label: `Export current results (${total})`, icon: Download, onSelect: () => { void exportAll(true) } },
            { id: 'selected', label: `Export selected (${chosen.size})`, icon: Download, disabled: chosen.size === 0, onSelect: () => { void exportSelected() } },
          ]}
          trigger={({ props }) => <Button chevron icon={Download} menuProps={props}>Export</Button>}
        />
        <Button variant="primary" icon={Plus} onClick={() => { setAddKey((k) => k + 1); setAdding(true) }}>Add contact</Button>
      </div>
    </>
  )

  let body
  if (data.status === 'error') body = (
    <div className="grid h-full place-items-center rounded-lg border border-border bg-surface" data-contacts-fallback tabIndex={-1}>
      <EmptyState tone="danger" icon={TriangleAlert} title="We could not load your contacts" description="Check your connection and try again." action={<Button onClick={() => { navigate('/contacts', { replace: true }); data.reload() }}>Retry</Button>} />
    </div>
  )
  else if (!loading && totalAll === 0) body = (
    <div className="grid h-full place-items-center rounded-lg border border-border bg-surface" data-contacts-fallback tabIndex={-1}>
      <EmptyState icon={Users} title="No contacts yet" description="No contacts yet. Add your first contact or import a CSV." action={<div className="flex gap-2"><Button variant="primary" icon={Plus} onClick={() => { setAddKey((k) => k + 1); setAdding(true) }}>Add contact</Button><Button icon={Upload} onClick={() => { setImportKey((k) => k + 1); setImporting(true) }}>Import CSV</Button></div>} />
    </div>
  )
  else body = (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-card">
      {chosen.size > 0 && (
        <ContactBulkBar count={chosen.size} allTags={page?.allTags ?? []} onClear={clearSelection} onStatus={onStatus} onOwner={onOwner} onTag={onTag} onExport={() => { void exportSelected() }} onDelete={() => { void deleteSelected() }} />
      )}
      {!loading && pageAllSelected && total > rows.length && (
        <div role="status" className="flex shrink-0 items-center justify-center gap-3 border-b border-border bg-primary-soft px-4 py-2 text-sm" data-select-banner>
          {allMatchingSelected ? <span>All {total} matching contacts are selected.</span> : <span>All {rows.length} contacts on this page are selected.</span>}
          {allMatchingSelected ? <button type="button" onClick={clearSelection} className="rounded-xs font-medium text-primary underline underline-offset-2 outline-none focus-ring">Clear selection</button> : <button type="button" onClick={selectAllMatching} className="rounded-xs font-medium text-primary underline underline-offset-2 outline-none focus-ring">Select all {total} matching</button>}
        </div>
      )}
      <div className={`min-h-0 flex-1 overflow-auto pb-18 ${data.fetching && !loading ? 'opacity-70' : ''}`} role="region" aria-label="Contacts table" data-contacts-fallback tabIndex={-1} data-table-scroll>
        {!loading && total === 0 ? (
          <EmptyState icon={UserRound} title="No contacts match" description="Try a different search or clear your filters." action={<Button variant="primary" onClick={clearFilters}>Clear filters</Button>} className="py-16" />
        ) : (
          <ContactsTable
            rows={rows}
            loading={loading}
            skeletonRows={Math.min(pageSize, 12)}
            hidden={hidden}
            density={density}
            sort={sort}
            onSort={cycleSort}
            selected={chosen}
            onToggle={onToggle}
            onToggleAll={onToggleAll}
            activeId={activeId}
            onActive={setActiveId}
            openId={openId}
            onOpen={openContact}
          />
        )}
      </div>
      <footer className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-2 border-t border-border px-4 py-2.5">
        <p className="text-sm text-text-secondary" data-showing aria-label={currentPageAriaLive}>Showing {from}-{to} of {total}</p>
        <span className="flex-1" />
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <span>Rows per page</span>
          <Select label="Rows per page" hideLabel className="w-24" value={String(pageSize)} options={PAGE_SIZES} onChange={(v) => { setPageSize(Number(v)); setPageNo(1) }} />
        </div>
        <Pagination page={shownPage} pages={pages} onChange={(p) => { setPageNo(p); announce(`Page ${p} of ${pages}.`) }} label="Contacts pages" />
      </footer>
    </div>
  )

  const drawerBody = shownId === null ? null : shownContact === undefined ? <ContactDrawerSkeleton /> : shownContact === null ? (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h2 className="text-base font-medium">We couldn’t find that contact</h2>
      <p className="max-w-72 text-sm leading-4.25 text-text-secondary">No contact matches “{shownId}”. It may have been removed, or the link is wrong.</p>
      <Button variant="primary" onClick={closeContact}>Back to contacts</Button>
    </div>
  ) : shownContact.deletedAt ? (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <h2 className="text-base font-medium">This contact was deleted</h2>
      <p className="max-w-72 text-sm leading-4.25 text-text-secondary">{shownContact.name} is in the trash. You can bring them back.</p>
      <div className="flex gap-2"><Button onClick={closeContact}>Close</Button><Button variant="primary" onClick={() => { void contactsService.restore([shownContact.id]) }}>Restore contact</Button></div>
    </div>
  ) : <ContactDrawerBody key={shownContact.id} contact={shownContact} ids={matchingIds} onGo={goContact} onClose={closeContact} />

  return (
    <>
      {headerSlot && createPortal(headerBar, headerSlot)}
      <ContactsToolbar
        filters={filters}
        sort={sort}
        savedViews={savedViews}
        allTags={page?.allTags ?? []}
        hidden={hidden}
        density={density}
        currentUserId={currentUserId}
        searchRef={searchRef}
        onFilters={patchFilters}
        onApplyView={applyView}
        onClear={clearFilters}
        onSaveView={(name) => { setSavedViews((v) => [...v, { id: `v-${Date.now().toString(36)}`, name, filters, sort }]); announce(`Saved view ${name}.`) }}
        onDeleteView={(id) => setSavedViews((v) => v.filter((x) => x.id !== id))}
        onToggleColumn={(c) => setHidden((h) => (h.includes(c) ? h.filter((x) => x !== c) : [...h, c]))}
        onDensity={setDensity}
      />
      <div className="min-h-0 flex-1">{body}</div>
      <div role="status" aria-live="polite" className="sr-only" data-contacts-announcer>{announcement}</div>

      <Drawer open={Boolean(openId)} onClose={closeContact} title={shownContact ? `Contact details: ${shownContact.name}` : 'Contact details'} returnFocus={returnFocus}>
        {drawerBody}
      </Drawer>
      <AddContactModal
        key={`add-${addKey}`}
        open={adding}
        onClose={() => setAdding(false)}
        onOpenExisting={(id) => { setAdding(false); openContact(id) }}
        onCreated={(c) => {
          setAdding(false)
          toast({ type: 'success', title: 'Contact added', message: `${c.name} is in your contacts.`, action: { label: 'Undo', onClick: () => { void contactsService.delete([c.id]) } } })
          announce(`${c.name} added.`)
        }}
      />
      <ImportModal
        key={`import-${importKey}`}
        open={importing}
        onClose={() => setImporting(false)}
        onImported={(created, skipped) => {
          setImporting(false)
          toast({ type: 'success', title: `Imported ${plural(created.length)}`, message: skipped ? `${skipped} skipped as duplicates.` : undefined, action: { label: 'Undo', onClick: () => { void contactsService.delete(created.map((c) => c.id)) } } })
          announce(`Imported ${plural(created.length)}.`)
        }}
      />
    </>
  )
}

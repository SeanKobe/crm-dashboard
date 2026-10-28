import { FileText, TriangleAlert } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMatch, useNavigate, useSearchParams } from 'react-router'
import { noteTemplates, type TemplateId } from '../../lib/noteText'
import { defaultNoteFilters, loadNotePrefs, saveNotePrefs } from '../../services/notePrefs'
import { configureNotesService, notesService } from '../../services/notes'
import { useRecords } from '../../context/recordsContext'
import { useToast } from '../../context/toastContext'
import { filterNotes, groupNotes, sortNotes } from '../../lib/notesLogic'
import { motion, prefersReducedMotion } from '../../lib/motion'
import { cn } from '../../lib/cn'
import { isMod } from '../../lib/shortcuts'
import { useMediaQuery } from '../../lib/useMediaQuery'
import { useNotes } from '../../lib/useNotes'
import { useTick } from '../../lib/useTick'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { NoteListPane } from './NoteListPane'
import { NoteEditorSkeleton } from './NotesSkeleton'
import type { Note, NoteFilters, NoteSort } from '../../types'

// The rich-text editor (TipTap + ProseMirror) is its own chunk, fetched the first time a note is opened.
const NoteEditor = lazy(() => import('./NoteEditor').then((m) => ({ default: m.NoteEditor })))

// Notes page: list on the left (about 340px), editor on the right. Below 1024px it is one pane with a Back button.
// The selected note lives in the URL (/notes/:id); filters, sort, scroll position and the last selection persist.
export function NotesPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  const match = useMatch('/notes/:id')
  const routeId = match?.params.id ?? null
  const wide = useMediaQuery('(min-width: 1024px)')
  const errorFlag = params.get('error') === '1'
  const saveError = params.get('saveError') === '1'
  useTick()

  const [prefs] = useState(loadNotePrefs)
  const [filters, setFilters] = useState<NoteFilters>(prefs.filters)
  const [sort, setSort] = useState<NoteSort>(prefs.sort)
  const [announcement, setAnnouncement] = useState('')
  const data = useNotes({ minLoadMs: prefersReducedMotion() ? 0 : motion.skeleton, simulateError: errorFlag })
  const { notes, status } = data
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const paneRef = useRef<HTMLDivElement>(null)
  const [focusTitleId, setFocusTitleId] = useState<string | null>(null)
  const [lookup, setLookup] = useState<{ id: string; note: Note | null } | null>(null)

  useEffect(() => { if (saveError) configureNotesService({ failNextUpdates: 1 }) }, [saveError])
  useEffect(() => { saveNotePrefs({ filters, sort }) }, [filters, sort])
  useEffect(() => { if (routeId) saveNotePrefs({ selectedId: routeId }) }, [routeId])
  const announce = useCallback((msg: string) => setAnnouncement((p) => (p === msg ? `${msg}​` : msg)), [])

  const { resolve } = useRecords()
  const visible = useMemo(() => sortNotes(filterNotes(notes, filters, (n) => resolve(n.link)?.name ?? ''), sort), [notes, filters, sort, resolve])
  const groups = useMemo(() => groupNotes(visible, sort), [visible, sort])
  const allTags = useMemo(() => [...new Set(notes.flatMap((n) => n.tags))].sort(), [notes])

  // Wide screens open the last selected note when the URL has none (once, after the list has loaded).
  const restoredSelection = useRef(false)
  useEffect(() => {
    if (status !== 'ready' || restoredSelection.current) return
    restoredSelection.current = true
    if (!routeId && wide && prefs.selectedId && notes.some((n) => n.id === prefs.selectedId)) navigate(`/notes/${prefs.selectedId}${window.location.search}`, { replace: true })
  }, [status, routeId, wide, prefs.selectedId, notes, navigate])

  // A note that is not in the list (deleted, or a wrong id) is looked up so the pane can say what happened.
  const inList = routeId ? notes.find((n) => n.id === routeId) ?? null : null
  useEffect(() => {
    if (!routeId || status !== 'ready' || inList) return undefined
    let live = true
    notesService.get(routeId).then((n) => { if (live) setLookup({ id: routeId, note: n }) }).catch(() => { if (live) setLookup({ id: routeId, note: null }) })
    return () => { live = false }
  }, [routeId, status, inList])
  const missing = routeId && !inList && lookup?.id === routeId ? lookup.note ?? 'none' : null

  const open = useCallback((id: string, focusEditor = false) => {
    if (focusEditor) setFocusTitleId(id)
    navigate(`/notes/${id}${window.location.search}`)
  }, [navigate])
  // Focus the option for `id` (or the list's tabbable option, or search) as soon as it is on screen; panes can still be mounting or hidden.
  const focusOption = (id: string | null) => {
    let tries = 0
    const attempt = () => {
      const el = (id ? document.querySelector<HTMLElement>(`[data-note-id="${id}"]`) : null) ?? document.querySelector<HTMLElement>('[data-note-scroll] [role=option][tabindex="0"]')
      if (el && el.offsetParent !== null) { el.focus(); return }
      if (++tries < 30) requestAnimationFrame(attempt)
      else searchRef.current?.focus()
    }
    requestAnimationFrame(attempt)
  }

  const newNote = async (template: TemplateId) => {
    const t = noteTemplates.find((x) => x.id === template) ?? noteTemplates[0]
    setFilters(defaultNoteFilters)
    const n = await data.create({ title: t.title, body: t.body, tags: t.tags })
    setFocusTitleId(n.id)
    navigate(`/notes/${n.id}${window.location.search}`)
    announce(`New ${t.label.toLowerCase()} created.`)
  }
  const duplicate = async (note: Note) => {
    const n = await data.create({ title: `Copy of ${note.title || 'Untitled note'}`, body: note.body, tags: note.tags, link: note.link })
    setFocusTitleId(n.id)
    navigate(`/notes/${n.id}${window.location.search}`)
    announce('Note duplicated.')
  }
  const copyLink = async (note: Note) => {
    try { await navigator.clipboard.writeText(`${window.location.origin}/notes/${note.id}`) } catch { /* clipboard blocked: the toast still confirms the link */ }
    toast({ type: 'success', title: 'Link copied', message: 'Anyone with the link can open this note.' })
  }
  const deleteNote = async (note: Note) => {
    const i = visible.findIndex((n) => n.id === note.id)
    const next = visible[i + 1] ?? visible[i - 1] ?? null
    await data.remove(note.id)
    const wasOpen = routeId === note.id
    if (wasOpen) navigate(next && wide ? `/notes/${next.id}${window.location.search}` : `/notes${window.location.search}`, { replace: true })
    if (wasOpen || !wide) focusOption(next?.id ?? null)
    announce(`Deleted ${note.title || 'Untitled note'}. Undo is available.`)
    toast({
      type: 'info',
      title: `Deleted ${note.title || 'Untitled note'}`,
      action: { label: 'Undo', onClick: () => { void data.restore(note.id).then(() => { navigate(`/notes/${note.id}${window.location.search}`); announce(`Restored ${note.title || 'Untitled note'}.`) }) } },
    })
  }

  const backToList = () => { navigate(`/notes${window.location.search}`); focusOption(routeId) }
  const toListRef = useRef<() => void>(() => {})
  useEffect(() => { toListRef.current = () => focusOption(routeId ?? visible[0]?.id ?? null) })
  const escapeToList = useCallback(() => toListRef.current(), [])
  const newRef = useRef(newNote)
  useEffect(() => { newRef.current = newNote })

  // Keyboard: Cmd/Ctrl+N new note, Cmd/Ctrl+F or "/" focus search, Escape from the editor or search returns to the list.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const typing = Boolean(t && (t.matches('input, textarea, select') || t.isContentEditable))
      if (isMod(e) && e.key.toLowerCase() === 'n') { e.preventDefault(); void newRef.current('blank') }
      else if (isMod(e) && e.key.toLowerCase() === 'f') { e.preventDefault(); searchRef.current?.focus(); searchRef.current?.select() }
      else if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); searchRef.current?.focus() }
      else if (e.key === 'Escape' && t && t === searchRef.current && !filters.query) { e.preventDefault(); toListRef.current() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [filters.query])

  const patchFilters = (patch: Partial<NoteFilters>) => setFilters((f) => ({ ...f, ...patch }))
  const selected = inList
  let editorPane
  if (status === 'loading') editorPane = <NoteEditorSkeleton />
  else if (status === 'error') editorPane = null
  else if (selected) editorPane = <Suspense fallback={<NoteEditorSkeleton />}><NoteEditor key={selected.id} note={selected} autoFocusTitle={focusTitleId === selected.id} onSave={data.update} onBack={backToList} onDuplicate={duplicate} onCopyLink={copyLink} onDelete={deleteNote} onAnnounce={announce} onEscape={escapeToList} /></Suspense>
  else if (missing && missing !== 'none') editorPane = (
    <div className="grid h-full place-items-center"><EmptyState icon={FileText} title="This note was deleted" description={`“${missing.title || 'Untitled note'}” is in the trash. You can bring it back.`} action={<Button variant="primary" onClick={() => { void data.restore(missing.id).then(() => open(missing.id)) }}>Restore note</Button>} /></div>
  )
  else if (missing === 'none') editorPane = (
    <div className="grid h-full place-items-center"><EmptyState icon={FileText} title="We couldn’t find that note" description="It may have been removed, or the link is wrong." action={<Button variant="primary" onClick={backToList}>Back to notes</Button>} /></div>
  )
  else if (routeId) editorPane = <NoteEditorSkeleton />
  else editorPane = (
    <div className="grid h-full place-items-center"><EmptyState icon={FileText} title="Select a note to read it" description={notes.length ? 'Pick a note from the list, or press New note to start one.' : 'Your notes will open here.'} /></div>
  )

  if (status === 'error') {
    return (
      <div className="grid flex-1 place-items-center rounded-lg border border-border bg-surface" data-notes-error>
        <EmptyState tone="danger" icon={TriangleAlert} title="We could not load your notes" description="Check your connection and try again." action={<Button onClick={() => { navigate('/notes', { replace: true }); data.reload() }}>Retry</Button>} />
      </div>
    )
  }

  return (
    <div ref={paneRef} className="flex min-h-0 flex-1 gap-4" data-notes-page>
      <section aria-label="Notes list" className={cn('flex w-85 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-surface max-lg:w-full max-lg:flex-1', routeId && 'max-lg:hidden')}>
        <NoteListPane
          loading={status === 'loading'}
          total={notes.length}
          groups={groups}
          shown={visible.length}
          filters={filters}
          sort={sort}
          allTags={allTags}
          selectedId={routeId}
          searchRef={searchRef}
          listRef={listRef}
          initialScroll={prefs.scrollTop}
          onScroll={(top) => saveNotePrefs({ scrollTop: top })}
          onFilters={patchFilters}
          onClear={() => setFilters(defaultNoteFilters)}
          onSort={setSort}
          onOpen={open}
          onNew={(t) => { void newNote(t) }}
        />
      </section>
      <section aria-label="Note editor" className={cn('min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-surface', !routeId && 'max-lg:hidden')} data-deals-fallback tabIndex={-1}>
        {editorPane}
      </section>
      <div role="status" aria-live="polite" className="sr-only" data-notes-announcer>{announcement}</div>
    </div>
  )
}


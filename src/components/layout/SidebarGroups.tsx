import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { Archive, ArrowUpDown, Building2, ChevronDown, ChevronUp, CircleX, Ellipsis, Folder, Laptop, Pencil, Plus, Settings2, Trash2, User, UserPlus, X } from 'lucide-react'
import { favorites as favoriteSeed, favoriteSeeds, favoriteTypes } from '../../data/mock'
import { useToast } from '../../context/toastContext'
import { useProjects } from '../../lib/useProjects'
import { projectsService } from '../../services/projects'
import { loadProjectPrefs, saveProjectPrefs } from '../../services/projectPrefs'
import { cn } from '../../lib/cn'
import { favoriteCount, useCounts } from '../../lib/useCounts'
import type { Favorite, FavoriteType, IconComponent, MenuEntry, SidebarProjectSort } from '../../types'
import { Button } from '../ui/Button'
import { Collapse } from '../ui/Collapse'
import { FavoriteItem } from '../ui/FavoriteItem'
import { Menu, Popover } from '../ui/Menu'
import { Modal } from '../ui/Modal'

const TRIGGER = 'grid size-6 place-items-center rounded-md text-text-secondary outline-none transition-colors hover:bg-surface-muted aria-expanded:bg-surface-muted focus-visible:ring-[1.5px] focus-visible:ring-primary motion-reduce:transition-none'
const SMALL = 'grid size-6 shrink-0 place-items-center rounded-md text-text-muted outline-none transition-colors hover:bg-surface-muted hover:text-text-primary focus-visible:ring-[1.5px] focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-40'
const TYPE_ICON: Record<FavoriteType, IconComponent> = { Company: Building2, Contact: User, Meeting: Laptop }
// Add-menu icons (the rows themselves keep TYPE_ICON).
const ADD_ICON: Record<FavoriteType, IconComponent> = { Company: Building2, Contact: UserPlus, Meeting: Laptop }
let uid = 0

interface GroupHeaderProps {
  label: string
  open: boolean
  onToggle: () => void
  /** Shows the name input instead of the toggle button (Favorites "Rename group"). */
  renaming?: boolean
  onRename?: (name: string) => void
  /** The "..." and "+" buttons on the right. */
  children: ReactNode
}

function GroupHeader({ label, open, onToggle, renaming = false, onRename, children }: GroupHeaderProps) {
  const [draft, setDraft] = useState(label)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (renaming) {
      setDraft(label)
      inputRef.current?.focus()
      inputRef.current?.select()
    }
    // only when rename mode starts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renaming])
  const commit = (save: boolean) => onRename?.(save && draft.trim() ? draft.trim() : label)
  return (
    <div className="flex h-9 items-center gap-3 px-3 text-sm text-text-secondary">
      {renaming ? (
        <input
          ref={inputRef}
          value={draft}
          aria-label="Group name"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit(true)
            if (e.key === 'Escape') { e.stopPropagation(); commit(false) }
          }}
          className="h-7 min-w-0 flex-1 rounded-md border border-primary bg-surface px-2 text-sm text-text-primary outline-none ring-[3px] ring-focus-ring"
        />
      ) : (
        <button type="button" onClick={onToggle} aria-expanded={open} className="flex flex-1 items-center gap-3 rounded-md text-left outline-none transition-colors duration-hover ease-out hover:text-text-primary focus-ring">
          <ChevronDown className={cn('size-5 transition-transform duration-move ease-out motion-reduce:transition-none', open && 'rotate-180')} strokeWidth={1.75} />
          {label}
        </button>
      )}
      <div className="flex items-center gap-1">{children}</div>
    </div>
  )
}

const emptyHint = (text: string) => <p className="pl-9 pr-3 text-compact text-text-muted">{text}</p>

// ---------------- Favorites
const FAVORITE_PATH: Record<string, string> = { Companies: '/companies', Contacts: '/contacts', Meetings: '/meetings' }
export function FavoritesGroup() {
  const navigate = useNavigate()
  const counts = useCounts()
  const [open, setOpen] = useState(true)
  const [name, setName] = useState('Favorites')
  const [renaming, setRenaming] = useState(false)
  const [items, setItems] = useState<Favorite[]>(() => favoriteSeed.map((f) => ({ ...f })))
  const [showCounts, setShowCounts] = useState(true)
  const [reorder, setReorder] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const pick = useRef<Record<FavoriteType, number>>({ Company: 0, Contact: 0, Meeting: 0 })

  const add = (type: FavoriteType) => {
    const pool = favoriteSeeds[type]
    const n = pick.current[type]++
    const seed = pool[n % pool.length]
    const label = n >= pool.length ? `${seed.label} ${Math.floor(n / pool.length) + 1}` : seed.label
    setItems((list) => [...list, { id: `${type}-${++uid}`, label, icon: TYPE_ICON[type], count: seed.count, fresh: true }])
    setOpen(true)
  }
  const move = (i: number, dir: number) => setItems((list) => { const next = list.slice(); [next[i], next[i + dir]] = [next[i + dir], next[i]]; return next })

  const actions: MenuEntry[] = [
    { id: 'rename', label: 'Rename group', icon: Pencil, onSelect: () => setRenaming(true) },
    { id: 'reorder', label: 'Reorder', icon: ArrowUpDown, onSelect: () => { setReorder((r) => !r); setOpen(true) } },
    { id: 'counts', label: 'Show counts', toggle: showCounts, keepOpen: true, onSelect: () => setShowCounts((s) => !s) },
    { type: 'separator' },
    { id: 'remove', label: 'Remove all favorites', icon: Trash2, danger: true, disabled: items.length === 0, onSelect: () => setConfirmRemove(true) },
  ]
  const addMenu: MenuEntry[] = [{ type: 'label', label: 'Add favorite' }, ...favoriteTypes.map((t) => ({ id: t, label: `Add ${t.toLowerCase()}`, icon: ADD_ICON[t], onSelect: () => add(t) }))]

  return (
    <div className="flex flex-col gap-1">
      <GroupHeader label={name} open={open} onToggle={() => setOpen((o) => !o)} renaming={renaming} onRename={(v) => { setName(v); setRenaming(false) }}>
        <Menu align="end" label={`${name} options`} items={actions} trigger={({ props }) => <button {...props} type="button" aria-label={`${name} options`} className={TRIGGER}><Ellipsis className="size-5" strokeWidth={1.75} /></button>} />
        <Menu align="end" label="Add favorite" items={addMenu} trigger={({ props }) => <button {...props} type="button" aria-label={`Add to ${name}`} className={TRIGGER}><Plus className="size-5" strokeWidth={1.75} /></button>} />
      </GroupHeader>
      <Collapse open={open}>
      <div className="flex flex-col gap-1">
      {items.map((f, i) => (
        <FavoriteItem
          key={f.id}
          icon={f.icon}
          label={f.label}
          count={favoriteCount(f.label, f.count, counts)}
          showCount={showCounts}
          fresh={f.fresh}
          onClick={FAVORITE_PATH[f.label] ? () => navigate(FAVORITE_PATH[f.label]) : undefined}
          trailing={reorder && (
            <span className="flex">
              <button type="button" className={SMALL} disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${f.label} up`}><ChevronUp className="size-4" strokeWidth={1.75} /></button>
              <button type="button" className={SMALL} disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${f.label} down`}><ChevronDown className="size-4" strokeWidth={1.75} /></button>
            </span>
          )}
        />
      ))}
      {items.length === 0 && emptyHint('No favorites yet')}
      {reorder && (
        <button type="button" onClick={() => setReorder(false)} className="ml-9 w-fit rounded-md px-2 py-1 text-compact font-medium text-primary outline-none hover:bg-primary-soft focus-visible:ring-[1.5px] focus-visible:ring-primary">Done</button>
      )}
      </div>
      </Collapse>
      <Modal
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title="Remove all favorites?"
        footer={
          <>
            <Button onClick={() => setConfirmRemove(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { setConfirmRemove(false); setItems([]); setReorder(false) }}>Remove</Button>
          </>
        }
      >
        You can&apos;t undo this.
      </Modal>
    </div>
  )
}

// ---------------- Projects
const NAME_HELPER = 'Use a short, unique name (up to 40 characters).'

function CreateProject({ onCreate, names }: { onCreate: (label: string) => void; names: string[] }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [touched, setTouched] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const close = (restore: boolean = true) => { setOpen(false); setName(''); setTouched(false); if (restore) triggerRef.current?.focus({ preventScroll: true }) }
  const trimmed = name.trim()
  const error = trimmed && names.some((n) => n.toLowerCase() === trimmed.toLowerCase()) ? 'A project with this name already exists.' : touched && !trimmed ? 'Enter a project name.' : null
  const valid = Boolean(trimmed) && !error
  const submit = () => {
    if (!valid) { setTouched(true); return }
    onCreate(trimmed)
    close(true)
  }
  return (
    <>
      <button ref={triggerRef} type="button" aria-haspopup="dialog" aria-expanded={open} aria-label="Create project" onClick={() => setOpen((o) => !o)} className={TRIGGER}>
        <Plus className="size-5" strokeWidth={1.75} />
      </button>
      <Popover open={open} onClose={close} anchorRef={triggerRef} align="end" role="dialog" label="Create project">
        <PopoverForm name={name} setName={(v) => { setName(v); setTouched(true) }} error={error} valid={valid} onSubmit={submit} onCancel={() => close(true)} open={open} />
      </Popover>
    </>
  )
}

interface PopoverFormProps {
  name: string
  setName: (name: string) => void
  /** Empty or duplicate name message; null when the name is fine. */
  error: string | null
  valid: boolean
  onSubmit: () => void
  onCancel: () => void
  open: boolean
}

// Figma "Create Project Popover": title, labelled field with helper text and error state, Cancel and Create (disabled until valid).
function PopoverForm({ name, setName, error, valid, onSubmit, onCancel, open }: PopoverFormProps) {
  const ref = useRef<HTMLInputElement>(null)
  const id = useId()
  useEffect(() => {
    if (!open) return undefined
    const t = setTimeout(() => ref.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [open])
  return (
    <form onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); onSubmit() }} noValidate className="flex w-72 flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-hover">
      <h2 className="text-sm font-medium leading-4.25">Create project</h2>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-compact font-medium leading-4">Project name</label>
        <div className={cn('flex h-10 items-center gap-2 rounded-md border bg-surface px-3 transition-colors duration-hover ease-out motion-reduce:transition-none', error ? 'border-danger' : 'border-border hover:border-border-strong focus-within:border-primary focus-within:ring-[3px] focus-within:ring-focus-ring')}>
          <input
            ref={ref}
            id={id}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name your project"
            maxLength={40}
            aria-invalid={Boolean(error)}
            aria-describedby={`${id}-help`}
            className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
          />
          {error && <CircleX className="size-5 shrink-0 text-danger" strokeWidth={1.75} aria-hidden />}
        </div>
        <p id={`${id}-help`} className={cn('text-xs leading-3.75', error ? 'text-danger' : 'text-text-muted')}>{error ?? NAME_HELPER}</p>
      </div>
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="primary" state={valid ? 'default' : 'disabled'} onClick={onSubmit}>Create</Button>
      </div>
    </form>
  )
}

export function ProjectsGroup() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const toast = useToast()
  const { projects } = useProjects()
  const [open, setOpen] = useState(false)
  const [sort, setSort] = useState<SidebarProjectSort>(() => loadProjectPrefs().sidebarSort)
  const [showArchived, setShowArchived] = useState(() => loadProjectPrefs().sidebarShowArchived)
  const [manage, setManage] = useState(false)
  const [freshId, setFreshId] = useState<string | null>(null)

  const visible = projects
    .filter((p) => showArchived || !p.archivedAt)
    .sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : b.updatedAt.localeCompare(a.updatedAt)))
  const create = (name: string) => {
    projectsService.create({ name }).then((p) => {
      setFreshId(p.id)
      setOpen(true)
      toast({ type: 'success', title: 'Project created', message: p.name, action: { label: 'Open', onClick: () => navigate(`/projects/${p.id}`) } })
    }).catch((e: unknown) => toast({ type: 'error', title: 'Couldn’t create the project', message: e instanceof Error ? e.message : undefined }))
  }
  const pickSort = (next: SidebarProjectSort) => { setSort(next); saveProjectPrefs({ sidebarSort: next }) }
  const toggleArchived = () => { const next = !showArchived; setShowArchived(next); saveProjectPrefs({ sidebarShowArchived: next }); setOpen(true) }
  const removeProject = (id: string, name: string) => {
    projectsService.delete(id).then(() => toast({ type: 'info', title: `Deleted “${name}”`, action: { label: 'Undo', onClick: () => { void projectsService.restore(id) } } })).catch(() => undefined)
  }
  const toggleArchive = (id: string, archived: boolean) => { void (archived ? projectsService.unarchive(id) : projectsService.archive(id)) }

  const actions: MenuEntry[] = [
    { id: 'all', label: 'View all projects', icon: Folder, onSelect: () => navigate('/projects') },
    { type: 'separator' },
    { type: 'label', label: 'Sort' },
    { id: 'name', label: 'Sort by name', checked: sort === 'name', onSelect: () => pickSort('name') },
    { id: 'recent', label: 'Sort by recent', checked: sort === 'recent', onSelect: () => pickSort('recent') },
    { type: 'separator' },
    { id: 'archived', label: 'Show archived', toggle: showArchived, keepOpen: true, onSelect: toggleArchived },
    { id: 'manage', label: 'Manage projects', icon: Settings2, onSelect: () => { setManage((m) => !m); setOpen(true) } },
  ]
  return (
    <div className="flex flex-col gap-1">
      <GroupHeader label="Projects" open={open} onToggle={() => setOpen((o) => !o)}>
        <Menu align="end" label="Projects options" items={actions} trigger={({ props }) => <button {...props} type="button" aria-label="Projects options" className={TRIGGER}><Ellipsis className="size-5" strokeWidth={1.75} /></button>} />
        <CreateProject onCreate={create} names={projects.map((p) => p.name)} />
      </GroupHeader>
      <Collapse open={open}>
      <div className="flex flex-col gap-1" data-sidebar-projects>
      {visible.map((p) => (
        <div key={p.id} data-sidebar-project={p.id} className={cn('flex h-9 w-full items-center gap-3 rounded-md pl-9 pr-3 text-sm text-text-secondary transition-colors hover:bg-surface-subtle active:bg-surface-muted focus-within:ring-[1.5px] focus-within:ring-inset focus-within:ring-primary motion-reduce:transition-none', pathname === `/projects/${p.id}` && 'bg-primary-soft text-text-primary', p.id === freshId && 'animate-row-in motion-reduce:animate-none')}>
          <button type="button" aria-current={pathname === `/projects/${p.id}` ? 'page' : undefined} onClick={() => navigate(`/projects/${p.id}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none">
            <Folder className="size-5 shrink-0" strokeWidth={1.75} />
            <span className="flex-1 truncate">{p.name}</span>
          </button>
          {p.archivedAt && <span className="flex items-center gap-1 text-xs text-text-secondary"><Archive className="size-3.5" strokeWidth={1.75} />Archived</span>}
          {manage && (
            <span className="flex">
              <button type="button" className={SMALL} onClick={() => toggleArchive(p.id, Boolean(p.archivedAt))} aria-label={`${p.archivedAt ? 'Unarchive' : 'Archive'} ${p.name}`}><Archive className="size-4" strokeWidth={1.75} /></button>
              <button type="button" className={SMALL} onClick={() => removeProject(p.id, p.name)} aria-label={`Delete ${p.name}`}><X className="size-4" strokeWidth={1.75} /></button>
            </span>
          )}
        </div>
      ))}
      {visible.length === 0 && emptyHint('No projects yet')}
      </div>
      </Collapse>
    </div>
  )
}

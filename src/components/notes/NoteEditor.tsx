import Placeholder from '@tiptap/extension-placeholder'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import StarterKit from '@tiptap/starter-kit'
import { EditorContent, useEditor } from '@tiptap/react'
import { ArrowLeft, Copy, Ellipsis, Link2, Pin, PinOff, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAutosave } from '../../lib/useAutosave'
import { cn } from '../../lib/cn'
import { MOD } from '../../lib/shortcuts'
import { formatShort, shortRelative } from '../../lib/dates'
import { IconButton } from '../ui/IconButton'
import { Menu } from '../ui/Menu'
import { Tooltip } from '../ui/Tooltip'
import { EditorToolbar } from './EditorToolbar'
import { RecordPicker } from './RecordPicker'
import { TagInput } from './TagInput'
import type { Note, NoteLink, NotePatch } from '../../types'

// Right pane: title, pin, menu, save status, link + tags, formatting toolbar, body (TipTap with Markdown shortcuts) and footer.
// Keyed by note id by the page, so switching notes remounts it and the autosave hook flushes whatever is pending.
export interface NoteEditorProps {
  note: Note
  autoFocusTitle: boolean
  onSave: (id: string, patch: NotePatch) => Promise<unknown>
  onBack: () => void
  onDuplicate: (note: Note) => void
  onCopyLink: (note: Note) => void
  onDelete: (note: Note) => void
  onAnnounce: (msg: string) => void
  /** Called by Escape: focus goes back to the notes list. */
  onEscape: () => void
}

export function NoteEditor({ note, autoFocusTitle, onSave, onBack, onDuplicate, onCopyLink, onDelete, onAnnounce, onEscape }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title)
  const [meta, setMeta] = useState<{ tags: string[]; pinned: boolean; link: NoteLink | null }>({ tags: note.tags, pinned: note.pinned, link: note.link })
  const [linkOpen, setLinkOpen] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const save = useAutosave((patch) => onSave(note.id, patch))
  const queueRef = useRef(save.queue)
  useEffect(() => { queueRef.current = save.queue })

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' } } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: 'Start writing. Try “- ” for a list, “# ” for a heading or “[ ] ” for a checklist.' }),
    ],
    content: note.body,
    editorProps: {
      attributes: { role: 'textbox', 'aria-multiline': 'true', 'aria-label': 'Note body', class: 'note-prose' },
      handleKeyDown: (_view, event) => {
        const mod = event.metaKey || event.ctrlKey
        // Cmd/Ctrl+B is bold here; keep it from also toggling the sidebar.
        if (mod && event.key.toLowerCase() === 'b') event.stopPropagation()
        if (mod && event.key.toLowerCase() === 'k') { event.preventDefault(); setLinkOpen(true); return true }
        if (event.key === 'Escape') { onEscape(); return true }
        return false
      },
    },
    onUpdate: ({ editor: e }) => queueRef.current({ body: e.isEmpty ? '' : e.getHTML() }),
  })

  useEffect(() => {
    if (!autoFocusTitle) return
    const id = requestAnimationFrame(() => titleRef.current?.focus())
    return () => cancelAnimationFrame(id)
  }, [autoFocusTitle])

  const change = (patch: Partial<typeof meta>) => { setMeta((m) => ({ ...m, ...patch })); save.queue(patch, true) }
  const togglePin = () => {
    const pinned = !meta.pinned
    change({ pinned })
    onAnnounce(pinned ? 'Pinned. Moved to the top of the list.' : 'Unpinned.')
  }

  const status = save.status
  return (
    <div className="flex h-full min-h-0 flex-col" data-editor-for={note.id}>
      <header className="flex shrink-0 flex-col gap-3 px-6 pb-3 pt-5 max-lg:px-4">
        <div className="flex items-center gap-2">
          <span className="lg:hidden"><IconButton icon={ArrowLeft} label="Back to notes" size="sm" onClick={onBack} /></span>
          <input
            ref={titleRef}
            aria-label="Note title"
            placeholder="Untitled note"
            value={title}
            onChange={(e) => { setTitle(e.target.value); save.queue({ title: e.target.value }) }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); editor?.commands.focus('start') } else if (e.key === 'Escape') { e.preventDefault(); onEscape() } }}
            className="min-w-0 flex-1 rounded-md bg-transparent px-1 py-1 text-lg font-medium leading-6 outline-none placeholder:text-text-secondary focus-visible:ring-[3px] focus-visible:ring-focus-ring"
          />
          <SaveStatus status={status} onRetry={() => { void save.retry() }} />
          <Tooltip content={meta.pinned ? 'Unpin note' : 'Pin note'}>
            {(tip) => (
              <button
                {...tip}
                type="button"
                aria-pressed={meta.pinned}
                aria-label={meta.pinned ? 'Unpin note' : 'Pin note'}
                onClick={togglePin}
                className={cn('grid size-8 shrink-0 place-items-center rounded-md border outline-none transition-[background-color,border-color,color] duration-hover ease-out focus-ring motion-reduce:transition-none', meta.pinned ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-surface text-text-secondary shadow-control hover:border-border-strong hover:bg-surface-subtle')}
              >
                {meta.pinned ? <PinOff className="size-5" strokeWidth={1.75} /> : <Pin className="size-5" strokeWidth={1.75} />}
              </button>
            )}
          </Tooltip>
          <Menu
            align="end"
            label="Note actions"
            items={[
              { id: 'duplicate', label: 'Duplicate', icon: Copy, onSelect: () => onDuplicate(note) },
              { id: 'copy', label: 'Copy link', icon: Link2, onSelect: () => onCopyLink(note) },
              { type: 'separator' },
              { id: 'delete', label: 'Delete', icon: Trash2, danger: true, onSelect: () => onDelete(note) },
            ]}
            trigger={({ props }) => <IconButton icon={Ellipsis} label="Note actions" size="sm" menuProps={props} />}
          />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <RecordPicker link={meta.link} onChange={(link) => { change({ link }); onAnnounce(link ? 'Linked record updated' : 'Link removed') }} />
          <TagInput tags={meta.tags} onChange={(tags) => change({ tags })} onAnnounce={onAnnounce} />
        </div>
      </header>
      {editor && <EditorToolbar editor={editor} linkOpen={linkOpen} setLinkOpen={setLinkOpen} />}
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-18 pt-4 max-lg:px-4" onClick={(e) => { if (e.target === e.currentTarget) editor?.commands.focus('end') }}>
        <EditorContent editor={editor} />
      </div>
      <footer className="shrink-0 border-t border-border px-6 py-2 text-xs text-text-secondary max-lg:px-4">
        Created {formatShort(note.createdAt)} · Edited {shortRelative(note.updatedAt)}
        <span className="float-right max-lg:hidden">Format: {MOD}+B bold, {MOD}+I italic, {MOD}+K link</span>
      </footer>
    </div>
  )
}

function SaveStatus({ status, onRetry }: { status: 'idle' | 'saving' | 'saved' | 'error'; onRetry: () => void }) {
  return (
    <span aria-live="polite" role="status" data-save-status={status} className="flex h-8 shrink-0 items-center gap-1 text-xs font-medium">
      {status === 'saving' && <span className="text-text-secondary">Saving…</span>}
      {status === 'saved' && <span className="text-success-strong">Saved</span>}
      {status === 'error' && (
        <span className="text-danger-strong">
          Couldn’t save.{' '}
          <button type="button" onClick={onRetry} className="rounded-xs font-medium underline underline-offset-2 outline-none hover:text-text-primary focus-ring">Retry</button>
        </span>
      )}
    </span>
  )
}

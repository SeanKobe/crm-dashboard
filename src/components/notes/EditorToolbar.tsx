import { useEditorState, type Editor } from '@tiptap/react'
import { Bold, Heading2, Italic, Link2, List, ListChecks, ListOrdered } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cn } from '../../lib/cn'
import { MOD } from '../../lib/shortcuts'
import { Button } from '../ui/Button'
import { Popover } from '../ui/Menu'
import { TextField } from '../ui/TextField'
import { Tooltip } from '../ui/Tooltip'
import type { IconComponent } from '../../types'

// Formatting toolbar. Buttons are toggles (aria-pressed); shortcuts show in tooltips.
function ToolButton({ icon: Icon, label, hint, pressed, onClick }: { icon: IconComponent; label: string; hint?: string; pressed: boolean; onClick: () => void }) {
  return (
    <Tooltip content={hint ? `${label} (${hint})` : label}>
      {(tip) => (
        <button
          {...tip}
          type="button"
          aria-label={label}
          aria-pressed={pressed}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClick}
          className={cn(
            'grid size-8 place-items-center rounded-md outline-none transition-colors duration-hover ease-out focus-ring motion-reduce:transition-none',
            pressed ? 'bg-primary-soft text-primary' : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary',
          )}
        >
          <Icon className="size-5" strokeWidth={1.75} />
        </button>
      )}
    </Tooltip>
  )
}

const normalizeUrl = (raw: string): string | null => {
  const t = raw.trim()
  if (!t || /\s/.test(t)) return null
  const url = /^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`
  try { const u = new URL(url); return /^(https?|mailto):$/.test(u.protocol) ? u.toString() : null } catch { return null }
}

function LinkForm({ editor, hasLink, onDone }: { editor: Editor; hasLink: boolean; onDone: () => void }) {
  const [url, setUrl] = useState(() => String(editor.getAttributes('link').href ?? ''))
  const [error, setError] = useState<string | null>(null)
  const apply = () => {
    const href = normalizeUrl(url)
    if (!href) { setError('Enter a web address, for example example.com.'); return }
    const chain = editor.chain().focus().extendMarkRange('link')
    if (editor.state.selection.empty && !editor.isActive('link')) chain.insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] }).run()
    else chain.setLink({ href }).run()
    onDone()
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); apply() }} className="flex w-80 flex-col gap-3 rounded-lg border border-border bg-surface p-3 shadow-hover">
      <TextField label="Web address" autoFocus value={url} onChange={(v) => { setUrl(v); setError(null) }} placeholder="https://example.com" error={error} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); apply() } }} />
      <div className="flex justify-end gap-2">
        {hasLink && <Button onClick={() => { editor.chain().focus().extendMarkRange('link').unsetLink().run(); onDone() }}>Remove link</Button>}
        <Button variant="primary" onClick={apply}>Apply</Button>
      </div>
    </form>
  )
}

export function EditorToolbar({ editor, linkOpen, setLinkOpen }: { editor: Editor; linkOpen: boolean; setLinkOpen: (open: boolean) => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({ bold: e.isActive('bold'), italic: e.isActive('italic'), heading: e.isActive('heading'), bullet: e.isActive('bulletList'), ordered: e.isActive('orderedList'), task: e.isActive('taskList'), link: e.isActive('link') }),
  })
  const [anchor, setAnchor] = useState<HTMLSpanElement | null>(null)
  const anchorRef = useMemo(() => ({ current: anchor }), [anchor])
  const close = (restore: boolean) => { setLinkOpen(false); if (restore) editor.chain().focus().run() }
  return (
    <div role="toolbar" aria-label="Formatting" className="flex shrink-0 flex-wrap items-center gap-0.5 border-y border-border bg-surface-subtle px-4 py-1.5">
      <ToolButton icon={Bold} label="Bold" hint={`${MOD}+B`} pressed={s.bold} onClick={() => editor.chain().focus().toggleBold().run()} />
      <ToolButton icon={Italic} label="Italic" hint={`${MOD}+I`} pressed={s.italic} onClick={() => editor.chain().focus().toggleItalic().run()} />
      <ToolButton icon={Heading2} label="Heading" hint="# then space" pressed={s.heading} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
      <span aria-hidden className="mx-1 h-5 w-px bg-border" />
      <ToolButton icon={List} label="Bulleted list" hint="- then space" pressed={s.bullet} onClick={() => editor.chain().focus().toggleBulletList().run()} />
      <ToolButton icon={ListOrdered} label="Numbered list" hint="1. then space" pressed={s.ordered} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
      <ToolButton icon={ListChecks} label="Checklist" hint="[ ] then space" pressed={s.task} onClick={() => editor.chain().focus().toggleTaskList().run()} />
      <span aria-hidden className="mx-1 h-5 w-px bg-border" />
      <span ref={setAnchor} className="inline-flex"><ToolButton icon={Link2} label="Link" hint={`${MOD}+K`} pressed={s.link} onClick={() => setLinkOpen(true)} /></span>
      <Popover open={linkOpen} onClose={close} anchorRef={anchorRef} role="dialog" label="Link">
        {linkOpen && <LinkForm editor={editor} hasLink={s.link} onDone={() => close(true)} />}
      </Popover>
    </div>
  )
}

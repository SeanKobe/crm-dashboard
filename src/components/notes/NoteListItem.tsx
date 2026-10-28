import { Pin } from 'lucide-react'
import type { KeyboardEventHandler, Ref } from 'react'
import { cn } from '../../lib/cn'
import { shortRelative } from '../../lib/dates'
import { preview } from '../../lib/noteText'
import { Highlight } from '../ui/Highlight'
import { Tag } from '../ui/Tag'
import { RecordChip } from './RecordChip'
import type { Note } from '../../types'

// Note list item (no Figma version; follows Search Result Row: 8px radius, Hover = surface-subtle, Active = primary-soft, match = Medium).
export interface NoteListItemProps {
  note: Note
  query: string
  selected: boolean
  /** The roving-tabindex item (tabIndex 0). */
  active: boolean
  onOpen: (id: string) => void
  onFocusItem: (id: string) => void
  onKeyDown: KeyboardEventHandler<HTMLDivElement>
  itemRef: Ref<HTMLDivElement>
}

export function NoteListItem({ note, query, selected, active, onOpen, onFocusItem, onKeyDown, itemRef }: NoteListItemProps) {
  const text = preview(note.body, 200)
  const shownTags = note.tags.slice(0, 2)
  return (
    <div
      ref={itemRef}
      id={`note-opt-${note.id}`}
      role="option"
      aria-selected={selected}
      data-note-id={note.id}
      data-flip-id={note.id}
      tabIndex={active ? 0 : -1}
      onClick={() => onOpen(note.id)}
      onFocus={() => onFocusItem(note.id)}
      onKeyDown={onKeyDown}
      className={cn(
        'flex cursor-pointer flex-col gap-1 rounded-md px-3 py-2.5 outline-none transition-[background-color,box-shadow] duration-hover ease-out focus-ring motion-reduce:transition-none',
        selected ? 'bg-primary-soft' : 'hover:bg-surface-subtle',
      )}
    >
      <div className="flex items-center gap-2">
        <h3 className={cn('min-w-0 flex-1 truncate text-sm font-medium leading-4.25', selected ? 'text-primary' : 'text-text-primary', !note.title && 'font-normal')}>
          {note.title ? <Highlight text={note.title} query={query} /> : 'Untitled note'}
        </h3>
        {note.pinned && <Pin aria-label="Pinned" role="img" className="size-3.5 shrink-0 fill-current text-primary" strokeWidth={1.75} />}
        <span className="shrink-0 text-xs leading-3.75 text-text-secondary">{shortRelative(note.updatedAt)}</span>
      </div>
      {text && <p className="line-clamp-2 text-compact leading-4 text-text-secondary"><Highlight text={text} query={query} /></p>}
      {(note.link || shownTags.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {note.link && <RecordChip link={note.link} />}
          {shownTags.map((t) => <Tag key={t} tone="neutral">{t}</Tag>)}
          {note.tags.length > shownTags.length && <span className="text-xs text-text-secondary">+{note.tags.length - shownTags.length}</span>}
        </div>
      )}
    </div>
  )
}

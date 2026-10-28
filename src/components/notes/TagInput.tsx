import { useId, useState, type KeyboardEvent } from 'react'
import { Tag as TagIcon } from 'lucide-react'
import { Tag } from '../ui/Tag'

// Tag input: Enter or comma adds, Backspace on an empty field removes the last tag.
export interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  onAnnounce?: (msg: string) => void
}

export function TagInput({ tags, onChange, onAnnounce }: TagInputProps) {
  const [text, setText] = useState('')
  const id = useId()
  const add = (raw: string) => {
    setText('')
    const fresh: string[] = []
    for (const part of raw.split(',')) {
      const t = part.trim().toLowerCase().replace(/\s+/g, '-').slice(0, 24)
      if (t && !tags.includes(t) && !fresh.includes(t)) fresh.push(t)
    }
    if (!fresh.length) return
    onChange([...tags, ...fresh])
    onAnnounce?.(`Added tag ${fresh.join(', ')}`)
  }
  const remove = (t: string) => { onChange(tags.filter((x) => x !== t)); onAnnounce?.(`Removed tag ${t}`) }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(text) }
    else if (e.key === 'Backspace' && !text && tags.length) remove(tags[tags.length - 1])
  }
  return (
    <div role="group" aria-label="Tags" className="flex min-h-8 flex-1 flex-wrap items-center gap-1.5">
      <TagIcon aria-hidden className="size-4 shrink-0 text-text-secondary" strokeWidth={1.75} />
      {tags.map((t) => <Tag key={t} tone="neutral" onRemove={() => remove(t)} removeLabel={`Remove tag ${t}`}>{t}</Tag>)}
      <input
        id={id}
        aria-label="Add tag"
        value={text}
        placeholder={tags.length ? 'Add tag' : 'Add tags'}
        onChange={(e) => (e.target.value.includes(',') ? add(e.target.value) : setText(e.target.value))}
        onKeyDown={onKeyDown}
        onBlur={() => add(text)}
        className="h-8 min-w-20 flex-1 rounded-sm bg-transparent px-1 text-compact outline-none placeholder:text-text-secondary focus-visible:ring-[3px] focus-visible:ring-focus-ring"
      />
    </div>
  )
}

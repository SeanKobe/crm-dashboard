import { Fragment } from 'react'

// Bolds the parts of `text` that match the search `query` (Figma Search Result Row: the match is Medium weight).
const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** `phrase` marks the whole query as one piece of text (what a "contains" filter matches); by default every word is marked on its own. */
export function Highlight({ text, query, phrase = false }: { text: string; query: string; phrase?: boolean }) {
  const terms = phrase ? [query.trim()].filter(Boolean) : query.trim().split(/\s+/).filter(Boolean)
  if (!terms.length) return <>{text}</>
  const parts = text.split(new RegExp(`(${terms.map(escape).join('|')})`, 'gi'))
  return (
    <>
      {parts.map((p, i) => (i % 2 === 1 ? <mark key={i} className="rounded-xs bg-primary/12 font-medium text-inherit">{p}</mark> : <Fragment key={i}>{p}</Fragment>))}
    </>
  )
}

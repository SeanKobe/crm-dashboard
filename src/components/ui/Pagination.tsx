import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/cn'

// Figma "Pagination": 32px buttons, 8px radius, current page primary fill. Shows "…" for long ranges.
export interface PaginationProps {
  page: number
  pages: number
  onChange: (page: number) => void
  label?: string
}

function range(page: number, pages: number): (number | 'gap')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  const out: (number | 'gap')[] = [1]
  const from = Math.max(2, page - 1), to = Math.min(pages - 1, page + 1)
  if (from > 2) out.push('gap')
  for (let i = from; i <= to; i++) out.push(i)
  if (to < pages - 1) out.push('gap')
  out.push(pages)
  return out
}

const base = 'grid size-8 place-items-center rounded-md text-compact font-medium outline-none transition-colors duration-hover ease-out focus-ring motion-reduce:transition-none'

export function Pagination({ page, pages, onChange, label = 'Pagination' }: PaginationProps) {
  return (
    <nav aria-label={label} className="flex items-center gap-1">
      <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => onChange(page - 1)} className={cn(base, 'border border-border bg-surface text-text-secondary shadow-control hover:border-border-strong hover:bg-surface-subtle disabled:pointer-events-none disabled:opacity-50')}>
        <ChevronLeft className="size-5" strokeWidth={1.75} />
      </button>
      {range(page, pages).map((p, i) => p === 'gap' ? (
        <span key={`g${i}`} aria-hidden className="grid size-8 place-items-center text-compact font-medium text-text-secondary">…</span>
      ) : (
        <button key={p} type="button" aria-label={`Page ${p}`} aria-current={p === page ? 'page' : undefined} onClick={() => onChange(p)} className={cn(base, p === page ? 'bg-primary text-primary-foreground' : 'text-text-secondary hover:bg-surface-muted hover:text-text-primary')}>{p}</button>
      ))}
      <button type="button" aria-label="Next page" disabled={page >= pages} onClick={() => onChange(page + 1)} className={cn(base, 'border border-border bg-surface text-text-secondary shadow-control hover:border-border-strong hover:bg-surface-subtle disabled:pointer-events-none disabled:opacity-50')}>
        <ChevronRight className="size-5" strokeWidth={1.75} />
      </button>
    </nav>
  )
}

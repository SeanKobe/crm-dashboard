import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

// The accessible "View as table" form of a chart: a real <table> with a caption, column and row headers.
export interface ReportTableColumn { key: string; label: string; align?: 'left' | 'right' }
export interface ReportTableRow { key: string; header: string; cells: ReactNode[] }

export function ReportTable({ caption, columns, rows, firstColumn }: { caption: string; columns: ReportTableColumn[]; rows: ReportTableRow[]; firstColumn: string }) {
  return (
    <div className="max-h-80 overflow-auto rounded-md border border-border" role="region" aria-label={`${caption}, table`} tabIndex={0} data-report-table>
      <table className="w-full min-w-max border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 bg-surface-subtle">
          <tr>
            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-text-secondary">{firstColumn}</th>
            {columns.map((c) => <th key={c.key} scope="col" className={cn('px-3 py-2 text-xs font-medium text-text-secondary', c.align === 'right' ? 'text-right' : 'text-left')}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-t border-border">
              <th scope="row" className="px-3 py-2 text-left font-medium text-text-primary">{r.header}</th>
              {r.cells.map((cell, i) => <td key={columns[i].key} className={cn('px-3 py-2 tabular-nums text-text-primary', columns[i].align === 'right' ? 'text-right' : 'text-left')}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

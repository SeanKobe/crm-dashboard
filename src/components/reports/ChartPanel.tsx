import { ChartColumn, Table2 } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { Card } from '../cards/Card'
import { cn } from '../../lib/cn'
import type { ReportTableColumn, ReportTableRow } from './ReportTable'
import { ReportTable } from './ReportTable'

// Chart card (Figma "Chart Card Shell": 20px padding, 16px gap, title + caption, legend row). Every chart has a text summary above it and a
// "View as table" switch that shows the same numbers as a real table.
export interface ChartPanelProps {
  title: string
  subtitle: string
  /** One sentence about what the chart shows ("Won revenue is up 12% vs the previous period"). */
  summary: string
  table: { caption: string; firstColumn: string; columns: ReportTableColumn[]; rows: ReportTableRow[] }
  /** True when there is nothing to draw for the period. */
  empty?: boolean
  legend?: ReactNode
  children: ReactNode
  className?: string
  id: string
}

export function ChartPanel({ id, title, subtitle, summary, table, empty = false, legend, children, className }: ChartPanelProps) {
  const [asTable, setAsTable] = useState(false)
  const uid = useId()
  const summaryId = `${uid}-summary`
  return (
    <Card className={cn('flex flex-col gap-4 p-5', className)}>
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-sm font-medium" id={`${uid}-title`}>{title}</h2>
          <p className="text-xs leading-3.75 text-text-secondary">{subtitle}</p>
        </div>
        <button
          type="button"
          aria-pressed={asTable}
          aria-label={`${asTable ? 'View as chart' : 'View as table'}: ${title}`}
          data-view-toggle={id}
          onClick={() => setAsTable((v) => !v)}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 text-compact font-medium text-text-primary shadow-button outline-none transition-colors duration-hover ease-out hover:border-border-strong hover:bg-surface-subtle focus-ring motion-reduce:transition-none"
        >
          {asTable ? <ChartColumn aria-hidden className="size-4 text-text-secondary" strokeWidth={1.75} /> : <Table2 aria-hidden className="size-4 text-text-secondary" strokeWidth={1.75} />}
          {asTable ? 'View as chart' : 'View as table'}
        </button>
      </header>
      <p id={summaryId} data-chart-summary={id} className="text-sm leading-4.25">{summary}</p>
      {asTable ? (
        <ReportTable caption={table.caption} firstColumn={table.firstColumn} columns={table.columns} rows={table.rows} />
      ) : empty ? (
        <p className="grid min-h-40 place-items-center rounded-md bg-surface-subtle px-4 text-center text-sm text-text-secondary" data-chart-empty={id}>No data for this period. Try a wider date range.</p>
      ) : (
        <div role="group" aria-label={`${title} chart`} aria-describedby={summaryId} data-chart={id} className="min-w-0">{children}</div>
      )}
      {!asTable && !empty && legend}
    </Card>
  )
}

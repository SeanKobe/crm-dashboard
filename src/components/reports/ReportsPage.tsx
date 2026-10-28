import { AlarmClock, ChartNoAxesColumn, CircleDollarSign, Coins, Download, Handshake, Percent, Timer, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router'
import { useToast } from '../../context/toastContext'
import { downloadText } from '../../lib/csv'
import { dateRangeError } from '../../lib/dates'
import { motion, prefersReducedMotion } from '../../lib/motion'
import { RANGE_IDS, RANGE_LABELS, changeInfo, formatKpi, formatPeriod, resolvePeriod } from '../../lib/reportsLogic'
import { TABLE_LABELS, reportCsv, type ReportTableId } from '../../lib/reportsExport'
import { useReports } from '../../lib/useReports'
import { loadReportPrefs, saveReportPrefs } from '../../services/reportPrefs'
import { Button } from '../ui/Button'
import { DateField } from '../ui/DateField'
import { EmptyState } from '../ui/EmptyState'
import { FilterButton } from '../ui/FilterButton'
import { KPICard } from '../ui/KPICard'
import { Menu } from '../ui/Menu'
import { Select } from '../ui/Select'
import { ReportsSkeleton } from '../RouteFallbacks'
import { FieldRow } from '../ui/TextField'
import { Toggle } from '../ui/Toggle'
import { FunnelPanel, LeaderboardPanel, RevenuePanel, SourcesPanel } from './panels'
import type { IconComponent, KpiKey, ReportData, ReportPrefs, ReportRangeId } from '../../types'

const KPI_ICONS: Record<KpiKey, IconComponent> = { pipeline: Handshake, won: CircleDollarSign, winRate: Percent, avgDeal: Coins, cycle: Timer, followUps: AlarmClock }
const RANGE_OPTIONS = RANGE_IDS.map((id) => ({ value: id, label: RANGE_LABELS[id] }))
const EXPORTS = Object.keys(TABLE_LABELS) as ReportTableId[]

function KpiRow({ data }: { data: ReportData }) {
  return (
    <section aria-label="Key numbers" className="grid grid-cols-3 gap-4 max-xl:grid-cols-2 max-md:grid-cols-1" data-kpi-row>
      {data.kpis.map((k) => {
        const ch = data.compare ? changeInfo(k.value, k.previous, k.lowerIsBetter, k.unit) : null
        return (
          <div key={k.id} data-kpi={k.id}>
            <KPICard
              icon={KPI_ICONS[k.id]}
              label={k.label}
              info={k.info}
              value={formatKpi(k.unit, k.value)}
              change={ch?.text}
              direction={ch?.direction}
              changeTone={ch?.tone}
              changeLabel={ch ? `${ch.words}` : undefined}
              comparison={ch ? 'vs previous period' : undefined}
            />
          </div>
        )
      })}
    </section>
  )
}

/** "Custom" range: two dates in a popover; they apply as soon as both are valid and in order. */
function CustomRange({ prefs, onChange }: { prefs: ReportPrefs; onChange: (from: string, to: string) => void }) {
  const period = resolvePeriod(prefs)
  const error = dateRangeError(prefs.from, prefs.to)
  return (
    <FilterButton label={`${period.from.slice(5)} – ${period.to.slice(5)}`.replace(/^/, 'Dates: ')} count={0} width="w-80">
      <p className="px-0.5 pb-1 text-xs font-medium text-text-secondary">Custom range</p>
      <FieldRow>
        <DateField label="From" value={prefs.from} onChange={(from) => onChange(from, prefs.to)} invalid={Boolean(error)} />
        <DateField label="To" value={prefs.to} onChange={(to) => onChange(prefs.from, to)} invalid={Boolean(error)} />
      </FieldRow>
      {error && <p role="alert" className="pt-1 text-xs text-danger-strong">{error}</p>}
      {!error && (!prefs.from || !prefs.to) && <p className="pt-1 text-xs text-text-secondary">Choose both dates to apply the range.</p>}
    </FilterButton>
  )
}

export function ReportsPage({ headerSlot }: { headerSlot: HTMLElement | null }) {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const errorFlag = params.get('error') === '1'
  const [prefs, setPrefs] = useState<ReportPrefs>(loadReportPrefs)
  const report = useReports(prefs, { minLoadMs: prefersReducedMotion() ? 0 : motion.skeleton, simulateError: errorFlag })
  const { data, status } = report
  useEffect(() => { saveReportPrefs(prefs) }, [prefs])

  const setRange = useCallback((range: ReportRangeId) => {
    setPrefs((p) => {
      // "Custom" starts from the period that was showing, so it applies straight away.
      const from = range === 'custom' && !(p.from && p.to) ? resolvePeriod(p).from : p.from
      const to = range === 'custom' && !(p.from && p.to) ? resolvePeriod(p).to : p.to
      return { ...p, range, from, to }
    })
  }, [])
  const setCustom = useCallback((from: string, to: string) => setPrefs((p) => ({ ...p, from, to })), [])
  const retry = () => { setParams((p) => { p.delete('error'); return p }, { replace: true }); report.reload() }

  const exportCsv = (id: ReportTableId) => {
    if (!data) return
    const { filename, text } = reportCsv(id, data)
    downloadText(filename, text)
    toast({ type: 'success', title: 'Export complete', message: `${filename} is ready to download.` })
  }
  const period = useMemo(() => resolvePeriod(prefs), [prefs])
  const customBad = prefs.range === 'custom' && Boolean(dateRangeError(prefs.from, prefs.to))

  const headerBar = (
    <>
      <p className="min-w-0 truncate text-sm" data-report-period>
        <span className="font-medium">{formatPeriod(period)}</span>
        {prefs.compare && data && <span className="text-text-secondary"> · compared with {formatPeriod(data.previous)}</span>}
      </p>
      <div className="flex shrink-0 items-center gap-4" role="group" aria-label="Report controls">
        <Select label="Date range" hideLabel className="w-44" value={prefs.range} options={RANGE_OPTIONS} onChange={setRange} />
        {prefs.range === 'custom' && <CustomRange prefs={prefs} onChange={setCustom} />}
        <Toggle checked={prefs.compare} onChange={(compare) => setPrefs((p) => ({ ...p, compare }))} label="Compare to previous period" />
        <Menu
          align="end"
          label="Export"
          items={[{ type: 'label', label: 'Export as CSV' }, ...EXPORTS.map((id) => ({ id, label: TABLE_LABELS[id], disabled: !data, onSelect: () => exportCsv(id) }))]}
          trigger={({ props }) => <Button icon={Download} chevron menuProps={props}>Export</Button>}
        />
      </div>
    </>
  )

  let body
  if (status === 'error') {
    body = <EmptyState icon={TriangleAlert} tone="danger" title="We couldn’t load reports" description="Something went wrong while building the numbers. Try again." action={<Button variant="primary" onClick={retry}>Retry</Button>} className="rounded-lg border border-border bg-surface" />
  } else if (!data || status === 'loading') {
    body = <ReportsSkeleton />
  } else if (data.empty || customBad) {
    body = <div data-reports-empty><EmptyState icon={ChartNoAxesColumn} title="No data for this period" description={customBad ? 'The end date can’t be before the start date.' : 'No data for this period. Try a wider date range.'} action={customBad ? undefined : <Button onClick={() => setRange('year')}>Show this year</Button>} className="rounded-lg border border-border bg-surface" /></div>
  } else {
    body = (
      <div className="flex flex-col gap-6" data-reports-ready>
        <KpiRow data={data} />
        <div className="grid grid-cols-2 gap-4 max-xl:grid-cols-1">
          <FunnelPanel data={data} />
          <RevenuePanel data={data} />
          <SourcesPanel data={data} />
          <LeaderboardPanel data={data} />
        </div>
      </div>
    )
  }
  return (
    <>
      {headerSlot && createPortal(headerBar, headerSlot)}
      {!headerSlot && <div className="flex items-center justify-between gap-4">{headerBar}</div>}
      <p className="sr-only" role="status" aria-live="polite" data-reports-announcer>{status === 'ready' && data ? `Reports updated for ${formatPeriod(data.period)}.` : ''}</p>
      {body}
    </>
  )
}

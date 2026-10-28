import type { ReportData } from '../types'
import { formatKpi, formatPeriod, usd } from './reportsLogic'
import { toCsv } from './csv'

// CSV for each report table. Pure: the page decides when to download.
export type ReportTableId = 'kpis' | 'funnel' | 'revenue' | 'sources' | 'leaderboard'
export const TABLE_LABELS: Record<ReportTableId, string> = {
  kpis: 'KPI summary',
  funnel: 'Pipeline by stage',
  revenue: 'Won revenue over time',
  sources: 'Lead source performance',
  leaderboard: 'Owner leaderboard',
}

export function reportCsv(id: ReportTableId, data: ReportData): { filename: string; text: string } {
  const prevCols = data.compare
  const period = `${data.period.from}_to_${data.period.to}`
  const head = (cols: string[], prev: string[]): string[] => (prevCols ? [...cols, ...prev] : cols)
  let rows: string[][] = []
  if (id === 'kpis') {
    rows = [head(['Metric', 'Value'], ['Previous period']), ...data.kpis.map((k) => (prevCols ? [k.label, formatKpi(k.unit, k.value), formatKpi(k.unit, k.previous)] : [k.label, formatKpi(k.unit, k.value)]))]
  } else if (id === 'funnel') {
    rows = [head(['Stage', 'Deals', 'Value'], ['Previous deals', 'Previous value']), ...data.funnel.map((r) => head([r.label, String(r.count), usd(r.value)], [String(r.previousCount), usd(r.previousValue)]))]
  } else if (id === 'revenue') {
    rows = [head(['Period', 'Won revenue', 'Deals won'], ['Previous period revenue']), ...data.revenue.buckets.map((b) => head([b.title, usd(b.value), String(b.deals)], [usd(b.previousValue)]))]
  } else if (id === 'sources') {
    rows = [head(['Source', 'Leads', 'Customers', 'Conversion'], ['Previous leads']), ...data.sources.rows.map((r) => head([r.source, String(r.leads), String(r.customers), `${r.conversion}%`], [String(r.previousLeads)]))]
  } else {
    rows = [head(['Rank', 'Owner', 'Won value', 'Deals closed', 'Meetings'], ['Previous won value']), ...data.leaderboard.map((r, i) => head([String(i + 1), r.name, usd(r.wonValue), String(r.closed), String(r.meetings)], [usd(r.previousWonValue)]))]
  }
  return { filename: `${id}-${period}.csv`, text: toCsv([[TABLE_LABELS[id], formatPeriod(data.period)], [], ...rows]) }
}

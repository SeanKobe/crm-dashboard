import { Link, useNavigate } from 'react-router'
import { BarChart } from '../charts/BarChart'
import { stageLabel } from '../../data/deals'
import { contactsLink, dealsLink, changeInfo, plural, trendSentence, usd } from '../../lib/reportsLogic'
import type { Change, ReportData } from '../../types'
import { ChartPanel } from './ChartPanel'
import { RankedBars, type RankedRow } from './RankedBars'

// The four Reports charts. Each one: a text summary, the chart (click or Enter on any element opens the matching Deals or Contacts list),
// and the same numbers as a table. All the numbers come from `data`, which the reports service derived from the deals, contacts and events.
const OPEN_STAGES = ['new', 'contacted', 'qualified', 'proposal']
const asChange = (value: number, previous: number): Change => { const c = changeInfo(value, previous); return { direction: c.direction, text: c.text } }
const linkClass = 'rounded-xs font-medium text-primary underline underline-offset-2 outline-none focus-ring'
const subtitleFor = (data: ReportData): string => (data.compare ? 'Compared with the previous period' : 'Selected period')

export function FunnelPanel({ data }: { data: ReportData }) {
  const navigate = useNavigate()
  const { from, to } = data.period
  const link = (stage: string): string => (stage === 'won' || stage === 'lost' ? dealsLink({ stage, stageFrom: from, stageTo: to }) : dealsLink({ stage }))
  const open = data.funnel.filter((r) => OPEN_STAGES.includes(r.stage))
  const openCount = open.reduce((s, r) => s + r.count, 0)
  const openValue = open.reduce((s, r) => s + r.value, 0)
  const prevOpenValue = open.reduce((s, r) => s + r.previousValue, 0)
  const won = data.funnel.find((r) => r.stage === 'won')
  const lost = data.funnel.find((r) => r.stage === 'lost')
  const summary = trendSentence('Open pipeline value', openValue, prevOpenValue, data.compare, `${plural(openCount, 'open deal')} worth ${usd(openValue)}; ${plural(won?.count ?? 0, 'deal')} won and ${plural(lost?.count ?? 0, 'deal')} lost in the period.`)
  const rows: RankedRow[] = data.funnel.map((r) => ({
    key: r.stage,
    label: r.label,
    value: r.value,
    valueText: `${plural(r.count, 'deal')} · ${usd(r.value)}`,
    ariaLabel: `${r.label}: ${plural(r.count, 'deal')}, ${usd(r.value)}. Open in Deals.`,
    tooltipTitle: r.label,
    tooltipValue: usd(r.value),
    tooltipSuffix: plural(r.count, 'deal'),
    tooltipChange: data.compare ? asChange(r.value, r.previousValue) : undefined,
    onOpen: () => navigate(link(r.stage)),
  }))
  return (
    <ChartPanel
      id="funnel"
      title="Pipeline by stage"
      subtitle={subtitleFor(data)}
      summary={summary}
      empty={data.funnel.every((r) => r.count === 0)}
      table={{
        caption: 'Pipeline by stage: deals and value per stage',
        firstColumn: 'Stage',
        columns: [
          { key: 'count', label: 'Deals', align: 'right' },
          { key: 'value', label: 'Value', align: 'right' },
          ...(data.compare ? [{ key: 'pc', label: 'Previous deals', align: 'right' as const }, { key: 'pv', label: 'Previous value', align: 'right' as const }] : []),
          { key: 'open', label: 'List' },
        ],
        rows: data.funnel.map((r) => ({ key: r.stage, header: r.label, cells: [r.count, usd(r.value), ...(data.compare ? [r.previousCount, usd(r.previousValue)] : []), <Link key="l" to={link(r.stage)} className={linkClass}>View deals<span className="sr-only"> in {stageLabel(r.stage)}</span></Link>] })),
      }}
    >
      <RankedBars rows={rows} centered labelWidth="w-24" />
    </ChartPanel>
  )
}

export function RevenuePanel({ data }: { data: ReportData }) {
  const navigate = useNavigate()
  const r = data.revenue
  const summary = trendSentence('Won revenue', r.total, r.previousTotal, data.compare, `${usd(r.total)} from ${plural(r.deals, 'deal')}.`)
  const buckets = r.buckets
  const values = buckets.map((b) => b.value / 1000)
  const trend = data.compare ? buckets.map((b) => b.previousValue / 1000) : []
  const link = (i: number): string => dealsLink({ stage: 'won', stageFrom: buckets[i].from, stageTo: buckets[i].to })
  return (
    <ChartPanel
      id="revenue"
      title="Won revenue over time"
      subtitle={subtitleFor(data)}
      summary={summary}
      empty={r.total === 0 && r.previousTotal === 0}
      legend={
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary" aria-label="Legend">
          <li className="flex items-center gap-1.5"><span aria-hidden className="h-3 w-3 border-t-2 border-primary bg-surface-faint" />Won revenue</li>
          {data.compare && <li className="flex items-center gap-1.5"><span aria-hidden className="w-4 border-t-2 border-dotted border-border-strong" />Previous period</li>}
        </ul>
      }
      table={{
        caption: 'Won revenue over time: revenue and deals won per period',
        firstColumn: 'Period',
        columns: [
          { key: 'rev', label: 'Won revenue', align: 'right' },
          { key: 'deals', label: 'Deals won', align: 'right' },
          ...(data.compare ? [{ key: 'prev', label: 'Previous period', align: 'right' as const }] : []),
          { key: 'open', label: 'List' },
        ],
        rows: buckets.map((b, i) => ({ key: b.from, header: b.title, cells: [usd(b.value), b.deals, ...(data.compare ? [usd(b.previousValue)] : []), <Link key="l" to={link(i)} className={linkClass}>View deals<span className="sr-only"> won {b.title}</span></Link>] })),
      }}
    >
      <BarChart
        labels={buckets.map((b) => b.label)}
        titles={buckets.map((b) => b.title)}
        values={values}
        trend={trend}
        previous={0}
        unit="k"
        formatValue={(thousands) => usd(thousands * 1000)}
        trendKey={`${data.period.from}-${data.period.to}-${data.compare}`}
        height={200}
        strongText
        changes={data.compare ? buckets.map((b) => asChange(b.value, b.previousValue)) : buckets.map(() => undefined)}
        onSelect={(i) => navigate(link(i))}
        selectHint="Open the deals won in Deals"
      />
    </ChartPanel>
  )
}

export function SourcesPanel({ data }: { data: ReportData }) {
  const navigate = useNavigate()
  const { from, to } = data.period
  const s = data.sources
  const top = s.rows[0]
  const link = (source: string): string => contactsLink({ source, createdFrom: from, createdTo: to })
  const summary = top && top.leads > 0
    ? trendSentence('Lead volume', s.total, s.previousTotal, data.compare, `${top.source} is the top source with ${plural(top.leads, 'lead')}, and ${top.conversion}% of them became customers.`)
    : trendSentence('Lead volume', s.total, s.previousTotal, data.compare, 'No new leads in this period.')
  const rows: RankedRow[] = s.rows.map((r) => ({
    key: r.source,
    label: r.source,
    value: r.leads,
    inner: r.leads ? r.customers / r.leads : 0,
    valueText: `${plural(r.leads, 'lead')} · ${r.conversion}% converted`,
    ariaLabel: `${r.source}: ${plural(r.leads, 'lead')}, ${r.customers} became customers, ${r.conversion}% conversion. Open in Contacts.`,
    tooltipTitle: r.source,
    tooltipValue: r.leads,
    tooltipSuffix: r.leads === 1 ? 'lead' : 'leads',
    tooltipChange: data.compare ? asChange(r.leads, r.previousLeads) : undefined,
    tooltipRows: [{ label: 'Became customers', value: r.customers, tone: 'bg-primary-pressed' }, { label: 'Conversion', value: `${r.conversion}%`, tone: 'bg-primary' }],
    onOpen: () => navigate(link(r.source)),
  }))
  return (
    <ChartPanel
      id="sources"
      title="Lead source performance"
      subtitle={subtitleFor(data)}
      summary={summary}
      empty={s.total === 0}
      legend={
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary" aria-label="Legend">
          <li className="flex items-center gap-1.5"><span aria-hidden className="h-3 w-4 rounded-xs bg-primary bg-[repeating-linear-gradient(135deg,var(--color-primary)_0,var(--color-primary-stripe)_4px,var(--color-primary)_8px)]" />Leads</li>
          <li className="flex items-center gap-1.5"><span aria-hidden className="h-3 w-4 rounded-xs bg-primary-pressed" />Became customers</li>
        </ul>
      }
      table={{
        caption: 'Lead source performance: leads, customers and conversion per source',
        firstColumn: 'Source',
        columns: [
          { key: 'leads', label: 'Leads', align: 'right' },
          { key: 'customers', label: 'Customers', align: 'right' },
          { key: 'conv', label: 'Conversion', align: 'right' },
          ...(data.compare ? [{ key: 'pl', label: 'Previous leads', align: 'right' as const }] : []),
          { key: 'open', label: 'List' },
        ],
        rows: s.rows.map((r) => ({ key: r.source, header: r.source, cells: [r.leads, r.customers, `${r.conversion}%`, ...(data.compare ? [r.previousLeads] : []), <Link key="l" to={link(r.source)} className={linkClass}>View contacts<span className="sr-only"> from {r.source}</span></Link>] })),
      }}
    >
      <RankedBars rows={rows} labelWidth="w-24" />
    </ChartPanel>
  )
}

export function LeaderboardPanel({ data }: { data: ReportData }) {
  const navigate = useNavigate()
  const { from, to } = data.period
  const top = data.leaderboard[0]
  const total = data.leaderboard.reduce((sum, r) => sum + r.wonValue, 0)
  const previousTotal = data.leaderboard.reduce((sum, r) => sum + r.previousWonValue, 0)
  const link = (ownerId: string): string => dealsLink({ stage: 'won', owner: ownerId, stageFrom: from, stageTo: to })
  const summary = top && top.wonValue > 0
    ? trendSentence('Team won revenue', total, previousTotal, data.compare, `${top.name} leads with ${usd(top.wonValue)} across ${plural(top.closed, 'deal')}.`)
    : trendSentence('Team won revenue', total, previousTotal, data.compare, 'No deals were won in this period.')
  const rows: RankedRow[] = data.leaderboard.map((r, i) => ({
    key: r.ownerId,
    label: `${i + 1}. ${r.name}`,
    value: r.wonValue,
    valueText: `${usd(r.wonValue)} · ${plural(r.closed, 'deal')}`,
    ariaLabel: `Rank ${i + 1}, ${r.name}: ${usd(r.wonValue)} won across ${plural(r.closed, 'deal')}, ${plural(r.meetings, 'meeting')}. Open in Deals.`,
    tooltipTitle: r.name,
    tooltipValue: usd(r.wonValue),
    tooltipSuffix: 'won',
    tooltipChange: data.compare ? asChange(r.wonValue, r.previousWonValue) : undefined,
    tooltipRows: [{ label: 'Deals closed', value: r.closed, tone: 'bg-primary' }, { label: 'Meetings', value: r.meetings, tone: 'bg-primary-soft' }],
    onOpen: () => navigate(link(r.ownerId)),
  }))
  return (
    <ChartPanel
      id="leaderboard"
      title="Owner leaderboard"
      subtitle={subtitleFor(data)}
      summary={summary}
      empty={total === 0 && data.leaderboard.every((r) => r.meetings === 0)}
      table={{
        caption: 'Owner leaderboard: won value, deals closed and meetings per owner',
        firstColumn: 'Owner',
        columns: [
          { key: 'rank', label: 'Rank', align: 'right' },
          { key: 'won', label: 'Won value', align: 'right' },
          { key: 'closed', label: 'Deals closed', align: 'right' },
          { key: 'meet', label: 'Meetings', align: 'right' },
          ...(data.compare ? [{ key: 'pw', label: 'Previous won value', align: 'right' as const }] : []),
          { key: 'open', label: 'List' },
        ],
        rows: data.leaderboard.map((r, i) => ({ key: r.ownerId, header: r.name, cells: [i + 1, usd(r.wonValue), r.closed, r.meetings, ...(data.compare ? [usd(r.previousWonValue)] : []), <Link key="l" to={link(r.ownerId)} className={linkClass}>View deals<span className="sr-only"> won by {r.name}</span></Link>] })),
      }}
    >
      <RankedBars rows={rows} labelWidth="w-32" />
    </ChartPanel>
  )
}

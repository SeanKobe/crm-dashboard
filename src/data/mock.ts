import {
  Building2,
  Calendar,
  ChartNoAxesColumn,
  Coins,
  File,
  Heart,
  HeartHandshake,
  Laptop,
  LayoutDashboard,
  Layers,
  TrendingUp,
  User,
  Users,
} from 'lucide-react'
import type {
  Account,
  Brand,
  CalendarData,
  ChartMetric,
  ChartRange,
  ExportFormat,
  Favorite,
  FavoriteSeed,
  FavoriteType,
  KpiMetric,
  LeadsManagementData,
  MetricRangeData,
  NavEntry,
  NotificationData,
  RangeData,
  RetentionData,
  RevenueData,
  SearchResult,
  StorageInfo,
  TopCountryData,
  WidgetInfo,
} from '../types'

export const brand: Brand = { title: 'CRM', subtitle: 'Lead Management' }

// `tone` picks the Avatar tint so switching accounts is visible even though every address starts with the same letter.
export const accounts: Account[] = [
  { id: 'acc-2020', email: 'alex@example.com', tone: 'purple' },
  { id: 'acc-2021', email: 'jordan@example.com', tone: 'green' },
  { id: 'acc-2022', email: 'sam@example.com', tone: 'orange' },
]

export const navItems: NavEntry[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'deals', label: 'Deals', icon: Heart },
  { id: 'notes', label: 'Notes', icon: File },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'reports', label: 'Reports', icon: ChartNoAxesColumn },
  { id: 'projects', label: 'Projects', icon: Layers },
]

export const favorites: Favorite[] = [
  { id: 'companies', label: 'Companies', icon: Building2, count: '1,212' },
  { id: 'contacts', label: 'Contacts', icon: User, count: '898' },
  { id: 'meetings', label: 'Meetings', icon: Laptop, count: '32' },
]

// Rows the Favorites "+" menu can add, one pool per type (icons are mapped in the component).
export const favoriteTypes: FavoriteType[] = ['Company', 'Contact', 'Meeting']
export const favoriteSeeds: Record<FavoriteType, FavoriteSeed[]> = {
  Company: [{ label: 'Globex', count: '412' }, { label: 'Initech', count: '268' }, { label: 'Umbrella Corp', count: '97' }, { label: 'Hooli', count: '1,034' }],
  Contact: [{ label: 'Avery Brooks', count: '56' }, { label: 'Mina Park', count: '31' }, { label: 'Luis Ortega', count: '74' }, { label: 'Priya Nair', count: '19' }],
  Meeting: [{ label: 'Pipeline review', count: '8' }, { label: 'Weekly sync', count: '24' }, { label: 'Customer call', count: '15' }, { label: 'Demo day', count: '6' }],
}

export const storage: StorageInfo = { usedPercent: 90, upgradeLabel: 'Upgrade Storage', upgradeNote: '(up to 25GB)' }

export const lastUpdated = 'Last updated now'

export const kpis: KpiMetric[] = [
  { id: 'leads', info: 'New leads created in the selected period, compared with the previous one.', label: 'Leads', icon: Users, value: '129', change: '2%', direction: 'up', comparison: 'vs last week' },
  { id: 'clv', info: 'Customer lifetime value: how long, on average, a customer stays active.', label: 'CLV', icon: HeartHandshake, value: '14d', change: '4%', direction: 'down', comparison: 'vs last week' },
  { id: 'conversion', info: 'Share of leads that became paying customers.', label: 'Conversion Rate', icon: TrendingUp, value: '24%', change: '2%', direction: 'up', comparison: 'vs last week' },
  { id: 'revenue', info: 'Revenue from closed deals in the selected period.', label: 'Revenue', icon: Coins, value: '$1.4K', change: '4%', direction: 'down', comparison: 'vs last month' },
]

// Revenue series are in thousands of dollars. `trend` is the dotted overlay line.
export const revenueRanges: ChartRange[] = ['1D', '1W', '1M', '6M', '1Y', 'ALL']
export const revenue: RevenueData = {
  title: 'Revenue',
  defaultRange: '1Y',
  ranges: {
    '1D': {
      previous: 0.5,
      titles: ['12 AM', '2 AM', '4 AM', '6 AM', '8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM', '10 PM'].map((t) => `Oct 8, ${t}`),
      amount: '$1.4', delta: '+4%', compare: 'vs yesterday',
      labels: ['12a', '2a', '4a', '6a', '8a', '10a', '12p', '2p', '4p', '6p', '8p', '10p'],
      values: [0.4, 0.3, 0.2, 0.5, 1.4, 2.2, 2.9, 2.6, 3.1, 2.4, 1.7, 0.9],
      trend: [0.8, 0.6, 0.5, 0.7, 1.1, 1.6, 2.0, 2.1, 2.3, 2.0, 1.4, 1.0],
    },
    '1W': {
      previous: 3.9,
      titles: ['Mon, Oct 6', 'Tue, Oct 7', 'Wed, Oct 8', 'Thu, Oct 9', 'Fri, Oct 10', 'Sat, Oct 11', 'Sun, Oct 12'],
      amount: '$8.412', delta: '+9%', compare: 'vs last week',
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      values: [4.2, 5.1, 3.8, 6.0, 5.5, 2.9, 3.4],
      trend: [3.8, 4.4, 4.2, 4.9, 5.0, 3.6, 3.2],
    },
    '1M': {
      previous: 8.7,
      titles: ['Week 1, Oct 2025', 'Week 2, Oct 2025', 'Week 3, Oct 2025', 'Week 4, Oct 2025'],
      amount: '$46.201', delta: '+11%', compare: 'vs last month',
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      values: [9.5, 12.1, 10.4, 14.2],
      trend: [8.8, 10.6, 11.3, 12.7],
    },
    '6M': {
      previous: 16.5,
      titles: ['Sep, 2025', 'Oct, 2025', 'Nov, 2025', 'Dec, 2025', 'Jan, 2026', 'Feb, 2026'],
      amount: '$131.280', delta: '+17%', compare: 'vs previous 6 months',
      labels: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'],
      values: [18, 22, 19, 27, 21, 24],
      trend: [16, 19, 21, 22, 22, 23],
    },
    '1Y': {
      previous: 20.1,
      titles: ['Mar, 2025', 'Apr, 2025', 'May, 2025', 'Jun, 2025', 'Jul, 2025', 'Aug, 2025', 'Sept, 2025', 'Oct, 2025', 'Nov, 2025', 'Des, 2025', 'Jan, 2026', 'Feb, 2026'],
      amount: '$32.209', delta: '+22%', compare: 'vs last month',
      labels: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Des', 'Jan', 'Feb'],
      values: [22.8, 16, 19.6, 12.6, 19.6, 5.5, 19.6, 16, 18.7, 9, 5.4, 7],
      trend: [5.5, 7, 6, 5, 8, 6, 10.5, 7, 10, 8, 5, 6.5],
    },
    ALL: {
      previous: 30,
      titles: ['2020', '2021', '2022', '2023', '2024', '2025'],
      amount: '$482.930', delta: '+38%', compare: 'vs last year',
      labels: ['2020', '2021', '2022', '2023', '2024', '2025'],
      values: [38, 64, 97, 142, 188, 231],
      trend: [30, 55, 85, 125, 170, 205],
    },
  },
}

export const calendar: CalendarData = {
  title: 'Calendar',
  startWeek: '2025-10-05',
  selected: '2025-10-08',
}

export const leadsManagement: LeadsManagementData = {
  title: 'Leads Management',
  tabs: ['Status', 'Sources', 'Qualification'],
  defaultTab: 'Status',
  // `count` drives the bar length and the tooltip; `change` is the signed % vs the previous period.
  rows: {
    Status: [
      { label: 'Qualified', count: 842, change: 2 },
      { label: 'Contacted', count: 650, change: -4 },
      { label: 'Lost', count: 160, change: -7 },
      { label: 'Won', count: 790, change: 6 },
    ],
    Sources: [
      { label: 'Website', count: 720, change: 5 },
      { label: 'Referral', count: 540, change: 1 },
      { label: 'Social', count: 380, change: -3 },
      { label: 'Email', count: 230, change: -9 },
    ],
    Qualification: [
      { label: 'Hot', count: 310, change: 12 },
      { label: 'Warm', count: 620, change: 3 },
      { label: 'Cold', count: 770, change: -2 },
      { label: 'Unscored', count: 180, change: -5 },
    ],
  },
}

export const topCountry: TopCountryData = {
  title: 'Top Country',
  viewMore: 'View more',
  rows: [
    { rank: 1, country: 'australia', name: 'Australia', value: '48%' },
    { rank: 2, country: 'malaysia', name: 'Malaysia', value: '33%' },
    { rank: 3, country: 'indonesia', name: 'Indonesia', value: '25%' },
    { rank: 4, country: 'singapore', name: 'Singapore', value: '17%' },
  ],
}

export const retention: RetentionData = {
  title: 'Retention Rate',
  amount: '95%',
  delta: '+12% vs last month',
  activeMonth: 'Sep',
  previousTotal: 84,
  series: [
    { key: 'smes', label: 'SMEs' },
    { key: 'startups', label: 'Startups' },
    { key: 'enterprises', label: 'Enterprises' },
  ],
  months: [
    { month: 'Jun', title: 'Jun, 2025', smes: 32, startups: 25, enterprises: 33 },
    { month: 'Jul', title: 'Jul, 2025', smes: 24, startups: 30, enterprises: 19 },
    { month: 'Aug', title: 'Aug, 2025', smes: 37, startups: 47, enterprises: 31 },
    { month: 'Sep', title: 'Sep, 2025', smes: 22, startups: 50, enterprises: 15 },
    { month: 'Oct', title: 'Oct, 2025', smes: null, startups: null, enterprises: null },
    { month: 'Nov', title: 'Nov, 2025', smes: null, startups: null, enterprises: null },
    { month: 'Dec', title: 'Dec, 2025', smes: null, startups: null, enterprises: null },
  ],
}

// ---- Header interactions
export const searchResults: SearchResult[] = [
  { id: 's1', group: 'Leads', title: 'Avery Brooks', hint: 'Qualified, Acme Corp', icon: 'user' },
  { id: 's2', group: 'Leads', title: 'Mina Park', hint: 'Contacted, Northwind', icon: 'user' },
  { id: 's3', group: 'Contacts', title: 'Luis Ortega', hint: 'luis@globex.com', icon: 'mail' },
  { id: 's4', group: 'Contacts', title: 'Priya Nair', hint: 'priya@initech.dev', icon: 'mail' },
  { id: 's5', group: 'Deals', title: 'Acme renewal', hint: '$24,000, Contacted', icon: 'handshake' },
  { id: 's6', group: 'Deals', title: 'Globex upsell', hint: '$58,000, Won', icon: 'handshake' },
]

export const notifications: NotificationData[] = [
  { id: 'n1', title: 'Avery Brooks moved a deal', message: 'Acme renewal moved to Contacted.', time: '5 minutes ago', initial: 'A', tone: 'purple', unread: true },
  { id: 'n2', title: 'New lead assigned to you', message: 'Mina Park from Northwind is waiting for a reply.', time: '32 minutes ago', initial: 'M', tone: 'green', unread: true },
  { id: 'n3', title: 'Meeting starts soon', message: 'Mesh Weekly Meeting begins at 9.00 am.', time: '1 hour ago', initial: 'W', tone: 'orange', unread: false },
  { id: 'n4', title: 'Deal won', message: 'Globex upsell closed at $58,000.', time: 'Yesterday', initial: 'G', tone: 'green', unread: false },
]
export const messages: NotificationData[] = [
  { id: 'm1', title: 'Luis Ortega', message: 'Can we move the demo to Thursday afternoon?', time: '2 minutes ago', initial: 'L', tone: 'orange', unread: true },
  { id: 'm2', title: 'Priya Nair', message: 'Sharing the signed order form now.', time: '18 minutes ago', initial: 'P', tone: 'purple', unread: true },
  { id: 'm3', title: 'Support team', message: 'Your export is ready to download.', time: 'Yesterday', initial: 'S', tone: 'amber', unread: false },
]

export const widgets: WidgetInfo[] = [
  { id: 'kpi-leads', label: 'Leads' }, { id: 'kpi-clv', label: 'CLV' }, { id: 'kpi-conversion', label: 'Conversion Rate' }, { id: 'kpi-revenue', label: 'Revenue (KPI)' },
  { id: 'revenue', label: 'Revenue chart' }, { id: 'calendar', label: 'Calendar' },
  { id: 'leads', label: 'Leads Management' }, { id: 'country', label: 'Top Country' }, { id: 'retention', label: 'Retention Rate' },
]
export const exportFormats: ExportFormat[] = ['CSV', 'Excel', 'PDF']

// ---- Revenue chart metrics (Revenue is the designed data; Deals and Leads are derived counts for the same ranges)
const derive = (range: RangeData, factor: number, delta: string, noun: string): RangeData & { noun: string } => ({
  amount: String(Math.round(range.values.reduce((a, b) => a + b, 0) * factor)), delta, compare: range.compare,
  labels: range.labels, titles: range.titles, previous: range.previous * factor,
  values: range.values.map((v) => Math.round(v * factor)), trend: range.trend.map((v) => Math.round(v * factor)), noun,
})
export const chartMetrics: ChartMetric[] = ['Revenue', 'Deals', 'Leads']
export const metricRanges = (metric: ChartMetric): Record<ChartRange, MetricRangeData> => {
  // Object.fromEntries widens the keys to string, so the entries are cast back to the typed record.
  const ranges = Object.entries(revenue.ranges) as [ChartRange, RangeData][]
  if (metric === 'Revenue') return Object.fromEntries(ranges.map(([k, r]) => [k, { ...r, unit: 'k', noun: '' }])) as Record<ChartRange, MetricRangeData>
  const [factor, delta, noun] = metric === 'Deals' ? [1.4, '+9%', 'deals'] : [4.2, '+14%', 'leads']
  return Object.fromEntries(ranges.map(([k, r]) => [k, { ...derive(r, factor, delta, noun), unit: '' }])) as Record<ChartRange, MetricRangeData>
}

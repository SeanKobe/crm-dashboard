import { lazy, Suspense, useEffect, useState, type CSSProperties } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router'
import { Building2, Clock, Laptop, Users } from 'lucide-react'
import type { KpiId, NavId } from './types'
import { kpis, navItems } from './data/mock'
import { LoadedProvider } from './context/Loaded'
import { WidgetsProvider } from './context/Widgets'
import { Header } from './components/layout/Header'
import { Sidebar } from './components/layout/Sidebar'
import { WidgetGrid, type WidgetGridItem } from './components/layout/WidgetGrid'
import { CalendarCard } from './components/cards/CalendarCard'
import { LeadsManagementCard } from './components/cards/LeadsManagementCard'
import { RetentionCard } from './components/cards/RetentionCard'
import { RevenueCard } from './components/cards/RevenueCard'
import { TopCountryCard } from './components/cards/TopCountryCard'
import { CalendarRouteFallback, CompaniesFallback, ContactsRouteFallback, MeetingsFallback, DealsRouteFallback, NotesRouteFallback, ProjectsFallback, ReportsSkeleton } from './components/RouteFallbacks'
import { DealsProvider } from './context/Deals'
import { RecordsProvider } from './context/Records'
import { Button } from './components/ui/Button'
import { EmptyState } from './components/ui/EmptyState'
import { KPICard } from './components/ui/KPICard'
import { ToastProvider } from './components/ui/Toast'
import { DataFailureToasts } from './components/ui/DataFailureToasts'
import { DemoBanner } from './components/layout/DemoBanner'
import { cn } from './lib/cn'

// Each route is its own chunk. They are fetched in the background once the Dashboard is idle, so moving between pages is instant.
const loadDeals = () => import('./components/deals/DealsPage')
const loadNotes = () => import('./components/notes/NotesPage')
const loadContacts = () => import('./components/contacts/ContactsPage')
const loadCalendar = () => import('./components/calendar/CalendarPage')
const loadReports = () => import('./components/reports/ReportsPage')
const loadProjects = () => import('./components/projects/ProjectsPage')
const loadCompanies = () => import('./components/companies/CompaniesPage')
const loadMeetings = () => import('./components/meetings/MeetingsPage')
const DealsPage = lazy(() => loadDeals().then((m) => ({ default: m.DealsPage })))
const NotesPage = lazy(() => loadNotes().then((m) => ({ default: m.NotesPage })))
const ContactsPage = lazy(() => loadContacts().then((m) => ({ default: m.ContactsPage })))
const CalendarPage = lazy(() => loadCalendar().then((m) => ({ default: m.CalendarPage })))
const ReportsPage = lazy(() => loadReports().then((m) => ({ default: m.ReportsPage })))
const ProjectsPage = lazy(() => loadProjects().then((m) => ({ default: m.ProjectsPage })))
const CompaniesPage = lazy(() => loadCompanies().then((m) => ({ default: m.CompaniesPage })))
const MeetingsPage = lazy(() => loadMeetings().then((m) => ({ default: m.MeetingsPage })))

// Page-load choreography: sidebar, header, KPI row, middle row, bottom row rise in one after another (80ms apart).
const rise = (step: number): CSSProperties => ({ animationDelay: `${step * 80}ms` })
const equal = (n: number) => `repeat(${n}, minmax(0, 1fr))`
const middle = (n: number) => (n > 1 ? 'minmax(0, 1fr) 356px' : 'minmax(0, 1fr)')

function DashboardPage() {
  const [selectedKpi, setSelectedKpi] = useState<KpiId | null>(null)
  const kpiItems: WidgetGridItem[] = kpis.map((k) => ({ id: `kpi-${k.id}`, node: <KPICard {...k} selected={selectedKpi === k.id} onSelect={() => setSelectedKpi((s) => (s === k.id ? null : k.id))} /> }))
  return (
    <>
      <WidgetGrid className="grid animate-rise gap-6" style={rise(2)} columns={equal} items={kpiItems} />
      <WidgetGrid className="grid animate-rise gap-6" style={rise(3)} columns={middle} items={[{ id: 'revenue', node: <RevenueCard /> }, { id: 'calendar', node: <CalendarCard /> }]} />
      <WidgetGrid className="grid animate-rise gap-6" style={rise(4)} columns={equal} items={[{ id: 'leads', node: <LeadsManagementCard /> }, { id: 'country', node: <TopCountryCard /> }, { id: 'retention', node: <RetentionCard /> }]} />
    </>
  )
}

const PATHS: Record<NavId, string> = { dashboard: '/', deals: '/deals', notes: '/notes', calendar: '/calendar', reports: '/reports', projects: '/projects' }
const idForPath = (pathname: string): NavId | null =>
  navItems.find((n) => (n.id === 'dashboard' ? pathname === '/' : pathname === PATHS[n.id] || pathname.startsWith(`${PATHS[n.id]}/`)))?.id ?? null

function ComingSoon({ label }: { label: string }) {
  const navigate = useNavigate()
  return (
    <div className="grid flex-1 animate-fade-in place-items-center rounded-lg border border-dashed border-border-strong bg-surface">
      <EmptyState icon={Clock} title={`${label} is coming soon`} description="This page is not part of the demo yet. The Dashboard and Deals are ready to explore." action={<Button onClick={() => navigate('/deals')}>Open Deals</Button>} />
    </div>
  )
}

export default function App() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [barEl, setBarEl] = useState<HTMLDivElement | null>(null)
  useEffect(() => {
    const id = window.setTimeout(() => { void loadDeals(); void loadNotes(); void loadContacts(); void loadCalendar(); void loadReports(); void loadProjects(); void loadCompanies(); void loadMeetings() }, 2500)
    return () => window.clearTimeout(id)
  }, [])
  const activeId = idForPath(pathname)
  // Contacts, Companies and Meetings are opened from the Favorites rows, not the main nav: no nav item is active there.
  const under = (base: string) => pathname === base || pathname.startsWith(`${base}/`)
  const isContacts = under('/contacts')
  const isCompanies = under('/companies')
  const isMeetings = under('/meetings')
  if (!activeId && !isContacts && !isCompanies && !isMeetings) return <Navigate to="/" replace />
  const active = isContacts ? { label: 'Contacts', icon: Users } : isCompanies ? { label: 'Companies', icon: Building2 } : isMeetings ? { label: 'Meetings', icon: Laptop } : navItems.find((n) => n.id === activeId) ?? navItems[0]
  const isDashboard = activeId === 'dashboard'
  const isDeals = activeId === 'deals'
  const isNotes = activeId === 'notes'
  const isCalendar = activeId === 'calendar'
  const isReports = activeId === 'reports'
  const isProjects = activeId === 'projects'
  return (
    <LoadedProvider>
      <ToastProvider>
        <DataFailureToasts />
        <WidgetsProvider>
         <DealsProvider>
         <RecordsProvider>
          <a href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus() }} className="fixed left-4 top-4 z-[90] -translate-y-20 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-hover outline-none transition-[transform,translate] duration-hover ease-out focus:translate-y-0 motion-reduce:transition-none">Skip to main content</a>
          <div className={cn('flex h-screen flex-col bg-background', isDashboard && 'min-w-[1280px]')}>
          <DemoBanner />
          <div className="flex min-h-0 flex-1">
            <div className="flex shrink-0 animate-rise" style={rise(0)}>
              <Sidebar activeId={activeId} onNavigate={(id) => navigate(PATHS[id])} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="shrink-0 animate-rise" style={rise(1)}>
                <Header title={active.label} icon={active.icon} actions={isDashboard} registerBar={isDeals || isContacts || isReports || isProjects ? setBarEl : undefined} />
              </div>
              <main id="main" tabIndex={-1} className={cn('outline-none', isNotes || isCalendar ? 'flex min-h-0 flex-1 overflow-hidden bg-surface-subtle p-6 max-lg:p-4' : isDeals || isContacts ? 'flex min-h-0 flex-1 flex-col gap-4 overflow-hidden bg-surface-subtle p-6 transition-[padding] duration-move ease-out motion-reduce:transition-none' : 'flex flex-1 flex-col gap-6 overflow-auto bg-surface-subtle px-6 pb-24 pt-6')} style={isDeals || isContacts ? { paddingBottom: 'calc(1.5rem + var(--toast-inset, 0px))' } : undefined}>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/deals/*" element={<Suspense fallback={<DealsRouteFallback />}><DealsPage headerSlot={barEl} /></Suspense>} />
                  <Route path="/notes/*" element={<Suspense fallback={<NotesRouteFallback />}><NotesPage /></Suspense>} />
                  <Route path="/calendar/*" element={<Suspense fallback={<CalendarRouteFallback />}><CalendarPage /></Suspense>} />
                  <Route path="/reports/*" element={<Suspense fallback={<ReportsSkeleton />}><ReportsPage headerSlot={barEl} /></Suspense>} />
                  <Route path="/projects/*" element={<Suspense fallback={<ProjectsFallback />}><ProjectsPage headerSlot={barEl} /></Suspense>} />
                  <Route path="/companies/*" element={<Suspense fallback={<CompaniesFallback />}><CompaniesPage /></Suspense>} />
                  <Route path="/meetings/*" element={<Suspense fallback={<MeetingsFallback />}><MeetingsPage /></Suspense>} />
                  <Route path="/contacts/*" element={<Suspense fallback={<ContactsRouteFallback />}><ContactsPage headerSlot={barEl} /></Suspense>} />
                  {navItems.filter((n) => !['dashboard', 'deals', 'notes', 'calendar', 'reports', 'projects'].includes(n.id)).map((n) => <Route key={n.id} path={`${PATHS[n.id]}/*`} element={<ComingSoon label={n.label} />} />)}
                </Routes>
              </main>
            </div>
          </div>
          </div>
         </RecordsProvider>
         </DealsProvider>
        </WidgetsProvider>
      </ToastProvider>
    </LoadedProvider>
  )
}

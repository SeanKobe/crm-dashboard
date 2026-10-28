import { DealsSkeleton } from './deals/DealsSkeleton'
import { NoteEditorSkeleton, NoteListSkeleton } from './notes/NotesSkeleton'
import { SkeletonBlock, SkeletonCircle, SkeletonLine } from './ui/Skeleton'

// Shown while a page's code is downloading. Each one mirrors the page's own loading state (same frames and heights),
// so the real page replaces it without a jump.
export function DealsRouteFallback() {
  return (
    <>
      <div className="h-10 shrink-0" aria-hidden />
      <div className="min-h-0 flex-1"><DealsSkeleton view="board" /></div>
    </>
  )
}

export function CalendarRouteFallback() {
  return (
    <div className="flex min-h-0 flex-1 gap-4" role="status" aria-busy="true" aria-label="Loading calendar">
      <aside className="w-60 shrink-0 rounded-lg border border-border bg-surface p-4 max-lg:hidden"><SkeletonBlock className="h-56" /></aside>
      <section className="flex min-w-0 flex-1 flex-col gap-3"><div className="h-10 shrink-0" /><div className="min-h-0 flex-1 rounded-lg border border-border bg-surface"><SkeletonBlock className="m-3 h-10" /></div></section>
    </div>
  )
}

export function NotesRouteFallback() {
  return (
    <div className="flex min-h-0 flex-1 gap-4" role="status" aria-busy="true" aria-label="Loading notes">
      <section className="flex w-85 shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-surface max-lg:w-full max-lg:flex-1"><NoteListSkeleton /></section>
      <section className="min-w-0 flex-1 overflow-hidden rounded-lg border border-border bg-surface max-lg:hidden"><NoteEditorSkeleton /></section>
    </div>
  )
}

export function ContactsRouteFallback() {
  return (
    <>
      <div className="h-[92px] shrink-0" aria-hidden />
      <div className="min-h-0 flex-1" role="status" aria-busy="true" aria-label="Loading contacts">
        <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-card">
          <div className="h-10 shrink-0 bg-surface-subtle shadow-[inset_0_-1px_0_var(--color-border)]" />
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
              <SkeletonBlock className="size-4.5" /><SkeletonCircle className="size-8" /><SkeletonLine className="w-40" /><SkeletonLine className="w-28" /><span className="flex-1" /><SkeletonLine className="w-20" />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// The Reports page's own loading state (also shown while its code downloads), so the page replaces it without a jump.
export function ReportsSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading reports" className="flex flex-col gap-6" data-reports-skeleton>
      <div className="grid grid-cols-3 gap-4 max-xl:grid-cols-2 max-md:grid-cols-1">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex flex-col gap-5 rounded-lg border border-border bg-surface px-[11px] py-4 shadow-card">
            <div className="flex items-center gap-2.5"><SkeletonBlock className="size-9" /><SkeletonLine className="w-28" /></div>
            <div className="flex items-center justify-between"><SkeletonLine className="h-7 w-28" /><SkeletonLine className="w-20" /></div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 max-xl:grid-cols-1">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between"><SkeletonLine className="w-36" /><SkeletonBlock className="h-8 w-28" /></div>
            <SkeletonLine className="h-4 w-3/4" />
            <SkeletonBlock className="h-48" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProjectsFallback() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading projects" className="flex flex-col gap-4">
      <div className="h-10 shrink-0" />
      <div className="grid grid-cols-3 gap-4 max-xl:grid-cols-2 max-lg:grid-cols-1">
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-card"><SkeletonLine className="h-4 w-40" /><SkeletonLine className="h-5 w-48" /><SkeletonLine className="h-2 w-full rounded-full" /></div>)}
      </div>
    </div>
  )
}

// Shown while the stored session (and the person's profile) is read, so signed-in people never see a flash of the login page or an empty app.
// Same frame as the real app: the sidebar, the header, and a page of cards.
export function AppShellSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading your workspace" className="flex h-screen bg-background" data-app-skeleton>
      <aside className="flex w-68.25 shrink-0 flex-col gap-4 border-r border-border bg-sidebar p-4 max-lg:hidden">
        <div className="flex items-center gap-2.5 px-1"><SkeletonCircle className="size-8" /><SkeletonLine className="w-24" /></div>
        <SkeletonBlock className="h-10" />
        <div className="flex flex-col gap-2">{Array.from({ length: 6 }, (_, i) => <SkeletonBlock key={i} className="h-9" />)}</div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-17 shrink-0 items-center justify-between border-b border-border px-6"><SkeletonLine className="h-4 w-28" /><SkeletonBlock className="h-10 w-60" /></div>
        <div className="flex flex-1 flex-col gap-6 bg-surface-subtle p-6">
          <div className="grid grid-cols-4 gap-6 max-xl:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <SkeletonBlock key={i} className="h-30 rounded-lg" />)}</div>
          <SkeletonBlock className="h-72 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

const listFallback = (label: string) => (
  <div className="flex flex-1 flex-col gap-4" role="status" aria-busy="true" aria-label={label}>
    <div className="h-10 shrink-0" aria-hidden />
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-card">
      {Array.from({ length: 8 }, (_, i) => <div key={i} className="flex items-center gap-6"><SkeletonLine className="h-4 w-56" /><SkeletonLine className="ml-auto w-16" /><SkeletonLine className="w-16" /><SkeletonLine className="w-24" /><SkeletonLine className="w-20" /></div>)}
    </div>
  </div>
)
export const CompaniesFallback = () => listFallback('Loading companies')
export const MeetingsFallback = () => listFallback('Loading meetings')

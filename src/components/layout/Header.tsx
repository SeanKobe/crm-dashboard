import { useState } from 'react'
import { CloudUpload, FileSpreadsheet, FileText, FileType2, Share2 } from 'lucide-react'
import { exportFormats } from '../../data/mock'
import { useToast } from '../../context/toastContext'
import { cn } from '../../lib/cn'
import { Button } from '../ui/Button'
import { CrossFade } from '../ui/CrossFade'
import { IconButton } from '../ui/IconButton'
import { Menu } from '../ui/Menu'
import { CustomizePanel } from './CustomizePanel'
import { LastUpdated } from './LastUpdated'
import { NotificationsMenu } from './NotificationsMenu'
import { SearchField } from './SearchField'
import type { ExportFormat, IconComponent, MenuEntry } from '../../types'

const FORMAT_ICON: Record<ExportFormat, IconComponent> = { CSV: FileText, Excel: FileSpreadsheet, PDF: FileType2 }

type Job = 'import' | 'export'

export interface HeaderProps {
  title: string
  icon: IconComponent
  /** Second row with Last updated, Customize, Import and Export (the Dashboard). Off for other pages. */
  actions?: boolean
  /** Other pages can fill the second row: receives its element so the page can portal into it. */
  registerBar?: (el: HTMLDivElement | null) => void
}

export function Header({ title, icon: Icon, actions = true, registerBar }: HeaderProps) {
  const toast = useToast()
  const [busy, setBusy] = useState<Job | null>(null)
  const run = (kind: Job, format: ExportFormat) => {
    setBusy(kind)
    toast({ type: 'info', title: `${kind === 'export' ? 'Exporting' : 'Importing'} ${format}…` })
    setTimeout(() => {
      setBusy(null)
      toast(kind === 'export'
        ? { type: 'success', title: 'Export complete', message: `leads.${format === 'Excel' ? 'xlsx' : format.toLowerCase()} is ready to download.` }
        : { type: 'success', title: 'Import complete', message: `48 leads imported from ${format}.` })
    }, 1400)
  }
  const formatItems = (kind: Job): MenuEntry[] => [{ type: 'label', label: kind === 'export' ? 'Export as' : 'Import from' }, ...exportFormats.map((f) => ({ id: f, label: f, icon: FORMAT_ICON[f], onSelect: () => run(kind, f) }))]
  const share = () => {
    navigator.clipboard?.writeText(window.location.href).catch(() => {})
    toast({ type: 'success', title: 'Link copied', message: 'Anyone with the link can view this dashboard.' })
  }
  const hasBar = registerBar !== undefined
  return (
    <header className="shrink-0 border-b border-border bg-background">
      <div className={cn('flex h-17 items-center justify-between px-6', (actions || hasBar) && 'border-b border-border')}>
        <div className="flex min-w-0 items-center text-base font-medium">
          <CrossFade value={{ title, Icon }} id={title} render={(v) => <span className="flex min-w-0 items-center gap-3"><v.Icon className="size-5 shrink-0" strokeWidth={1.75} /><h1 className="truncate text-base font-medium">{v.title}</h1></span>} />
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <SearchField />
          <span className="h-7 w-px bg-border" />
          <NotificationsMenu kind="notifications" />
          <NotificationsMenu kind="messages" badge="121" />
          <IconButton icon={Share2} label="Share" size="lg" lift onClick={share} />
        </div>
      </div>
      {actions ? (
        <div className="flex h-18.25 items-center justify-between px-6">
          <LastUpdated />
          <div className="flex items-center gap-3">
            <CustomizePanel />
            <Menu align="end" label="Import" items={formatItems('import')} trigger={({ props }) => <Button icon={CloudUpload} chevron state={busy === 'import' ? 'loading' : 'default'} menuProps={props}>Imports</Button>} />
            <Menu align="end" label="Export" items={formatItems('export')} trigger={({ props }) => <Button variant="primary" icon={CloudUpload} chevron state={busy === 'export' ? 'loading' : 'default'} menuProps={props}>Exports</Button>} />
          </div>
        </div>
      ) : hasBar ? (
        <div ref={registerBar} className="flex h-18.25 items-center justify-between gap-6 px-6" />
      ) : null}
    </header>
  )
}

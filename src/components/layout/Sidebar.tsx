import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ChevronsLeft, ChevronsRight, Headphones, Settings } from 'lucide-react'
import { useNavigate } from 'react-router'
import { accounts, brand, navItems } from '../../data/mock'
import { useAuth } from '../../context/authContext'
import { cn } from '../../lib/cn'
import { Collapse } from '../ui/Collapse'
import { Tag } from '../ui/Tag'
import { IconButton } from '../ui/IconButton'
import { Tooltip } from '../ui/Tooltip'
import { Logo } from '../ui/Logo'
import { NavItem } from '../ui/NavItem'
import { AccountSwitcher } from './AccountSwitcher'
import { FavoritesGroup, ProjectsGroup } from './SidebarGroups'
import { StorageCard } from './StorageCard'
import type { NavId } from '../../types'

// Collapses to the Figma "Sidebar / Collapsed" layout (72px: logo mark, avatar, nav icons, footer icons).
export interface SidebarProps {
  /** Null on pages that are not in the main nav (Contacts, opened from Favorites). */
  activeId: NavId | null
  onNavigate: (id: NavId) => void
}

export function Sidebar({ activeId, onNavigate }: SidebarProps) {
  const auth = useAuth()
  const navigate = useNavigate()
  const identity = !auth.demo && auth.profile ? { email: auth.profile.email || auth.user?.email || '', name: auth.profile.fullName, role: auth.profile.role, tone: auth.profile.avatarColor } : null
  const signOut = () => { void auth.signOut().then(() => navigate('/login', { replace: true })) }
  const [accountId, setAccountId] = useState(accounts[0].id)
  const [collapsed, setCollapsed] = useState(false)
  const itemRefs = useRef<Partial<Record<NavId, HTMLButtonElement | null>>>({})
  const [barY, setBarY] = useState<number | null>(null)

  // Cmd/Ctrl+B toggles the sidebar in both states
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        setCollapsed((c) => !c)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // the active purple bar glides to the selected item
  useLayoutEffect(() => {
    const el = activeId ? itemRefs.current[activeId] : null
    if (el) setBarY(el.offsetTop + 6)
  }, [activeId])

  return (
    <aside className={cn('flex shrink-0 flex-col overflow-hidden border-r border-border bg-sidebar transition-[width] duration-move ease-out motion-reduce:transition-none', collapsed ? 'w-18.25' : 'w-68.25')}>
      {/* Figma: Expanded is a 67px block; Collapsed is 116px: logo mark, 16px, the Expand Sidebar IconButton, 16px. */}
      <div className={cn('relative shrink-0 overflow-hidden transition-[height] duration-move ease-out motion-reduce:transition-none', collapsed ? 'h-29' : 'h-16.75')}>
        <div className={cn('flex items-center transition-[padding,height] duration-move ease-out motion-reduce:transition-none', collapsed ? 'h-16 justify-center px-0' : 'h-16.75 justify-between px-5')}>
          <Logo title={brand.title} subtitle={brand.subtitle} collapsed={collapsed} />
          <button
            type="button"
            aria-label="Collapse sidebar"
            aria-expanded={!collapsed}
            tabIndex={collapsed ? -1 : 0}
            onClick={() => setCollapsed(true)}
            className={cn('rounded-md text-text-secondary outline-none transition-[opacity,max-width,transform,translate,scale,color] duration-move ease-out hover:text-text-primary active:scale-[0.97] focus-ring', collapsed ? 'pointer-events-none max-w-0 opacity-0' : 'max-w-6 opacity-100')}
          >
            <ChevronsLeft className="size-5" strokeWidth={1.75} />
          </button>
        </div>
        <div inert={!collapsed} className={cn('absolute inset-x-0 top-16 flex justify-center transition-opacity duration-move ease-out motion-reduce:transition-none', collapsed ? 'opacity-100' : 'pointer-events-none opacity-0')}>
          <Tooltip content="Expand sidebar (Cmd+B)" side="right">
            {(tip) => (
              <span {...tip} className="inline-flex">
                <IconButton icon={ChevronsRight} label="Expand sidebar" onClick={() => setCollapsed(false)} />
              </span>
            )}
          </Tooltip>
        </div>
      </div>
      <div aria-hidden className={cn('h-px shrink-0 bg-border transition-[margin] duration-move ease-out motion-reduce:transition-none', collapsed ? 'mx-3' : 'mx-0')} />
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4">
        <AccountSwitcher accounts={accounts} value={accountId} onChange={setAccountId} collapsed={collapsed} identity={identity} onSignOut={signOut} />
        <nav className="relative flex flex-col gap-1" aria-label="Main">
          {barY !== null && activeId !== null && <span aria-hidden className={cn('absolute top-0 h-6 w-[3px] rounded-xs bg-primary transition-[transform,translate,scale,left] duration-move ease-out motion-reduce:transition-none', collapsed ? '-left-3' : '-left-4')} style={{ transform: `translateY(${barY}px)` }} />}
          {navItems.map((item) => (
            <NavItem key={item.id} itemRef={(el) => { itemRefs.current[item.id] = el }} icon={item.icon} label={item.label} state={item.id === activeId ? 'active' : 'default'} collapsed={collapsed} onClick={() => onNavigate(item.id)} />
          ))}
        </nav>
        <Collapse open={!collapsed}>
          <div className="flex flex-col gap-4">
            <div className="h-px bg-border" />
            <FavoritesGroup />
            <ProjectsGroup />
          </div>
        </Collapse>
        <div className="flex-1" />
        <Collapse open={!collapsed}><StorageCard /></Collapse>
        <div className={cn('h-px bg-border transition-[margin] duration-move ease-out motion-reduce:transition-none', collapsed && '-mx-1')} />
        <div className="flex flex-col gap-1">
          <NavItem icon={Settings} label="Settings" trailing collapsed={collapsed} />
          <NavItem icon={Headphones} label="Help Center" trailing collapsed={collapsed} />
          {auth.demo && (
            <Collapse open={!collapsed}>
              <div className="px-3 pt-1"><Tag tone="warning" className="w-fit"><span data-demo-tag title="No login: your data stays in this browser">Demo mode</span></Tag></div>
            </Collapse>
          )}
        </div>
      </div>
    </aside>
  )
}

import { ChevronsUpDown, LogOut, Settings } from 'lucide-react'
import { cn } from '../../lib/cn'
import { ROLE_LABEL } from '../../lib/roles'
import { Avatar } from '../ui/Avatar'
import { Badge, type BadgeTone } from '../ui/Badge'
import { Menu } from '../ui/Menu'
import { useToast } from '../../context/toastContext'
import type { Account, MenuEntry, Tone, UserRole } from '../../types'

/** The signed-in person (real sign-in). Without it the switcher keeps its demo behaviour: pick one of the demo accounts. */
export interface AccountIdentity {
  email: string
  name: string
  role: UserRole
  tone: Tone
}
// The role is always written out; the tint only helps tell the three apart at a glance.
const ROLE_TONE: Record<UserRole, BadgeTone> = { admin: 'primary', manager: 'success', sales_rep: 'neutral' }

// Figma "Account Switcher": Default, Hover, Open (primary ring + menu below), Focus.
export interface AccountSwitcherProps {
  accounts: Account[]
  /** The selected account's id. */
  value: string
  onChange: (id: string) => void
  collapsed?: boolean
  identity?: AccountIdentity | null
  onSignOut?: () => void
}

export function AccountSwitcher({ accounts, value, onChange, collapsed = false, identity = null, onSignOut }: AccountSwitcherProps) {
  const demoAccount = accounts.find((a) => a.id === value) ?? accounts[0]
  const current = identity ? { id: 'me', email: identity.email, tone: identity.tone } : demoAccount
  const initial = (identity?.name || current.email)[0].toUpperCase()
  const toast = useToast()
  const items: MenuEntry[] = identity ? [
    { type: 'label', label: identity.name },
    { id: 'me', label: identity.email, avatar: { initial, tone: identity.tone }, checked: true, hint: ROLE_LABEL[identity.role] },
    { type: 'separator' },
    { id: 'signout', label: 'Sign out', icon: LogOut, danger: true, onSelect: () => onSignOut?.() },
  ] : [
    ...accounts.map((a) => ({ id: a.id, label: a.email, avatar: { initial: a.email[0].toUpperCase(), tone: a.tone }, checked: a.id === current.id, onSelect: () => onChange(a.id) })),
    { type: 'separator' },
    { id: 'manage', label: 'Manage accounts', icon: Settings, onSelect: () => toast({ type: 'info', title: 'Manage accounts', message: 'Account settings are not part of this demo yet.' }) },
  ]
  return (
    <Menu
      label={identity ? 'Account' : 'Switch account'}
      matchWidth
      focusSelected
      items={items}
      trigger={({ open, props }) => (
        <button
          {...props}
          type="button"
          aria-label={identity ? `Account: ${identity.name}, ${current.email}, ${ROLE_LABEL[identity.role]}` : `Account: ${current.email}`}
          className={cn(
            'flex w-full items-center rounded-lg bg-surface-muted text-left outline-none transition-[background-color,padding,gap,height] duration-hover ease-out motion-reduce:transition-none focus-ring',
            collapsed ? 'h-8 justify-center gap-0 px-0' : 'h-10 gap-2.5 px-3',
            'hover:bg-border',
            open && 'ring-[1.5px] ring-primary',
          )}
        >
          <Avatar initial={initial} tone={current.tone} size={collapsed ? 'LG' : 'L'} />
          <span className={cn('min-w-0 truncate text-xs transition-[opacity,max-width,flex-grow] duration-move ease-out motion-reduce:transition-none', collapsed ? 'max-w-0 flex-none opacity-0' : 'max-w-60 flex-1 opacity-100')}>{current.email}</span>
          {identity && !collapsed && <span data-role-badge className="shrink-0"><Badge tone={ROLE_TONE[identity.role]}>{ROLE_LABEL[identity.role]}</Badge></span>}
          <ChevronsUpDown className={cn('size-4 shrink-0 text-text-secondary transition-[opacity,width] duration-move ease-out', collapsed && 'w-0 opacity-0')} strokeWidth={1.75} />
        </button>
      )}
    />
  )
}

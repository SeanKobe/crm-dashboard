import { Info, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../../context/authContext'
import { useToast } from '../../context/toastContext'
import { isDemoAccount } from '../../lib/demo'
import { demoService } from '../../services/demo'
import { ConfirmModal } from '../ui/ConfirmModal'
import { IconButton } from '../ui/IconButton'
import { Spinner } from '../ui/Spinner'

// A slim notice for the three demo accounts: the data is sample data and can be reset. Dismissing it lasts for the browser session.
const DISMISS_KEY = 'crm.demo-banner.dismissed'
const RESET_KEY = 'crm.demo-banner.reset'
const read = (key: string): string | null => { try { return sessionStorage.getItem(key) } catch { return null } }
const write = (key: string, value: string | null): void => { try { if (value === null) sessionStorage.removeItem(key); else sessionStorage.setItem(key, value) } catch { /* private mode: fine */ } }
const action = 'rounded-md px-2.5 py-1 text-compact font-medium outline-none transition-colors duration-hover ease-out focus-ring motion-reduce:transition-none'

export function DemoBanner() {
  const { profile, signOut, refreshData } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(() => read(DISMISS_KEY) === '1')
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  // The reset remounts the app (so every page loads fresh data); the confirmation toast is shown by the new copy.
  useEffect(() => {
    if (read(RESET_KEY) !== '1') return
    write(RESET_KEY, null)
    toast({ type: 'success', title: 'Demo data reset', message: 'The sample data is back to how it started.' })
  }, [toast])

  if (!isDemoAccount(profile?.email) || dismissed) return null

  const reset = async () => {
    setConfirm(false)
    setBusy(true)
    try {
      await demoService.reset()
      write(RESET_KEY, '1')
      await refreshData()
    } catch (e) {
      toast({ type: 'error', title: 'Couldn’t reset the demo data', message: e instanceof Error ? e.message : 'Try again in a moment.' })
    } finally {
      setBusy(false)
    }
  }
  const leave = () => { void signOut().then(() => navigate('/login', { replace: true })) }

  return (
    <div role="region" aria-label="Demo notice" data-demo-banner className="flex min-h-10 shrink-0 animate-fade-in items-center gap-3 border-b border-border bg-primary-soft px-6 py-1 text-compact text-text-primary motion-reduce:animate-none max-sm:px-4">
      <Info aria-hidden className="size-5 shrink-0 text-primary" strokeWidth={1.75} />
      <p className="min-w-0 flex-1 leading-4">You’re exploring a demo with sample data. Changes may be reset.</p>
      <button type="button" disabled={busy} onClick={() => setConfirm(true)} aria-busy={busy || undefined} className={`${action} flex items-center gap-1.5 border border-border bg-surface shadow-button hover:border-border-strong hover:bg-surface-subtle disabled:pointer-events-none disabled:opacity-60`}>
        {busy && <Spinner size="S" tone="neutral" />}{busy ? 'Resetting…' : 'Reset demo data'}
      </button>
      <button type="button" onClick={leave} className={`${action} text-primary underline underline-offset-2 hover:bg-primary/10`}>Sign out</button>
      <IconButton icon={X} label="Dismiss demo notice" size="xs" onClick={() => { write(DISMISS_KEY, '1'); setDismissed(true) }} />
      <ConfirmModal open={confirm} title="Reset the demo data?" message="Everything you added or changed in the demo goes back to the original sample data. This can’t be undone." confirmLabel="Reset demo data" onConfirm={() => { void reset() }} onCancel={() => setConfirm(false)} />
    </div>
  )
}

import { useState } from 'react'
import { useAuth } from '../../context/authContext'
import { DEMO_ACCOUNTS, demoLoginEnabled, demoPassword, type DemoAccount } from '../../lib/demo'
import { Button } from '../ui/Button'

// "Try the demo" on the sign-in page: one click signs in as the Admin, Manager or Sales rep demo account. Success is handled by the route
// guard like any other sign-in. Hidden when VITE_DEMO_PASSWORD is not set.
const FRIENDLY: Record<string, string> = {
  'invalid-credentials': 'The demo accounts aren’t set up on this project yet, or the demo password is out of date. Sign in with your own account instead.',
}

export function DemoSignIn() {
  const { signIn } = useAuth()
  const [busy, setBusy] = useState<DemoAccount | null>(null)
  const [error, setError] = useState<string | null>(null)
  if (!demoLoginEnabled) return null

  const explore = async (account: DemoAccount) => {
    if (busy) return
    setBusy(account)
    setError(null)
    const r = await signIn(account.email, demoPassword)
    // On success the guard leaves this page; only a failure needs the buttons back.
    if (!r.ok) {
      setError(FRIENDLY[r.error?.code ?? ''] ?? r.error?.message ?? 'The demo couldn’t start. Try again in a moment.')
      setBusy(null)
    }
  }

  return (
    <section aria-labelledby="demo-title" data-demo-signin className="flex flex-col gap-3 border-t border-border pt-6">
      <h2 id="demo-title" className="text-base font-medium leading-5">Try the demo</h2>
      {error && <p role="alert" data-demo-error className="rounded-md border border-danger/40 bg-danger/8 px-3 py-2 text-sm leading-4.25 text-danger-strong">{error}</p>}
      <div role="group" aria-labelledby="demo-title" className="flex flex-col gap-2">
        {DEMO_ACCOUNTS.map((a) => (
          <Button key={a.role} fullWidth state={busy === a ? 'loading' : busy ? 'disabled' : 'default'} onClick={() => { void explore(a) }}>
            {busy === a ? `Opening the demo as ${a.label}…` : `Explore as ${a.label}`}
          </Button>
        ))}
      </div>
      <p role="status" className="sr-only">{busy ? `Signing in as ${busy.label}` : ''}</p>
      <p className="text-compact leading-4 text-text-secondary">Each role sees different data: the Admin sees everything, the Manager the whole team, and the Sales rep only their own records.</p>
    </section>
  )
}

import { CircleCheck } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../../context/authContext'
import { MIN_PASSWORD, validateConfirm, validateNewPassword } from '../../lib/authValidation'
import { AppShellSkeleton } from '../RouteFallbacks'
import { Button } from '../ui/Button'
import { AuthField } from './AuthField'
import { AuthLayout } from './AuthLayout'
import { useAuthForm } from './authForm'

// /reset-password: where the link in the reset email lands. The link signs the person in, so this page needs a session.
const linkClass = 'rounded-xs font-medium text-primary underline underline-offset-2 outline-none focus-ring'

export function ResetPasswordPage() {
  const { user, loading, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const passwordRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)
  const errors = { password: validateNewPassword(password), confirm: validateConfirm(password, confirm) }
  const form = useAuthForm(errors, ['password', 'confirm'], { password: passwordRef, confirm: confirmRef }, { password, confirm })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void form.submit(async () => {
      setServerError(null)
      const r = await updatePassword(password)
      if (r.ok) setDone(true)
      else setServerError(r.error?.message ?? 'Something went wrong. Try again in a moment.')
    })
  }

  if (loading) return <AppShellSkeleton />
  if (!user) {
    return (
      <AuthLayout title="This link has expired" subtitle="Reset links work once and for a short time." footer={<Link to="/login" className={linkClass}>Back to sign in</Link>}>
        <Link to="/forgot-password" className={`${linkClass} w-fit`}>Request a new reset link</Link>
      </AuthLayout>
    )
  }
  if (done) {
    return (
      <AuthLayout title="Password updated" subtitle="You’re signed in with your new password.">
        <div role="status" data-auth-success className="flex items-start gap-3 rounded-md bg-primary-soft p-4 text-sm leading-4.25">
          <CircleCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={1.75} />
          <p>Use it the next time you sign in.</p>
        </div>
        <Button variant="primary" fullWidth onClick={() => navigate('/', { replace: true })}>Open the dashboard</Button>
      </AuthLayout>
    )
  }
  return (
    <AuthLayout title="Choose a new password" subtitle={`Pick something with at least ${MIN_PASSWORD} characters.`}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4" aria-busy={form.busy || undefined}>
        {serverError && <p role="alert" data-auth-error className="rounded-md border border-danger/40 bg-danger/8 px-3 py-2 text-sm leading-4.25 text-danger-strong">{serverError}</p>}
        <AuthField label="New password" name="password" type="password" autoComplete="new-password" value={password} onChange={setPassword} onBlur={form.blur('password')} error={form.shown('password')} inputRef={passwordRef} autoFocus />
        <AuthField label="Confirm new password" name="confirm" type="password" autoComplete="new-password" value={confirm} onChange={setConfirm} onBlur={form.blur('confirm')} error={form.shown('confirm')} inputRef={confirmRef} />
        <Button variant="primary" submit fullWidth state={form.busy ? 'loading' : 'default'}>{form.busy ? 'Saving…' : 'Save new password'}</Button>
      </form>
    </AuthLayout>
  )
}

import { MailCheck } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../../context/authContext'
import { validateEmail } from '../../lib/authValidation'
import { Button } from '../ui/Button'
import { AuthField } from './AuthField'
import { AuthLayout } from './AuthLayout'
import { useAuthForm } from './authForm'

// /forgot-password. The confirmation reads the same whether or not an account exists, so the screen can't be used to find out who has one.
const linkClass = 'rounded-xs font-medium text-primary underline underline-offset-2 outline-none focus-ring'

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const errors = { email: validateEmail(email) }
  const form = useAuthForm(errors, ['email'], { email: emailRef }, { email })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void form.submit(async () => {
      setServerError(null)
      const r = await resetPassword(email)
      if (r.ok) setSentTo(email.trim())
      else setServerError(r.error?.message ?? 'Something went wrong. Try again in a moment.')
    })
  }

  if (sentTo) {
    return (
      <AuthLayout title="Check your email" subtitle="If there is an account for that address, a reset link is on its way." footer={<Link to="/login" className={linkClass}>Back to sign in</Link>}>
        <div role="status" data-auth-success className="flex items-start gap-3 rounded-md bg-primary-soft p-4 text-sm leading-4.25">
          <MailCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={1.75} />
          <p>We sent a link to <span className="font-medium">{sentTo}</span>. It works for one hour. Check your spam folder if you can’t find it.</p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Reset your password" subtitle="Enter your email and we’ll send you a link to choose a new password." footer={<>Remembered it? <Link to="/login" className={linkClass}>Back to sign in</Link></>}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4" aria-busy={form.busy || undefined}>
        {serverError && <p role="alert" data-auth-error className="rounded-md border border-danger/40 bg-danger/8 px-3 py-2 text-sm leading-4.25 text-danger-strong">{serverError}</p>}
        <AuthField label="Email" name="email" type="email" autoComplete="email" value={email} onChange={(v) => { setEmail(v); setServerError(null) }} onBlur={form.blur('email')} error={form.shown('email')} inputRef={emailRef} autoFocus placeholder="name@company.com" />
        <Button variant="primary" submit fullWidth state={form.busy ? 'loading' : 'default'}>{form.busy ? 'Sending…' : 'Send reset link'}</Button>
      </form>
    </AuthLayout>
  )
}

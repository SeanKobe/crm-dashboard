import { MailCheck } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAuth } from '../../context/authContext'
import { MIN_PASSWORD, validateEmail, validateFullName, validateNewPassword } from '../../lib/authValidation'
import { Button } from '../ui/Button'
import { AuthField } from './AuthField'
import { AuthLayout } from './AuthLayout'
import { useAuthForm } from './authForm'

// /signup. New accounts are always sales reps (the database decides, not this form). When the project asks for email confirmation the
// person sees a "check your email" panel; otherwise the route guard signs them straight in.
const linkClass = 'rounded-xs font-medium text-primary underline underline-offset-2 outline-none focus-ring'

export function SignUpPage() {
  const { signUp } = useAuth()
  const [params] = useSearchParams()
  const next = params.get('next')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const errors = { fullName: validateFullName(fullName), email: validateEmail(email), password: validateNewPassword(password) }
  const form = useAuthForm(errors, ['fullName', 'email', 'password'], { fullName: nameRef, email: emailRef, password: passwordRef }, { fullName, email, password })
  const qs = next ? `?next=${encodeURIComponent(next)}` : ''

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void form.submit(async () => {
      setServerError(null)
      const r = await signUp(email, password, fullName)
      if (r.ok && r.needsConfirmation) { setConfirmEmail(email.trim()); return }
      if (!r.ok) {
        setServerError(r.error?.message ?? 'Something went wrong. Try again in a moment.')
        if (r.error?.code === 'email-taken' || r.error?.code === 'invalid-email') emailRef.current?.focus()
        else if (r.error?.code === 'weak-password') passwordRef.current?.focus()
      }
    })
  }

  if (confirmEmail) {
    return (
      <AuthLayout title="Check your email" subtitle="One more step before you can sign in." footer={<Link to={`/login${qs}`} className={linkClass}>Back to sign in</Link>}>
        <div role="status" data-auth-success className="flex items-start gap-3 rounded-md bg-primary-soft p-4 text-sm leading-4.25">
          <MailCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" strokeWidth={1.75} />
          <p>We sent a confirmation link to <span className="font-medium">{confirmEmail}</span>. Open it to finish creating your account, then sign in.</p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Create your account" subtitle="It takes a minute. You’ll start as a sales rep." footer={<>Already have an account? <Link to={`/login${qs}`} className={linkClass}>Sign in</Link></>}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4" aria-busy={form.busy || undefined}>
        {serverError && <p role="alert" data-auth-error className="rounded-md border border-danger/40 bg-danger/8 px-3 py-2 text-sm leading-4.25 text-danger-strong">{serverError}</p>}
        <AuthField label="Full name" name="name" autoComplete="name" value={fullName} onChange={setFullName} onBlur={form.blur('fullName')} error={form.shown('fullName')} inputRef={nameRef} autoFocus />
        <AuthField label="Email" name="email" type="email" autoComplete="email" value={email} onChange={(v) => { setEmail(v); setServerError(null) }} onBlur={form.blur('email')} error={form.shown('email')} inputRef={emailRef} placeholder="name@company.com" />
        <AuthField label="Password" name="password" type="password" autoComplete="new-password" value={password} onChange={setPassword} onBlur={form.blur('password')} error={form.shown('password')} helper={`Use at least ${MIN_PASSWORD} characters.`} inputRef={passwordRef} />
        <Button variant="primary" submit fullWidth state={form.busy ? 'loading' : 'default'}>{form.busy ? 'Creating account…' : 'Create account'}</Button>
      </form>
    </AuthLayout>
  )
}

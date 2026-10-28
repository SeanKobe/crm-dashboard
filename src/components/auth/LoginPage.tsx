import { useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAuth } from '../../context/authContext'
import { validateEmail, validateLoginPassword } from '../../lib/authValidation'
import { Button } from '../ui/Button'
import { AuthField } from './AuthField'
import { AuthLayout } from './AuthLayout'
import { useAuthForm } from './authForm'

// /login. Success is handled by the route guard: once the session is set it sends the person to the page they asked for (?next=) or the Dashboard.
const linkClass = 'rounded-xs font-medium text-primary underline underline-offset-2 outline-none focus-ring'

export function LoginPage() {
  const { signIn } = useAuth()
  const [params] = useSearchParams()
  const next = params.get('next')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [serverError, setServerError] = useState<string | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const errors = { email: validateEmail(email), password: validateLoginPassword(password) }
  const form = useAuthForm(errors, ['email', 'password'], { email: emailRef, password: passwordRef }, { email, password })
  const qs = next ? `?next=${encodeURIComponent(next)}` : ''

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void form.submit(async () => {
      setServerError(null)
      const r = await signIn(email, password)
      if (!r.ok) {
        setServerError(r.error?.message ?? 'Something went wrong. Try again in a moment.')
        if (r.error?.code === 'invalid-credentials') { passwordRef.current?.focus(); passwordRef.current?.select() }
      }
    })
  }

  return (
    <AuthLayout title="Sign in" subtitle="Welcome back. Enter your details to open your CRM." footer={<>New here? <Link to={`/signup${qs}`} className={linkClass}>Create an account</Link></>}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4" aria-busy={form.busy || undefined}>
        {serverError && <p role="alert" data-auth-error className="rounded-md border border-danger/40 bg-danger/8 px-3 py-2 text-sm leading-4.25 text-danger-strong">{serverError}</p>}
        <AuthField label="Email" name="email" type="email" autoComplete="email" value={email} onChange={(v) => { setEmail(v); setServerError(null) }} onBlur={form.blur('email')} error={form.shown('email')} inputRef={emailRef} autoFocus placeholder="name@company.com" />
        <div className="flex flex-col gap-2">
          <AuthField label="Password" name="password" type="password" autoComplete="current-password" value={password} onChange={(v) => { setPassword(v); setServerError(null) }} onBlur={form.blur('password')} error={form.shown('password')} inputRef={passwordRef} />
          <Link to={`/forgot-password${qs}`} className={`${linkClass} w-fit text-compact`}>Forgot password?</Link>
        </div>
        <Button variant="primary" submit fullWidth state={form.busy ? 'loading' : 'default'}>{form.busy ? 'Signing in…' : 'Sign in'}</Button>
      </form>
    </AuthLayout>
  )
}

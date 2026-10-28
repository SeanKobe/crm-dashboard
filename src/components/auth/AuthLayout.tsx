import type { ReactNode } from 'react'
import { brand } from '../../data/mock'
import { Logo } from '../ui/Logo'

// The frame around the sign-in screens: the logo, one centred card on the app's page background, and a line of links under it.
export interface AuthLayoutProps {
  title: string
  subtitle: string
  children: ReactNode
  /** Links to the other sign-in screens ("New here? Create an account"). */
  footer?: ReactNode
}

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <main id="main" className="flex min-h-screen flex-col items-center justify-center gap-6 bg-surface-subtle px-4 py-10">
      <div className="animate-rise motion-reduce:animate-none"><Logo title={brand.title} subtitle={brand.subtitle} /></div>
      <section aria-labelledby="auth-title" className="flex w-full max-w-105 animate-rise flex-col gap-6 rounded-lg border border-border bg-surface p-8 shadow-card motion-reduce:animate-none max-sm:p-6">
        <header className="flex flex-col gap-1.5">
          <h1 id="auth-title" className="text-lg font-medium leading-6">{title}</h1>
          <p className="text-sm leading-4.25 text-text-secondary">{subtitle}</p>
        </header>
        {children}
      </section>
      {footer && <p className="text-center text-sm text-text-secondary">{footer}</p>}
    </main>
  )
}

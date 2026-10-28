import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import App from './App'
import { GuestOnly, RequireAuth } from './components/auth/guards'
import { AppShellSkeleton } from './components/RouteFallbacks'

// The top of the router: the sign-in screens are public, everything else sits behind the route guard. In demo mode (no Supabase
// variables) the guard lets everything through and the sign-in screens redirect to the Dashboard.
const load = () => import('./components/auth/AuthPages')
const LoginPage = lazy(() => load().then((m) => ({ default: m.LoginPage })))
const SignUpPage = lazy(() => load().then((m) => ({ default: m.SignUpPage })))
const ForgotPasswordPage = lazy(() => load().then((m) => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => load().then((m) => ({ default: m.ResetPasswordPage })))

export default function Root() {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <Routes>
        <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
        <Route path="/signup" element={<GuestOnly><SignUpPage /></GuestOnly>} />
        <Route path="/forgot-password" element={<GuestOnly><ForgotPasswordPage /></GuestOnly>} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<RequireAuth><App /></RequireAuth>} />
      </Routes>
    </Suspense>
  )
}

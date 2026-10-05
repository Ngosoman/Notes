import { AlertCircle } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'

export default function ProtectedRoute() {
  const { user, isLoading, isConfigured, sessionError } = useAuth()
  const location = useLocation()

  if (!isConfigured) {
    return (
      <section className="auth-config-state" role="alert">
        <AlertCircle size={22} aria-hidden="true" />
        <h1>Connect Supabase to continue</h1>
        <p>Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your local environment, then restart the development server.</p>
      </section>
    )
  }

  if (isLoading) {
    return <div className="auth-loading" role="status">Checking your session…</div>
  }

  if (sessionError) {
    return <section className="auth-config-state" role="alert"><AlertCircle size={22} aria-hidden="true" /><h1>We couldn’t check your session.</h1><p>Check your connection and refresh the page to try again.</p></section>
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  }

  return <Outlet />
}
import AuthLayout from '../Components/Auth/AuthLayout.jsx'
import { LoginForm } from '../Components/Auth/AuthForms.jsx'
import { useAuth } from '../hooks/useAuth.js'
import { Navigate, Link } from 'react-router-dom'
import '../Components/Auth/Auth.css'

export default function Login() {
  const { user, isLoading, sessionError } = useAuth()
  if (isLoading) return <div className="auth-loading" role="status">Checking your session…</div>
  if (sessionError) return <div className="auth-config-state" role="alert"><h1>We couldn’t check your session.</h1><p>Check your connection and refresh the page to try again.</p></div>
  if (user) return <Navigate to="/dashboard" replace />

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Pick up where you left off."
      description="Log in to return to your documents and study workspace."
      footer={<>New to AeroNotes AI? <Link to="/register">Create an account</Link></>}
    >
      <LoginForm />
    </AuthLayout>
  )
}
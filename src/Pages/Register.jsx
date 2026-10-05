import { Navigate, Link } from 'react-router-dom'
import AuthLayout from '../Components/Auth/AuthLayout.jsx'
import RegisterForm from '../Components/Auth/RegisterForm.jsx'
import { useAuth } from '../hooks/useAuth.js'
import '../Components/Auth/Auth.css'

export default function Register() {
  const { user, isLoading, sessionError } = useAuth()
  if (isLoading) return <div className="auth-loading" role="status">Checking your session…</div>
  if (sessionError) return <div className="auth-config-state" role="alert"><h1>We couldn’t check your session.</h1><p>Check your connection and refresh the page to try again.</p></div>
  if (user) return <Navigate to="/dashboard" replace />

  return (
    <AuthLayout
      eyebrow="A better way to revise"
      title="Create your study space."
      description="Start organizing your engineering material around the way you learn."
      footer={<>Already have an account? <Link to="/login">Log in</Link></>}
    >
      <RegisterForm />
    </AuthLayout>
  )
}
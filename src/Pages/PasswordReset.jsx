import { Link } from 'react-router-dom'
import AuthLayout from '../Components/Auth/AuthLayout.jsx'
import { PasswordResetForm } from '../Components/Auth/AuthForms.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import '../Components/Auth/Auth.css'

export default function PasswordReset() {
  const { user, isLoading, sessionError } = useAuth()
  if (isLoading) return <div className="auth-loading" role="status">Checking your session…</div>
  if (sessionError) return <div className="auth-config-state" role="alert"><h1>We couldn’t check your session.</h1><p>Check your connection and refresh the page to try again.</p></div>

  const isRecovery = Boolean(user)
  return (
    <AuthLayout
      eyebrow={isRecovery ? 'Secure your account' : 'Account recovery'}
      title={isRecovery ? 'Choose a new password.' : 'Reset your password.'}
      description={isRecovery ? 'Choose a new password for your AeroNotes AI account.' : 'Enter your account email and we’ll send a password reset link if it matches an account.'}
      footer={!isRecovery && <>Remembered it? <Link to="/login">Back to log in</Link></>}
    >
      <PasswordResetForm />
    </AuthLayout>
  )
}
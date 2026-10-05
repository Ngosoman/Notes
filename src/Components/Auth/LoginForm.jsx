import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { signInWithPassword } from '../../services/authService.js'
import { AuthInput, friendlyAuthError, SubmitButton } from './AuthFormControls.jsx'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { isConfigured } = useAuth()
  const redirectPath = location.state?.from
  const destination = typeof redirectPath === 'string' && redirectPath.startsWith('/') && !redirectPath.startsWith('//')
    ? redirectPath
    : '/dashboard'

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')
    setIsBusy(true)
    try {
      await signInWithPassword(email, password)
      navigate(destination, { replace: true })
    } catch (error) {
      setErrorMessage(isConfigured ? friendlyAuthError(error, 'log in') : 'Supabase is not configured. Add your project URL and public key to .env.')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {errorMessage && <p className="auth-message auth-message-error" role="alert">{errorMessage}</p>}
      <AuthInput id="login-email" label="Email address" type="email" name="email" autoComplete="email" inputMode="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      <AuthInput id="login-password" label="Password" type="password" name="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
      <div className="auth-form-aux"><Link to="/reset-password">Forgot password?</Link></div>
      <SubmitButton isBusy={isBusy}>Log in</SubmitButton>
    </form>
  )
}
import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { signUpWithPassword } from '../../services/authService.js'
import { AuthInput, SubmitButton } from './AuthFormControls.jsx'
import { friendlyAuthError } from '../../utils/authErrors.js'

export default function RegisterForm() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const navigate = useNavigate()
  const { isConfigured } = useAuth()

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    if (password.length < 8) {
      setErrorMessage('Use a password with at least 8 characters.')
      return
    }
    if (password !== confirmation) {
      setErrorMessage('Your passwords do not match.')
      return
    }

    setIsBusy(true)
    try {
      const { session } = await signUpWithPassword({ fullName, email, password })
      if (session) navigate('/dashboard', { replace: true })
      else setSuccessMessage('Check your inbox for a confirmation link to finish creating your account.')
    } catch (error) {
      setErrorMessage(isConfigured ? friendlyAuthError(error, 'create your account') : 'Supabase is not configured. Add your project URL and public key to .env.')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {errorMessage && <p className="auth-message auth-message-error" role="alert">{errorMessage}</p>}
      {successMessage && <p className="auth-message auth-message-success" role="status"><CheckCircle2 size={17} aria-hidden="true" />{successMessage}</p>}
      <AuthInput id="register-name" label="Full name" type="text" name="name" autoComplete="name" required maxLength={100} value={fullName} onChange={(event) => setFullName(event.target.value)} />
      <AuthInput id="register-email" label="Email address" type="email" name="email" autoComplete="email" inputMode="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      <AuthInput id="register-password" label="Password" type="password" name="new-password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
      <AuthInput id="register-confirmation" label="Confirm password" type="password" name="password-confirmation" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
      <p className="auth-field-hint">Use at least 8 characters.</p>
      <SubmitButton isBusy={isBusy}>Create account</SubmitButton>
    </form>
  )
}
import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { requestPasswordReset, updatePassword } from '../../services/authService.js'
import { AuthInput, SubmitButton } from './AuthFormControls.jsx'
import { friendlyAuthError } from '../../utils/authErrors.js'

export default function PasswordResetForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()
  const isRecovery = Boolean(user)

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    if (isRecovery && password.length < 8) {
      setErrorMessage('Use a password with at least 8 characters.')
      return
    }
    if (isRecovery && password !== confirmation) {
      setErrorMessage('Your passwords do not match.')
      return
    }

    setIsBusy(true)
    try {
      if (isRecovery) {
        await updatePassword(password)
        setSuccessMessage('Your password has been updated.')
        window.setTimeout(() => navigate('/dashboard', { replace: true }), 1200)
      } else {
        await requestPasswordReset(email)
        setSuccessMessage('If an account matches that email, a password reset link is on its way.')
      }
    } catch (error) {
      setErrorMessage(friendlyAuthError(error, isRecovery ? 'update your password' : 'send the reset email'))
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {errorMessage && <p className="auth-message auth-message-error" role="alert">{errorMessage}</p>}
      {successMessage && <p className="auth-message auth-message-success" role="status"><CheckCircle2 size={17} aria-hidden="true" />{successMessage}</p>}
      {isRecovery ? <>
        <AuthInput id="reset-new-password" label="New password" type="password" name="new-password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
        <AuthInput id="reset-confirmation" label="Confirm new password" type="password" name="password-confirmation" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
      </> : <AuthInput id="reset-email" label="Email address" type="email" name="email" autoComplete="email" inputMode="email" required value={email} onChange={(event) => setEmail(event.target.value)} />}
      <SubmitButton isBusy={isBusy}>{isRecovery ? 'Update password' : 'Send reset link'}</SubmitButton>
    </form>
  )
}
import { useState } from 'react'
import { ArrowRight, CheckCircle2, LoaderCircle } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { requestPasswordReset, signInWithPassword, signUpWithPassword, updatePassword } from '../../services/authService.js'
import { useAuth } from '../../context/AuthContext.jsx'

function friendlyAuthError(error, action) {
  if (import.meta.env.DEV) console.error(`Supabase ${action} failed.`, error)
  const code = error?.code

  if (code === 'invalid_credentials') return 'That email and password combination was not recognized.'
  if (code === 'email_not_confirmed') return 'Confirm your email address before logging in.'
  if (code === 'user_already_exists' || code === 'email_exists') return 'An account with this email already exists. Try logging in instead.'
  if (code === 'weak_password') return 'Choose a stronger password and try again.'
  if (code === 'over_email_send_rate_limit') return 'Too many email requests. Wait a little while and try again.'
  return `We couldn't ${action}. Please check your connection and try again.`
}

function AuthInput({ id, label, ...inputProps }) {
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} className="auth-input" {...inputProps} />
    </div>
  )
}

function SubmitButton({ children, isBusy }) {
  return (
    <button className="button auth-submit" type="submit" disabled={isBusy}>
      {isBusy ? <><LoaderCircle className="auth-spinner" size={17} aria-hidden="true" /> Please wait</> : <>{children}<ArrowRight size={16} aria-hidden="true" /></>}
    </button>
  )
}

export function LoginForm() {
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
      setErrorMessage(isConfigured ? friendlyAuthError(error, 'log in') : 'Supabase is not configured. Add your public project URL and publishable key to .env.')
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

export function RegisterForm() {
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
      if (session) {
        navigate('/dashboard', { replace: true })
      } else {
        setSuccessMessage('Check your inbox for a confirmation link to finish creating your account.')
      }
    } catch (error) {
      setErrorMessage(isConfigured ? friendlyAuthError(error, 'create your account') : 'Supabase is not configured. Add your public project URL and publishable key to .env.')
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

export function PasswordResetForm() {
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
import { ArrowRight, LoaderCircle } from 'lucide-react'

export function friendlyAuthError(error, action) {
  if (import.meta.env.DEV) console.error(`Supabase ${action} failed.`, error)
  const code = error?.code

  if (code === 'invalid_credentials') return 'That email and password combination was not recognized.'
  if (code === 'email_not_confirmed') return 'Confirm your email address before logging in.'
  if (code === 'user_already_exists' || code === 'email_exists') return 'An account with this email already exists. Try logging in instead.'
  if (code === 'weak_password') return 'Choose a stronger password and try again.'
  if (code === 'over_email_send_rate_limit') return 'Too many email requests. Wait a little while and try again.'
  return `We couldn't ${action}. Please check your connection and try again.`
}

export function AuthInput({ id, label, ...inputProps }) {
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} className="auth-input" {...inputProps} />
    </div>
  )
}

export function SubmitButton({ children, isBusy }) {
  return (
    <button className="button auth-submit" type="submit" disabled={isBusy}>
      {isBusy ? <><LoaderCircle className="auth-spinner" size={17} aria-hidden="true" /> Please wait</> : <>{children}<ArrowRight size={16} aria-hidden="true" /></>}
    </button>
  )
}
import { ArrowRight, LoaderCircle } from 'lucide-react'

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
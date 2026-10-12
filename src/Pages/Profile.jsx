import { useState } from 'react'
import { Check, KeyRound, LoaderCircle, Save, UserRound } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.js'
import { updateAccountName, updatePassword } from '../services/authService.js'
import { friendlyAuthError } from '../utils/authErrors.js'
import './Profile.css'

export default function Profile() {
  const { user } = useAuth()
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '')
  const [nameState, setNameState] = useState({ isSaving: false, message: '', error: '' })
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [passwordState, setPasswordState] = useState({ isSaving: false, message: '', error: '' })

  async function saveName(event) {
    event.preventDefault()
    setNameState({ isSaving: true, message: '', error: '' })
    try {
      await updateAccountName(fullName)
      setNameState({ isSaving: false, message: 'Your display name has been updated.', error: '' })
    } catch (error) {
      if (import.meta.env.DEV) console.error('Unable to update the account name.', error)
      setNameState({ isSaving: false, message: '', error: friendlyAuthError(error, 'update your profile') })
    }
  }

  async function savePassword(event) {
    event.preventDefault()
    if (password.length < 8) {
      setPasswordState({ isSaving: false, message: '', error: 'Use a password with at least 8 characters.' })
      return
    }
    if (password !== confirmation) {
      setPasswordState({ isSaving: false, message: '', error: 'Your passwords do not match.' })
      return
    }

    setPasswordState({ isSaving: true, message: '', error: '' })
    try {
      await updatePassword(password)
      setPassword('')
      setConfirmation('')
      setPasswordState({ isSaving: false, message: 'Your password has been updated.', error: '' })
    } catch (error) {
      if (import.meta.env.DEV) console.error('Unable to update the account password.', error)
      setPasswordState({ isSaving: false, message: '', error: friendlyAuthError(error, 'update your password') })
    }
  }

  return <div className="workspace-content profile-page">
    <section className="workspace-page-heading">
      <div><p className="workspace-eyebrow">ACCOUNT / SETTINGS</p><h1>Your profile</h1><p>Manage the account details you use in AeroNotes AI.</p></div>
    </section>

    <div className="profile-grid">
      <section className="workspace-panel profile-panel" aria-labelledby="profile-details-heading">
        <div className="profile-panel-heading"><span className="profile-panel-icon"><UserRound size={18} aria-hidden="true" /></span><div><h2 id="profile-details-heading">Personal details</h2><p>Your name appears in your study workspace.</p></div></div>
        <form className="profile-form" onSubmit={saveName}>
          <div className="subject-form-field"><label htmlFor="profile-name">Full name</label><input className="workspace-input" id="profile-name" name="fullName" autoComplete="name" maxLength={100} required value={fullName} onChange={(event) => setFullName(event.target.value)} /></div>
          <div className="subject-form-field"><label htmlFor="profile-email">Email address</label><input className="workspace-input" id="profile-email" type="email" value={user?.email || ''} readOnly /><small>Email changes are managed by your sign-in provider.</small></div>
          {nameState.error && <p className="workspace-error-banner" role="alert">{nameState.error}</p>}
          {nameState.message && <p className="profile-success" role="status"><Check size={15} aria-hidden="true" />{nameState.message}</p>}
          <button className="button" type="submit" disabled={nameState.isSaving || !fullName.trim()}>{nameState.isSaving ? <><LoaderCircle className="auth-spinner" size={15} /> Saving</> : <><Save size={15} /> Save name</>}</button>
        </form>
      </section>

      <section className="workspace-panel profile-panel" aria-labelledby="profile-password-heading">
        <div className="profile-panel-heading"><span className="profile-panel-icon profile-key-icon"><KeyRound size={18} aria-hidden="true" /></span><div><h2 id="profile-password-heading">Change password</h2><p>Choose a new password for this account.</p></div></div>
        <form className="profile-form" onSubmit={savePassword}>
          <div className="subject-form-field"><label htmlFor="profile-password">New password</label><input className="workspace-input" id="profile-password" type="password" name="new-password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></div>
          <div className="subject-form-field"><label htmlFor="profile-password-confirmation">Confirm new password</label><input className="workspace-input" id="profile-password-confirmation" type="password" name="new-password-confirmation" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></div>
          {passwordState.error && <p className="workspace-error-banner" role="alert">{passwordState.error}</p>}
          {passwordState.message && <p className="profile-success" role="status"><Check size={15} aria-hidden="true" />{passwordState.message}</p>}
          <button className="button" type="submit" disabled={passwordState.isSaving}>{passwordState.isSaving ? <><LoaderCircle className="auth-spinner" size={15} /> Updating</> : <><KeyRound size={15} /> Update password</>}</button>
        </form>
      </section>
    </div>
  </div>
}
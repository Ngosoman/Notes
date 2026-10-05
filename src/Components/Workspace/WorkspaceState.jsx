import { AlertCircle, BookOpen, FileText, LoaderCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getDataErrorMessage } from '../../utils/dataErrors.js'

export function WorkspaceLoading({ label = 'Loading your workspace' }) {
  return <div className="workspace-state" role="status"><LoaderCircle className="auth-spinner" size={23} aria-hidden="true" /><p>{label}</p></div>
}

export function WorkspaceError({ error, itemName, onRetry }) {
  return (
    <div className="workspace-state workspace-state-error" role="alert">
      <span className="workspace-state-icon"><AlertCircle size={20} aria-hidden="true" /></span>
      <h3>We couldn’t load this view</h3>
      <p>{getDataErrorMessage(error, itemName)}</p>
      {onRetry && <button className="button button-secondary" type="button" onClick={onRetry}>Try again</button>}
    </div>
  )
}

export function WorkspaceEmpty({ kind, title, description, actionLabel, actionTo }) {
  const Icon = kind === 'subjects' ? BookOpen : FileText
  return (
    <div className="workspace-state">
      <span className="workspace-state-icon"><Icon size={20} aria-hidden="true" /></span>
      <h3>{title}</h3>
      <p>{description}</p>
      {actionLabel && actionTo && <Link className="button" to={actionTo}>{actionLabel}</Link>}
    </div>
  )
}
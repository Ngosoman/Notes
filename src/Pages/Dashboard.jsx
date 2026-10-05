import { useState } from 'react'
import { ArrowRight, BookOpen, FileText, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import DocumentItem from '../Components/Workspace/DocumentItem.jsx'
import { WorkspaceEmpty, WorkspaceError, WorkspaceLoading } from '../Components/Workspace/WorkspaceState.jsx'
import { useAuth } from '../hooks/useAuth.js'
import useDocuments from '../hooks/useDocuments.js'
import useSubjects from '../hooks/useSubjects.js'
import { deleteDocument } from '../services/documentService.js'
import { getDataErrorMessage } from '../utils/dataErrors.js'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const { user } = useAuth()
  const { documents, isLoading: documentsLoading, error: documentsError, refresh: refreshDocuments } = useDocuments()
  const { subjects, isLoading: subjectsLoading, error: subjectsError, refresh: refreshSubjects } = useSubjects()
  const [actionError, setActionError] = useState('')
  const fullName = user?.user_metadata?.full_name?.trim()
  const displayName = fullName || user?.email?.split('@')[0] || 'Student'
  const recentDocuments = documents.slice(0, 5)
  const isLoading = documentsLoading || subjectsLoading
  const dataError = documentsError || subjectsError

  async function handleDelete(document) {
    const confirmed = window.confirm(`Delete “${document.title || document.filename}” from your documents?`)
    if (!confirmed) return
    setActionError('')
    try {
      await deleteDocument(document.id)
      refreshDocuments()
    } catch (error) {
      if (import.meta.env.DEV) console.error('Unable to delete document.', error)
      setActionError(getDataErrorMessage(error, 'this document'))
    }
  }

  return (
    <div className="workspace-content">
      <section className="workspace-page-heading dashboard-heading">
        <div>
          <p className="workspace-eyebrow">YOUR STUDY DESK / OVERVIEW</p>
          <h1>{greeting()}, {displayName}</h1>
          <p>Ready to continue your studies?</p>
        </div>
        <Link className="button" to="/upload"><Upload size={16} aria-hidden="true" /> Upload new notes</Link>
      </section>

      {actionError && <p className="workspace-error-banner" role="alert">{actionError}</p>}
      {isLoading ? <div className="workspace-skeleton" aria-label="Loading dashboard" /> : dataError ? (
        <WorkspaceError error={dataError} itemName="your study data" onRetry={() => { refreshDocuments(); refreshSubjects() }} />
      ) : <>
        <section className="workspace-stats" aria-label="Study overview">
          <article className="workspace-stat"><FileText className="workspace-stat-icon" size={17} aria-hidden="true" /><span className="workspace-stat-label">Documents</span><strong className="workspace-stat-value">{documents.length}</strong></article>
          <article className="workspace-stat"><BookOpen className="workspace-stat-icon" size={17} aria-hidden="true" /><span className="workspace-stat-label">Subjects</span><strong className="workspace-stat-value">{subjects.length}</strong></article>
          <article className="workspace-stat"><BookOpen className="workspace-stat-icon" size={17} aria-hidden="true" /><span className="workspace-stat-label">Pages indexed</span><strong className="workspace-stat-value">{documents.reduce((total, document) => total + (document.page_count || 0), 0)}</strong></article>
        </section>

        <section className="workspace-panel dashboard-recent" aria-labelledby="recent-documents-heading">
          <div className="workspace-panel-heading">
            <div><h2 id="recent-documents-heading">Recent documents</h2><p>Your latest course material</p></div>
            <Link className="workspace-text-link" to="/documents">All documents <ArrowRight size={14} aria-hidden="true" /></Link>
          </div>
          {recentDocuments.length ? <div className="workspace-list">{recentDocuments.map((document) => <DocumentItem key={document.id} document={document} onDelete={handleDelete} compact />)}</div> : (
            <WorkspaceEmpty kind="documents" title="Your document list is clear" description="Upload a lecture PDF when you're ready to start building your study library." actionLabel="Upload notes" actionTo="/upload" />
          )}
        </section>

        <section className="dashboard-subjects" aria-labelledby="subjects-heading">
          <div className="dashboard-section-title"><div><p className="workspace-eyebrow">COURSE ORGANIZATION</p><h2 id="subjects-heading">Your subjects</h2></div><Link className="workspace-text-link" to="/subjects">Manage subjects <ArrowRight size={14} aria-hidden="true" /></Link></div>
          {subjects.length ? <div className="dashboard-subject-list">{subjects.slice(0, 4).map((subject) => <Link className="dashboard-subject" to={`/subjects/${subject.id}`} key={subject.id}><span className="subject-color" style={{ backgroundColor: subject.color }} /><span>{subject.name}</span><ArrowRight size={14} aria-hidden="true" /></Link>)}</div> : <p className="dashboard-subject-empty">No subjects yet. Add one to keep your course material organized.</p>}
        </section>
      </>}
    </div>
  )
}
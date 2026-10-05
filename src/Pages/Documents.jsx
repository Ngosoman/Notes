import { useMemo, useState } from 'react'
import { Search, Upload } from 'lucide-react'
import { Link } from 'react-router-dom'
import DocumentItem from '../Components/Workspace/DocumentItem.jsx'
import { WorkspaceEmpty, WorkspaceError } from '../Components/Workspace/WorkspaceState.jsx'
import useDocuments from '../hooks/useDocuments.js'
import useSubjects from '../hooks/useSubjects.js'
import { deleteDocument } from '../services/documentService.js'
import { getDataErrorMessage } from '../utils/dataErrors.js'

export default function Documents() {
  const { documents, isLoading, error, refresh } = useDocuments()
  const { subjects } = useSubjects()
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortOrder, setSortOrder] = useState('newest')
  const [actionError, setActionError] = useState('')

  const filteredDocuments = useMemo(() => documents
    .filter((document) => subjectFilter === 'all' || document.subject_id === subjectFilter)
    .filter((document) => statusFilter === 'all' || document.status === statusFilter)
    .filter((document) => `${document.title} ${document.filename} ${document.subject?.name || ''}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((left, right) => {
      const difference = new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
      return sortOrder === 'newest' ? -difference : difference
    }), [documents, search, subjectFilter, statusFilter, sortOrder])

  async function handleDelete(document) {
    if (!window.confirm(`Delete “${document.title || document.filename}” from your documents?`)) return
    setActionError('')
    try {
      await deleteDocument(document.id)
      refresh()
    } catch (deleteError) {
      if (import.meta.env.DEV) console.error('Unable to delete document.', deleteError)
      setActionError(getDataErrorMessage(deleteError, 'this document'))
    }
  }

  return (
    <div className="workspace-content">
      <section className="workspace-page-heading">
        <div><p className="workspace-eyebrow">LIBRARY / DOCUMENTS</p><h1>Your documents</h1><p>Find and organize your course material.</p></div>
        <Link className="button" to="/upload"><Upload size={16} aria-hidden="true" /> Upload notes</Link>
      </section>

      {actionError && <p className="workspace-error-banner" role="alert">{actionError}</p>}
      <section className="workspace-toolbar" aria-label="Filter documents">
        <label className="workspace-search"><Search size={16} aria-hidden="true" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search documents" aria-label="Search documents" /></label>
        <select className="workspace-select" aria-label="Filter by subject" value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}><option value="all">All subjects</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select>
        <select className="workspace-select" aria-label="Filter by processing status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="uploading">Uploading</option><option value="uploaded">Uploaded</option><option value="processing">Processing</option><option value="completed">Completed</option><option value="failed">Failed</option></select>
        <select className="workspace-select" aria-label="Sort documents" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select>
      </section>

      <section className="workspace-panel" aria-label="Document list">
        {isLoading ? <div className="workspace-skeleton" aria-label="Loading documents" /> : error ? <WorkspaceError error={error} itemName="documents" onRetry={refresh} /> : filteredDocuments.length ? <>
          <div className="workspace-table-head" aria-hidden="true"><span>Document</span><span>Subject</span><span>Uploaded</span><span>Status</span></div>
          <div className="workspace-list">{filteredDocuments.map((document) => <DocumentItem key={document.id} document={document} onDelete={handleDelete} />)}</div>
        </> : documents.length ? <WorkspaceEmpty kind="documents" title="No matching documents" description="Try a different search term or adjust the filters." /> : <WorkspaceEmpty kind="documents" title="No documents yet" description="Your uploaded PDFs will appear here. Create a subject first if you want to organize them by course." actionLabel="Upload notes" actionTo="/upload" />}
      </section>
    </div>
  )
}
import { useEffect, useState } from 'react'
import { ArrowLeft, FileText, Sparkles } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { WorkspaceError, WorkspaceLoading } from '../Components/Workspace/WorkspaceState.jsx'
import { getDocument } from '../services/documentService.js'
import { formatDate, formatFileSize } from '../utils/dataErrors.js'

export default function DocumentDetails() {
  const { documentId } = useParams()
  const [result, setResult] = useState({ documentId: null, document: null, isLoading: true, error: null })
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let isActive = true
    getDocument(documentId)
      .then((row) => { if (isActive) setResult({ documentId, document: row, isLoading: false, error: null }) })
      .catch((loadError) => {
        if (import.meta.env.DEV) console.error('Unable to load document details.', loadError)
        if (isActive) setResult({ documentId, document: null, isLoading: false, error: loadError })
      })
    return () => { isActive = false }
  }, [documentId, reloadToken])

  const isCurrentRequest = result.documentId === documentId
  const isLoading = !isCurrentRequest || result.isLoading
  const document = isCurrentRequest ? result.document : null
  const error = isCurrentRequest ? result.error : null

  function retry() {
    setResult({ documentId, document: null, isLoading: true, error: null })
    setReloadToken((token) => token + 1)
  }

  return (
    <div className="workspace-content">
      <Link className="workspace-back-link" to="/documents"><ArrowLeft size={15} aria-hidden="true" /> All documents</Link>
      {isLoading ? <WorkspaceLoading label="Loading document" /> : error ? <section className="workspace-panel"><WorkspaceError error={error} itemName="this document" onRetry={retry} /></section> : !document ? <section className="workspace-panel"><div className="workspace-state"><span className="workspace-state-icon"><FileText size={20} aria-hidden="true" /></span><h3>Document not found</h3><p>It may have been removed or you may not have access to it.</p><Link className="button button-secondary" to="/documents">Return to documents</Link></div></section> : <>
        <section className="workspace-page-heading document-detail-heading">
          <div><p className="workspace-eyebrow">DOCUMENT / DETAILS</p><h1>{document.title || document.filename}</h1><p>{document.subject ? <Link className="workspace-text-link" to={`/subjects/${document.subject.id}`}>{document.subject.name}</Link> : 'Uncategorized'}</p></div>
          <span className="document-status" data-status={document.status}>{document.status}</span>
        </section>
        <div className="document-detail-grid">
          <section className="workspace-panel document-detail-body"><h2>Document source</h2><p>Private PDF preview is not available yet. Once text extraction has finished, open the study summary for source-grounded revision notes and page references.</p></section>
          <section className="workspace-panel" aria-labelledby="document-properties-heading"><div className="workspace-panel-heading"><h2 id="document-properties-heading">Properties</h2></div><dl className="document-detail-list">
            <div><dt>File name</dt><dd title={document.filename}>{document.filename}</dd></div>
            <div><dt>File size</dt><dd>{formatFileSize(document.file_size_bytes)}</dd></div>
            <div><dt>Pages</dt><dd>{document.page_count ?? 'Not available'}</dd></div>
            <div><dt>Uploaded</dt><dd>{formatDate(document.created_at)}</dd></div>
            <div><dt>Type</dt><dd>{document.mime_type}</dd></div>
          </dl></section>
        </div>
        {['uploaded', 'completed'].includes(document.status) && <Link className="button document-summary-button" to={`/summary/${document.id}`}><Sparkles size={16} aria-hidden="true" /> Open study summary</Link>}
      </>}
    </div>
  )
}
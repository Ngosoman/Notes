import { FileText, MessageSquareText, MoreHorizontal, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDate, formatFileSize } from '../../utils/dataErrors.js'

export default function DocumentItem({ document, onDelete, compact = false }) {
  return (
    <article className="document-item">
      <span className="document-file-icon"><FileText size={19} aria-hidden="true" /></span>
      <div className="document-item-main">
        <Link className="document-item-title" to={`/documents/${document.id}`}>{document.title || document.filename}</Link>
        <div className="document-item-meta">
          <span>{document.subject?.name || 'Uncategorized'}</span>
          <span>{formatDate(document.created_at)}</span>
          {!compact && <span>{formatFileSize(document.file_size_bytes)}</span>}
        </div>
      </div>
      <span className="document-status" data-status={document.status}>{document.status}</span>
      <div className="document-item-actions">
        <Link className="document-action" to={`/ask?documentId=${document.id}`} aria-label={`Ask questions about ${document.title || document.filename}`} title="Ask your notes"><MessageSquareText size={15} aria-hidden="true" /></Link>
        {!compact && <Link className="document-action" to={`/documents/${document.id}`} aria-label={`Open ${document.title || document.filename}`} title="Open document"><MoreHorizontal size={17} aria-hidden="true" /></Link>}
        {onDelete && <button className="document-action" type="button" aria-label={`Delete ${document.title || document.filename}`} title="Delete document" onClick={() => onDelete(document)}><Trash2 size={16} aria-hidden="true" /></button>}
      </div>
    </article>
  )
}
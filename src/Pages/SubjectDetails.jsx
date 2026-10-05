import { useMemo } from 'react'
import { ArrowLeft, FileText } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import DocumentItem from '../Components/Workspace/DocumentItem.jsx'
import { WorkspaceEmpty, WorkspaceError, WorkspaceLoading } from '../Components/Workspace/WorkspaceState.jsx'
import useDocuments from '../hooks/useDocuments.js'
import useSubjects from '../hooks/useSubjects.js'

export default function SubjectDetails() {
  const { subjectId } = useParams()
  const { subjects, isLoading: subjectsLoading, error: subjectsError, refresh: refreshSubjects } = useSubjects()
  const { documents, isLoading: documentsLoading, error: documentsError, refresh: refreshDocuments } = useDocuments()
  const subject = subjects.find((item) => item.id === subjectId)
  const subjectDocuments = useMemo(() => documents.filter((document) => document.subject_id === subjectId), [documents, subjectId])
  const loading = subjectsLoading || documentsLoading
  const error = subjectsError || documentsError

  if (loading) return <div className="workspace-content"><WorkspaceLoading label="Loading subject" /></div>
  if (error) return <div className="workspace-content"><section className="workspace-panel"><WorkspaceError error={error} itemName="this subject" onRetry={() => { refreshSubjects(); refreshDocuments() }} /></section></div>
  if (!subject) return <div className="workspace-content"><Link className="workspace-back-link" to="/subjects"><ArrowLeft size={15} aria-hidden="true" /> All subjects</Link><section className="workspace-panel"><WorkspaceEmpty kind="subjects" title="Subject not found" description="It may have been deleted or you may not have access to it." actionLabel="Return to subjects" actionTo="/subjects" /></section></div>

  return (
    <div className="workspace-content">
      <Link className="workspace-back-link" to="/subjects"><ArrowLeft size={15} aria-hidden="true" /> All subjects</Link>
      <section className="workspace-page-heading subject-detail-heading">
        <div><p className="workspace-eyebrow">SUBJECT / STUDY LIBRARY</p><h1><span className="subject-color" style={{ backgroundColor: subject.color }} />{subject.name}</h1><p>{subject.description || 'No description added.'}</p></div>
        <span className="subject-document-count"><FileText size={15} aria-hidden="true" />{subjectDocuments.length} document{subjectDocuments.length === 1 ? '' : 's'}</span>
      </section>
      <section className="workspace-panel" aria-label={`Documents in ${subject.name}`}>
        <div className="workspace-panel-heading"><div><h2>Documents</h2><p>Course material assigned to this subject</p></div></div>
        {subjectDocuments.length ? <div className="workspace-list">{subjectDocuments.map((document) => <DocumentItem key={document.id} document={document} compact />)}</div> : <WorkspaceEmpty kind="documents" title="No documents in this subject" description="When you upload notes, assign them to this subject to keep everything together." actionLabel="Upload notes" actionTo="/upload" />}
      </section>
    </div>
  )
}
import { useState } from 'react'
import { BookOpen, Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import SubjectForm from '../Components/Workspace/SubjectForm.jsx'
import { WorkspaceEmpty, WorkspaceError } from '../Components/Workspace/WorkspaceState.jsx'
import useDocuments from '../hooks/useDocuments.js'
import useSubjects from '../hooks/useSubjects.js'
import { createSubject, deleteSubject, updateSubject } from '../services/subjectService.js'
import { getDataErrorMessage } from '../utils/dataErrors.js'

const blankSubject = { name: '', description: '', color: '#1D4ED8' }

export default function Subjects() {
  const { subjects, isLoading, error, refresh } = useSubjects()
  const { documents, isLoading: documentsLoading } = useDocuments()
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editValues, setEditValues] = useState(blankSubject)
  const [actionError, setActionError] = useState('')

  async function handleCreate(values) {
    setActionError('')
    setIsSaving(true)
    try {
      await createSubject(values)
      refresh()
      return true
    } catch (createError) {
      if (import.meta.env.DEV) console.error('Unable to create subject.', createError)
      setActionError(getDataErrorMessage(createError, 'this subject'))
      return false
    } finally {
      setIsSaving(false)
    }
  }

  function beginEdit(subject) {
    setEditingId(subject.id)
    setEditValues({ name: subject.name, description: subject.description || '', color: subject.color })
    setActionError('')
  }

  async function handleUpdate(event) {
    event.preventDefault()
    setIsSaving(true)
    setActionError('')
    try {
      await updateSubject(editingId, editValues)
      setEditingId(null)
      refresh()
    } catch (updateError) {
      if (import.meta.env.DEV) console.error('Unable to update subject.', updateError)
      setActionError(getDataErrorMessage(updateError, 'this subject'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(subject) {
    const count = documents.filter((document) => document.subject_id === subject.id).length
    const impact = count ? ` Its ${count} linked document${count === 1 ? '' : 's'} will become uncategorized.` : ''
    if (!window.confirm(`Delete “${subject.name}”?${impact}`)) return
    setActionError('')
    try {
      await deleteSubject(subject.id)
      refresh()
    } catch (deleteError) {
      if (import.meta.env.DEV) console.error('Unable to delete subject.', deleteError)
      setActionError(getDataErrorMessage(deleteError, 'this subject'))
    }
  }

  return (
    <div className="workspace-content">
      <section className="workspace-page-heading">
        <div><p className="workspace-eyebrow">LIBRARY / ORGANIZATION</p><h1>Your subjects</h1><p>Group course documents into subjects that make sense to you.</p></div>
      </section>
      {actionError && <p className="workspace-error-banner" role="alert">{actionError}</p>}
      <SubjectForm onSubmit={handleCreate} isSaving={isSaving} />
      {isLoading || documentsLoading ? <div className="workspace-skeleton" aria-label="Loading subjects" /> : error ? <section className="workspace-panel"><WorkspaceError error={error} itemName="subjects" onRetry={refresh} /></section> : subjects.length ? (
        <section className="subject-grid" aria-label="Your subjects">
          {subjects.map((subject) => {
            const documentCount = documents.filter((document) => document.subject_id === subject.id).length
            return <article className="subject-card" key={subject.id}>
              <div className="subject-card-top">
                <div className="subject-card-title"><span className="subject-color" style={{ backgroundColor: subject.color }} /><Link to={`/subjects/${subject.id}`}>{subject.name}</Link></div>
                <div className="subject-card-actions"><button type="button" aria-label={`Edit ${subject.name}`} title="Edit subject" onClick={() => beginEdit(subject)}><Pencil size={14} aria-hidden="true" /></button><button type="button" aria-label={`Delete ${subject.name}`} title="Delete subject" onClick={() => handleDelete(subject)}><Trash2 size={14} aria-hidden="true" /></button></div>
              </div>
              <p className="subject-card-description">{subject.description || 'No description added.'}</p>
              <div className="subject-card-footer"><span>{documentCount} document{documentCount === 1 ? '' : 's'}</span><Link className="workspace-text-link" to={`/subjects/${subject.id}`}>Open <BookOpen size={13} aria-hidden="true" /></Link></div>
              {editingId === subject.id && <form className="workspace-inline-edit" onSubmit={handleUpdate}>
                <input className="workspace-input" aria-label="Subject name" required maxLength={100} value={editValues.name} onChange={(event) => setEditValues((current) => ({ ...current, name: event.target.value }))} />
                <input className="workspace-input edit-description" aria-label="Subject description" maxLength={500} placeholder="Description" value={editValues.description} onChange={(event) => setEditValues((current) => ({ ...current, description: event.target.value }))} />
                <input className="subject-color-input" type="color" aria-label="Subject color" value={editValues.color} onChange={(event) => setEditValues((current) => ({ ...current, color: event.target.value }))} />
                <button className="button button-small" type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save'}</button>
                <button className="button button-secondary button-small" type="button" onClick={() => setEditingId(null)}>Cancel</button>
              </form>}
            </article>
          })}
        </section>
      ) : <section className="workspace-panel"><WorkspaceEmpty kind="subjects" title="No subjects yet" description="Add your first subject above. You can assign documents to it when you upload notes." /></section>}
    </div>
  )
}
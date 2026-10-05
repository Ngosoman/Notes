import { useState } from 'react'
import { ArrowRight, BookOpenCheck, BookOpenText, BrainCircuit, CheckCircle2, Clock3, FileQuestion, LoaderCircle, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { WorkspaceEmpty, WorkspaceError, WorkspaceLoading } from '../Components/Workspace/WorkspaceState.jsx'
import useDocuments from '../hooks/useDocuments.js'
import { finishStudySession, generateStudySet, startStudySession } from '../services/studyService.js'
import { getDataErrorMessage } from '../utils/dataErrors.js'
import './Study.css'

const studyModes = [
  { id: 'quick_review', title: 'Quick review', description: 'Revisit your structured summary at a focused pace.', icon: BookOpenText, action: 'Start review' },
  { id: 'flashcards', title: 'Flashcards', description: 'Practice active recall and track cards you know.', icon: BrainCircuit, action: 'Review cards' },
  { id: 'quiz', title: 'Quiz', description: 'Test yourself and review explanations after submission.', icon: FileQuestion, action: 'Build a quiz' },
  { id: 'deep_study', title: 'Deep study', description: 'Set aside time for a longer session with your summary.', icon: BookOpenCheck, action: 'Start session' },
]

export default function StudyMode() {
  const { documents, isLoading, error, refresh } = useDocuments()
  const navigate = useNavigate()
  const [documentId, setDocumentId] = useState('')
  const [difficulty, setDifficulty] = useState('medium')
  const [mode, setMode] = useState('quick_review')
  const [isStarting, setIsStarting] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [session, setSession] = useState(null)

  const eligibleDocuments = documents.filter((document) => ['uploaded', 'completed'].includes(document.status))
  const selectedDocument = eligibleDocuments.find((document) => document.id === documentId)

  async function handleStart() {
    if (!selectedDocument || isStarting) return
    setErrorMessage('')
    setMessage('')
    setIsStarting(true)
    try {
      if (mode === 'flashcards') {
        navigate(`/flashcards/${documentId}`)
        return
      }
      if (mode === 'quiz') {
        const generated = await generateStudySet({ documentId, type: 'quiz', difficulty, count: 10 })
        navigate(`/quiz/${generated.quizId}`)
        return
      }
      const started = await startStudySession({ documentId, subjectId: selectedDocument.subject_id, sessionType: mode })
      setSession({ ...started, document: selectedDocument })
    } catch (error) {
      if (import.meta.env.DEV) console.error('Unable to start study mode.', error)
      setErrorMessage(error.message || getDataErrorMessage(error, 'study mode'))
    } finally {
      setIsStarting(false)
    }
  }

  async function finishSession() {
    if (!session) return
    setIsStarting(true)
    try {
      const durationSeconds = await finishStudySession({ sessionId: session.id, startedAt: session.started_at })
      setMessage(`Session saved · ${Math.max(1, Math.round(durationSeconds / 60))} minute${Math.round(durationSeconds / 60) === 1 ? '' : 's'} studied.`)
      setSession(null)
    } catch (error) {
      if (import.meta.env.DEV) console.error('Unable to finish study session.', error)
      setErrorMessage(getDataErrorMessage(error, 'the study session'))
    } finally {
      setIsStarting(false)
    }
  }

  if (session) {
    return <div className="workspace-content study-page">
      <section className="workspace-page-heading"><div><p className="workspace-eyebrow">ACTIVE STUDY SESSION</p><h1>{session.document.title || session.document.filename}</h1><p>{mode === 'deep_study' ? 'Deep study' : 'Quick review'} · Session timer started</p></div></section>
      <section className="workspace-panel study-session-panel">
        <span className="study-session-icon"><Clock3 size={21} aria-hidden="true" /></span>
        <h2>Study at your own pace.</h2>
        <p>Your session is being timed. Open the saved summary, review the material, then finish here to record the session duration.</p>
        <div className="study-session-actions"><Link className="button button-secondary" to={`/summary/${documentId}`}>Open summary <ArrowRight size={14} /></Link><button className="button" type="button" onClick={finishSession} disabled={isStarting}>{isStarting ? 'Saving…' : 'Finish session'}</button></div>
      </section>
    </div>
  }

  return <div className="workspace-content study-page">
    <section className="workspace-page-heading"><div><p className="workspace-eyebrow">STUDY / SESSION SETUP</p><h1>Study mode</h1><p>Choose course material and a study activity.</p></div></section>
    {errorMessage && <p className="workspace-error-banner" role="alert">{errorMessage}</p>}
    {message && <p className="study-success-banner" role="status"><CheckCircle2 size={15} />{message}</p>}
    {isLoading ? <WorkspaceLoading label="Loading documents" /> : error ? <section className="workspace-panel"><WorkspaceError error={error} itemName="documents" onRetry={refresh} /></section> : documents.length === 0 ? <section className="workspace-panel"><WorkspaceEmpty kind="documents" title="Add notes to begin studying" description="Upload a PDF to create your first study session." actionLabel="Upload notes" actionTo="/upload" /></section> : eligibleDocuments.length === 0 ? <section className="workspace-panel"><WorkspaceEmpty kind="documents" title="Documents need processing first" description="Once PDF text extraction completes, the document will be available for study." actionLabel="View documents" actionTo="/documents" /></section> : <>
      <section className="study-setup-panel">
        <div className="study-setup-field"><label htmlFor="study-document">Document</label><select id="study-document" className="workspace-select" value={documentId} onChange={(event) => setDocumentId(event.target.value)}><option value="">Choose a document</option>{eligibleDocuments.map((document) => <option value={document.id} key={document.id}>{document.title || document.filename}</option>)}</select></div>
        <div className="study-setup-field"><label htmlFor="study-difficulty">Quiz difficulty</label><select id="study-difficulty" className="workspace-select" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></div>
      </section>
      <section className="study-launch-panel" aria-label="Study activities">
        {studyModes.map(({ id, title, description, icon: Icon, action }) => <button className={`study-launch-card${mode === id ? ' is-selected' : ''}`} type="button" key={id} onClick={() => setMode(id)} aria-pressed={mode === id}><span><Icon size={18} aria-hidden="true" /></span><h2>{title}</h2><p>{description}</p><strong>{action} <ArrowRight size={13} /></strong></button>)}
      </section>
      <button className="button study-start-button" type="button" onClick={handleStart} disabled={!documentId || isStarting}>{isStarting ? <><LoaderCircle className="auth-spinner" size={16} /> Preparing</> : <><Sparkles size={16} /> Start {studyModes.find((item) => item.id === mode)?.title.toLowerCase()}</>}</button>
    </>}
  </div>
}

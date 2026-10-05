import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, LoaderCircle, RotateCw, Sparkles } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import Flashcard from '../Components/Study/Flashcard.jsx'
import StudyProgress from '../Components/Study/StudyProgress.jsx'
import { WorkspaceEmpty, WorkspaceError, WorkspaceLoading } from '../Components/Workspace/WorkspaceState.jsx'
import useDocuments from '../hooks/useDocuments.js'
import { finishStudySession, generateStudySet, listFlashcards, startStudySession, updateFlashcardReview } from '../services/studyService.js'
import { getDataErrorMessage } from '../utils/dataErrors.js'
import './Study.css'

export default function Flashcards() {
  const { documentId } = useParams()
  const { documents } = useDocuments()
  const document = documents.find((item) => item.id === documentId)
  const [result, setResult] = useState({ documentId: null, cards: [], isLoading: true, error: null })
  const [reloadToken, setReloadToken] = useState(0)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSavingReview, setIsSavingReview] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [session, setSession] = useState(null)

  useEffect(() => {
    let isActive = true
    listFlashcards(documentId)
      .then((cards) => { if (isActive) setResult({ documentId, cards, isLoading: false, error: null }) })
      .catch((error) => {
        if (import.meta.env.DEV) console.error('Unable to load flashcards.', error)
        if (isActive) setResult({ documentId, cards: [], isLoading: false, error })
      })
    return () => { isActive = false }
  }, [documentId, reloadToken])

  const isCurrent = result.documentId === documentId
  const isLoading = !isCurrent || result.isLoading
  const cards = isCurrent ? result.cards : []
  const card = cards[currentIndex]
  const knownCount = cards.filter((item) => item.review_state === 'known').length
  const reviewedCount = cards.filter((item) => item.review_count > 0).length

  function reload() {
    setResult({ documentId, cards: [], isLoading: true, error: null })
    setReloadToken((token) => token + 1)
    setCurrentIndex(0)
    setIsFlipped(false)
  }

  async function beginSession() {
    if (session) return
    try {
      const started = await startStudySession({ documentId, sessionType: 'flashcards' })
      setSession({ ...started, reviewed: 0 })
    } catch (error) {
      if (import.meta.env.DEV) console.error('Unable to start flashcard study session.', error)
      setErrorMessage(getDataErrorMessage(error, 'the study session'))
    }
  }

  async function handleReview(reviewState) {
    if (!card || isSavingReview) return
    setErrorMessage('')
    setIsSavingReview(true)
    try {
      await beginSession()
      const updated = await updateFlashcardReview({ ...card, review_state: reviewState })
      setResult((current) => current.documentId === documentId
        ? { ...current, cards: current.cards.map((item) => item.id === updated.id ? { ...item, ...updated } : item) }
        : current)
      if (session) setSession((current) => current ? { ...current, reviewed: current.reviewed + 1 } : current)
      setIsFlipped(false)
      setCurrentIndex((index) => Math.min(index + 1, cards.length - 1))
    } catch (error) {
      if (import.meta.env.DEV) console.error('Unable to save flashcard review.', error)
      setErrorMessage(getDataErrorMessage(error, 'flashcard progress'))
    } finally {
      setIsSavingReview(false)
    }
  }

  async function generateCards() {
    setErrorMessage('')
    setIsGenerating(true)
    try {
      await generateStudySet({ documentId, type: 'flashcards', count: 20 })
      reload()
    } catch (error) {
      if (import.meta.env.DEV) console.error('Unable to generate flashcards.', error)
      setErrorMessage(error.message || 'Flashcards could not be generated. Try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  async function finishSession() {
    if (!session) return
    try {
      await finishStudySession({ sessionId: session.id, startedAt: session.started_at, flashcardsReviewed: session.reviewed })
      setSession(null)
    } catch (error) {
      if (import.meta.env.DEV) console.error('Unable to finish flashcard study session.', error)
      setErrorMessage(getDataErrorMessage(error, 'the study session'))
    }
  }

  return (
    <div className="workspace-content study-page">
      <Link className="workspace-back-link" to={`/documents/${documentId}`}><ArrowLeft size={15} aria-hidden="true" /> {document?.title || 'Document details'}</Link>
      <section className="workspace-page-heading">
        <div><p className="workspace-eyebrow">STUDY / ACTIVE RECALL</p><h1>Flashcards</h1><p>{document?.title || 'Review key ideas from your document.'}</p></div>
        {cards.length > 0 && <button className="button button-secondary" type="button" onClick={generateCards} disabled={isGenerating}><RefreshCw size={14} aria-hidden="true" /> Regenerate</button>}
      </section>
      {errorMessage && <p className="workspace-error-banner" role="alert">{errorMessage}</p>}
      {isLoading ? <WorkspaceLoading label="Loading flashcards" /> : result.error ? <section className="workspace-panel"><WorkspaceError error={result.error} itemName="flashcards" onRetry={reload} /></section> : cards.length === 0 ? (
        <section className="workspace-panel"><WorkspaceEmpty kind="documents" title="No flashcards yet" description="Generate cards from the saved study summary. The cards will be based on this document’s extracted notes." actionLabel={isGenerating ? 'Generating…' : 'Generate flashcards'} actionTo={null} /><div className="study-empty-actions"><button className="button" type="button" onClick={generateCards} disabled={isGenerating || !['uploaded', 'completed'].includes(document?.status)}>{isGenerating ? <><LoaderCircle className="auth-spinner" size={15} /> Generating</> : <><Sparkles size={15} /> Generate flashcards</>}</button><Link className="button button-secondary" to={`/summary/${documentId}`}>Open summary</Link></div></section>
      ) : <>
        <div className="study-progress-panel"><StudyProgress current={reviewedCount} total={cards.length} label="Cards reviewed" /><div className="study-progress-secondary"><span><Check size={13} aria-hidden="true" /> {knownCount} known</span><span><RotateCw size={13} aria-hidden="true" /> {cards.length - knownCount} to review</span></div></div>
        <div className="flashcard-stage"><Flashcard card={card} isFlipped={isFlipped} onFlip={() => setIsFlipped((flipped) => !flipped)} /></div>
        <div className="flashcard-controls">
          <button className="button button-secondary" type="button" disabled={currentIndex === 0} onClick={() => { setCurrentIndex((index) => index - 1); setIsFlipped(false) }}><ArrowLeft size={15} /> Previous</button>
          <div className="flashcard-controls-group">
            <button className="button button-review" type="button" disabled={!isFlipped || isSavingReview} onClick={() => handleReview('review')}><RotateCw size={14} /> Needs review</button>
            <button className="button button-known" type="button" disabled={!isFlipped || isSavingReview} onClick={() => handleReview('known')}><Check size={14} /> Known</button>
          </div>
          <button className="button button-secondary" type="button" disabled={currentIndex >= cards.length - 1} onClick={() => { setCurrentIndex((index) => index + 1); setIsFlipped(false) }}>Next <ArrowRight size={15} /></button>
        </div>
        {session && <button className="study-end-session" type="button" onClick={finishSession}>Finish study session</button>}
      </>}
    </div>
  )
}
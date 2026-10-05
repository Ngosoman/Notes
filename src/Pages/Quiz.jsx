import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, LoaderCircle, Send } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import QuizQuestion from '../Components/Study/QuizQuestion.jsx'
import QuizResult from '../Components/Study/QuizResult.jsx'
import StudyProgress from '../Components/Study/StudyProgress.jsx'
import { WorkspaceError, WorkspaceLoading } from '../Components/Workspace/WorkspaceState.jsx'
import { getQuiz, submitQuiz } from '../services/studyService.js'
import { getDataErrorMessage } from '../utils/dataErrors.js'
import './Study.css'

export default function Quiz() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const [result, setResult] = useState({ quizId: null, quiz: null, isLoading: true, error: null })
  const [reloadToken, setReloadToken] = useState(0)
  const [answers, setAnswers] = useState({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [startedAt] = useState(() => Date.now())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionResult, setSubmissionResult] = useState(null)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    let isActive = true
    getQuiz(quizId)
      .then((quiz) => { if (isActive) setResult({ quizId, quiz, isLoading: false, error: null }) })
      .catch((error) => {
        if (import.meta.env.DEV) console.error('Unable to load quiz.', error)
        if (isActive) setResult({ quizId, quiz: null, isLoading: false, error })
      })
    return () => { isActive = false }
  }, [quizId, reloadToken])

  const isCurrent = result.quizId === quizId
  const isLoading = !isCurrent || result.isLoading
  const quiz = isCurrent ? result.quiz : null
  const questions = quiz?.questions ?? []
  const question = questions[currentIndex]
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers])

  function reload() {
    setResult({ quizId, quiz: null, isLoading: true, error: null })
    setReloadToken((token) => token + 1)
    setAnswers({})
    setCurrentIndex(0)
    setSubmissionResult(null)
  }

  function chooseAnswer(questionId, answer) {
    setAnswers((current) => ({ ...current, [questionId]: answer }))
  }

  async function handleSubmit() {
    if (!quiz || isSubmitting || submissionResult) return
    setActionError('')
    setIsSubmitting(true)
    try {
      const durationSeconds = Math.floor((Date.now() - startedAt) / 1000)
      const resultData = await submitQuiz({ quizId: quiz.id, answers, durationSeconds })
      setSubmissionResult(resultData)
    } catch (error) {
      if (import.meta.env.DEV) console.error('Quiz submission failed.', error)
      setActionError(error.message || getDataErrorMessage(error, 'the quiz result'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return <div className="workspace-content"><WorkspaceLoading label="Loading quiz" /></div>
  if (result.error) return <div className="workspace-content"><section className="workspace-panel"><WorkspaceError error={result.error} itemName="this quiz" onRetry={reload} /></section></div>
  if (!quiz) return <div className="workspace-content"><section className="workspace-panel"><div className="workspace-state"><h3>Quiz not found</h3><p>This quiz may have been removed or you may not have access to it.</p><Link className="button button-secondary" to="/study">Return to study mode</Link></div></section></div>

  return (
    <div className="workspace-content study-page">
      <Link className="workspace-back-link" to={`/documents/${quiz.document_id}`}><ArrowLeft size={15} aria-hidden="true" /> Back to document</Link>
      <section className="workspace-page-heading">
        <div><p className="workspace-eyebrow">STUDY / QUIZ</p><h1>{quiz.title}</h1><p>{quiz.difficulty} · {questions.length} questions</p></div>
      </section>
      {actionError && <p className="workspace-error-banner" role="alert">{actionError}</p>}
      {submissionResult ? <QuizResult result={submissionResult} onRetry={() => navigate('/study')} /> : questions.length === 0 ? <section className="workspace-panel"><div className="workspace-state"><h3>This quiz has no questions</h3><p>Generate a new quiz from the study mode page.</p><Link className="button" to="/study">Open study mode</Link></div></section> : <>
+        <section className="quiz-progress-panel"><StudyProgress current={answeredCount} total={questions.length} label="Questions answered" /></section>
+        <QuizQuestion question={question} number={currentIndex + 1} selectedAnswer={answers[question.id] || ''} onAnswer={chooseAnswer} disabled={isSubmitting} />
+        <div className="quiz-navigation">
+          <button className="button button-secondary" type="button" disabled={currentIndex === 0 || isSubmitting} onClick={() => setCurrentIndex((index) => index - 1)}><ArrowLeft size={15} /> Previous</button>
+          <span className="quiz-nav-count">Question {currentIndex + 1} of {questions.length}</span>
+          <button className="button button-secondary" type="button" disabled={currentIndex >= questions.length - 1 || isSubmitting} onClick={() => setCurrentIndex((index) => index + 1)}>Next <ArrowRight size={15} /></button>
+        </div>
+        <div className="quiz-submit-bar"><p>{questions.length - answeredCount ? `${questions.length - answeredCount} unanswered` : 'All questions answered'} · Answers stay hidden until submission.</p><button className="button" type="button" onClick={handleSubmit} disabled={isSubmitting}>{isSubmitting ? <><LoaderCircle className="auth-spinner" size={15} /> Checking</> : <><Send size={14} /> Submit quiz</>}</button></div>
+      </>}
+    </div>
+  )
+}

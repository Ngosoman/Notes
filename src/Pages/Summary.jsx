import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Bookmark, BookmarkCheck, BrainCircuit, Check, Copy, FileQuestion, LoaderCircle, Printer, RefreshCw, Sparkles } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import SummarySection, { SourcePages } from '../Components/Notes/SummarySection.jsx'
import { WorkspaceError, WorkspaceLoading } from '../Components/Workspace/WorkspaceState.jsx'
import { getDocument } from '../services/documentService.js'
import { getDocumentSummary, requestDocumentSummary, setSummaryBookmarked } from '../services/summaryService.js'
import { getDataErrorMessage } from '../utils/dataErrors.js'
import './Summary.css'
import './Summary.css'

function getSummaryErrorMessage(error) {
  if (error?.code === 'AI_NOT_CONFIGURED') return 'AI summaries are not configured on the server yet. Add the provider settings as Supabase Edge Function secrets.'
  if (error?.code === 'FUNCTION_UNAVAILABLE') return 'The summary function is not deployed yet. Deploy the generate-summary Edge Function and try again.'
  if (error?.code === 'NO_SELECTABLE_TEXT') return error.message
  if (error?.code === 'SUMMARY_INPUT_LIMIT' || error?.code === 'INVALID_SUMMARY') return error.message
  if (error?.status === 409) return error.message
  if (error?.code === 'PGRST205' || error?.code === '42P01') return 'Summary tables are not available yet. Apply the structured summaries migration and refresh.'
  return error?.message || 'We could not generate the summary. Check your connection and try again.'
}

function createCopyText(document, summary) {
  const lines = [`# ${summary.title}`, `Document: ${document.title || document.filename}`, '', '## Overview', summary.overview]
  const append = (heading, entries, format) => {
    lines.push('', `## ${heading}`)
    if (!entries.length) lines.push('No supported material identified.')
    else entries.forEach((entry) => lines.push(format(entry)))
  }

  append('Key concepts', summary.key_concepts, (item) => `- ${item.title}: ${item.explanation}`)
  append('Topics', summary.topics, (item) => `- ${item.title}: ${item.explanation}${item.key_points.length ? `\n  ${item.key_points.join('\n  ')}` : ''}`)
  append('Definitions', summary.definitions, (item) => `- ${item.term}: ${item.definition}`)
  append('Formulas', summary.formulas, (item) => `- ${item.name}: ${item.formula}\n  ${item.explanation}${item.application ? `\n  Application: ${item.application}` : ''}`)
  append('Exam alerts', summary.exam_alerts, (item) => `- ${item.concept}: ${item.reason}`)
  append('Possible exam questions', summary.possible_questions, (item) => `- ${item.question}${item.rationale ? `\n  Focus: ${item.rationale}` : ''}`)
  return lines.join('\n')
}

export default function Summary() {
  const { documentId } = useParams()
  const [result, setResult] = useState({ documentId: null, document: null, summary: null, isLoading: true, error: null })
  const [reloadToken, setReloadToken] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState('')
  const [bookmarkError, setBookmarkError] = useState('')
  const [copyStatus, setCopyStatus] = useState('idle')

  useEffect(() => {
    let isActive = true
    Promise.all([getDocument(documentId), getDocumentSummary(documentId)])
      .then(([document, summary]) => {
        if (isActive) setResult({ documentId, document, summary, isLoading: false, error: null })
      })
      .catch((error) => {
        if (import.meta.env.DEV) console.error('Unable to load document summary.', error)
        if (isActive) setResult({ documentId, document: null, summary: null, isLoading: false, error })
      })
    return () => { isActive = false }
  }, [documentId, reloadToken])

  const isCurrentRequest = result.documentId === documentId
  const isLoading = !isCurrentRequest || result.isLoading
  const document = isCurrentRequest ? result.document : null
  const summary = isCurrentRequest ? result.summary : null

  const sections = useMemo(() => summary ? [
    { id: 'concepts', label: 'Key concepts', count: summary.key_concepts.length },
    { id: 'topics', label: 'Topics', count: summary.topics.length },
    { id: 'definitions', label: 'Definitions', count: summary.definitions.length },
    { id: 'formulas', label: 'Formulas', count: summary.formulas.length },
    { id: 'alerts', label: 'Exam alerts', count: summary.exam_alerts.length },
    { id: 'questions', label: 'Possible questions', count: summary.possible_questions.length },
  ] : [], [summary])

  function reload() {
    setResult({ documentId, document: null, summary: null, isLoading: true, error: null })
    setReloadToken((token) => token + 1)
  }

  async function generateSummary() {
    setIsGenerating(true)
    setGenerationError('')
    try {
      await requestDocumentSummary(documentId)
      reload()
    } catch (error) {
      if (import.meta.env.DEV) console.error('Summary generation failed.', error)
      setGenerationError(getSummaryErrorMessage(error))
    } finally {
      setIsGenerating(false)
    }
  }

  async function toggleBookmark() {
    if (!summary) return
    setBookmarkError('')
    try {
      const updated = await setSummaryBookmarked(summary.id, !summary.is_bookmarked)
      setResult((current) => current.documentId === documentId
        ? { ...current, summary: { ...current.summary, is_bookmarked: updated.is_bookmarked } }
        : current)
    } catch (error) {
      if (import.meta.env.DEV) console.error('Unable to update summary bookmark.', error)
      setBookmarkError(getDataErrorMessage(error, 'the bookmark'))
    }
  }

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(createCopyText(document, summary))
      setCopyStatus('copied')
      window.setTimeout(() => setCopyStatus('idle'), 1800)
    } catch (error) {
      if (import.meta.env.DEV) console.error('Unable to copy summary text.', error)
      setCopyStatus('failed')
      window.setTimeout(() => setCopyStatus('idle'), 2200)
    }
  }

  if (isLoading) return <div className="workspace-content"><WorkspaceLoading label="Loading study summary" /></div>
  if (result.error) return <div className="workspace-content"><Link className="workspace-back-link" to={`/documents/${documentId}`}><ArrowLeft size={15} aria-hidden="true" /> Document details</Link><section className="workspace-panel"><WorkspaceError error={result.error} itemName="the study summary" onRetry={reload} /></section></div>
  if (!document) return <div className="workspace-content"><section className="workspace-panel"><div className="workspace-state"><h3>Document not found</h3><p>This document may have been removed or you may not have access to it.</p><Link className="button button-secondary" to="/documents">Return to documents</Link></div></section></div>

  return (
    <div className="workspace-content summary-page">
      <Link className="workspace-back-link" to={`/documents/${documentId}`}><ArrowLeft size={15} aria-hidden="true" /> Document details</Link>
      <section className="workspace-page-heading summary-page-heading">
        <div><p className="workspace-eyebrow">STUDY MATERIAL / AI SUMMARY</p><h1>{summary?.title || document.title || document.filename}</h1><p>{document.subject?.name || 'Uncategorized'} <span className="summary-heading-divider">/</span> {document.filename}</p></div>
        {summary && <div className="summary-actions" aria-label="Summary actions">
          <button className={`summary-icon-button${summary.is_bookmarked ? ' is-bookmarked' : ''}`} type="button" onClick={toggleBookmark} aria-label={summary.is_bookmarked ? 'Remove bookmark' : 'Bookmark summary'} title={summary.is_bookmarked ? 'Remove bookmark' : 'Bookmark summary'}>{summary.is_bookmarked ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}</button>
          <button className="summary-icon-button" type="button" onClick={copySummary} aria-label="Copy summary" title="Copy summary">{copyStatus === 'copied' ? <Check size={17} /> : <Copy size={17} />}</button>
          <button className="summary-icon-button" type="button" onClick={() => window.print()} aria-label="Print summary" title="Print summary"><Printer size={17} /></button>
          <button className="button button-small summary-regenerate" type="button" onClick={generateSummary} disabled={isGenerating}>{isGenerating ? <LoaderCircle className="auth-spinner" size={15} /> : <RefreshCw size={15} />} Regenerate</button>
        </div>}
      </section>

      {bookmarkError && <p className="workspace-error-banner" role="alert">{bookmarkError}</p>}
      {copyStatus === 'failed' && <p className="workspace-error-banner" role="alert">Copy failed. Your browser may not allow clipboard access on this connection.</p>}
      {generationError && <p className="workspace-error-banner" role="alert">{generationError}</p>}

      {!summary ? <section className="summary-generate-panel">
        <span className="summary-generate-icon"><Sparkles size={22} aria-hidden="true" /></span>
        <div className="summary-generate-copy"><p className="workspace-eyebrow">SOURCE-GROUNDED STUDY NOTES</p><h2>Turn extracted text into a structured guide.</h2><p>The summary will preserve technical terms, formulas, units, and page references from this document’s extracted text.</p></div>
        <button className="button" type="button" onClick={generateSummary} disabled={isGenerating || !['uploaded', 'completed'].includes(document.status)}>{isGenerating ? <><LoaderCircle className="auth-spinner" size={16} /> Building summary</> : <><Sparkles size={16} /> Generate summary</>}</button>
        {!['uploaded', 'completed'].includes(document.status) && <p className="summary-not-ready">Text extraction must complete before a summary can be generated. Current status: {document.status}.</p>}
      </section> : <>
        <nav className="summary-toc" aria-label="Summary sections">
          <span>IN THIS GUIDE</span>
          {sections.map((section) => <a href={`#summary-${section.id}`} key={section.id}>{section.label}<small>{section.count}</small></a>)}
        </nav>
        <div className="summary-study-links">
          <Link className="button button-secondary" to={`/flashcards/${documentId}`}><BrainCircuit size={15} aria-hidden="true" /> Study flashcards</Link>
          <Link className="button button-secondary" to="/study"><FileQuestion size={15} aria-hidden="true" /> Start a quiz</Link>
        </div>
        <section className="summary-overview" aria-labelledby="overview-heading">
          <p className="summary-card-eyebrow">DOCUMENT OVERVIEW</p>
          <h2 id="overview-heading">The big picture</h2>
          <p>{summary.overview}</p>
        </section>

        <SummarySection id="concepts" title="Key concepts" description="Core ideas to keep in view" count={summary.key_concepts.length}>
          {summary.key_concepts.map((item, index) => <article className="summary-item" key={`${item.title}-${index}`}><h3>{item.title}</h3><p>{item.explanation}</p>{item.key_points.length > 0 && <ul>{item.key_points.map((point, pointIndex) => <li key={`${point}-${pointIndex}`}>{point}</li>)}</ul>}<SourcePages pages={item.source_pages} /></article>)}
        </SummarySection>

        <SummarySection id="topics" title="Topics" description="Explanations and connected details" count={summary.topics.length}>
          {summary.topics.map((item, index) => <article className="summary-item" key={`${item.title}-${index}`}><h3>{item.title}</h3><p>{item.explanation}</p>{item.key_points.length > 0 && <ul>{item.key_points.map((point, pointIndex) => <li key={`${point}-${pointIndex}`}>{point}</li>)}</ul>}<SourcePages pages={item.source_pages} /></article>)}
        </SummarySection>

        <SummarySection id="definitions" title="Definitions" description="Terms as used in the source material" count={summary.definitions.length}>
          {summary.definitions.map((item, index) => <article className="summary-definition" key={`${item.term}-${index}`}><h3>{item.term}</h3><p>{item.definition}</p><SourcePages pages={item.source_pages} /></article>)}
        </SummarySection>

        <SummarySection id="formulas" title="Formulas" description="Equations, symbols, and applications" count={summary.formulas.length}>
          {summary.formulas.map((item, index) => <article className="summary-item summary-formula" key={`${item.name}-${index}`}><h3>{item.name}</h3><p className="formula-expression">{item.formula}</p>{item.variables.length > 0 && <dl className="formula-variables">{item.variables.map((variable, variableIndex) => <div key={`${variable.symbol}-${variableIndex}`}><dt>{variable.symbol}</dt><dd>{variable.meaning}{variable.unit && <span> · {variable.unit}</span>}</dd></div>)}</dl>}<p>{item.explanation}</p>{item.application && <p><strong>Application:</strong> {item.application}</p>}<SourcePages pages={item.source_pages} /></article>)}
        </SummarySection>

        <SummarySection id="alerts" title="Exam alerts" description="Concepts highlighted for focused revision" count={summary.exam_alerts.length}>
          {summary.exam_alerts.map((item, index) => <article className="summary-alert" key={`${item.concept}-${index}`}><h3>{item.concept}</h3><p>{item.reason}</p><SourcePages pages={item.source_pages} /></article>)}
        </SummarySection>

        <SummarySection id="questions" title="Possible exam questions" description="Practice prompts based on this material" count={summary.possible_questions.length}>
          {summary.possible_questions.map((item, index) => <article className="summary-question" key={`${item.question}-${index}`}><h3><span>{String(index + 1).padStart(2, '0')}</span>{item.question}</h3>{item.rationale && <p>Revision focus: {item.rationale}</p>}<SourcePages pages={item.source_pages} /></article>)}
        </SummarySection>
      </>}
    </div>
  )
}
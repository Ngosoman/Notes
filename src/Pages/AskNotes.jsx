import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUp, BookOpenText, FileText, LoaderCircle, MessageSquarePlus, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import useDocuments from '../hooks/useDocuments.js'
import { askNotes, listChatConversations, listChatMessages } from '../services/chatService.js'
import './AskNotes.css'

function formatTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date)
}

function Citation({ citation }) {
  const pageLabel = citation.page_start === citation.page_end
    ? `p. ${citation.page_start}`
    : `pp. ${citation.page_start}-${citation.page_end}`
  return <Link className="ask-citation" to={`/documents/${citation.document_id}`} title={`${citation.document_title}, ${pageLabel}`}><FileText size={13} aria-hidden="true" /><span>{citation.document_title}</span><small>{pageLabel}</small></Link>
}

function Message({ message }) {
  const isAssistant = message.role === 'assistant'
  return (
    <article className={`ask-message ${isAssistant ? 'ask-message-assistant' : 'ask-message-user'}`}>
      <div className="ask-message-meta"><span>{isAssistant ? 'AeroNotes AI' : 'You'}</span><time dateTime={message.created_at}>{formatTime(message.created_at)}</time></div>
      <p className="ask-message-content">{message.content}</p>
      {isAssistant && message.citations?.length > 0 && <div className="ask-citations" aria-label="Sources used">{message.citations.map((citation) => <Citation key={`${citation.source_id}-${citation.document_id}`} citation={citation} />)}</div>}
    </article>
  )
}

export default function AskNotes() {
  const { documents, isLoading: documentsLoading, error: documentsError, refresh: refreshDocuments } = useDocuments()
  const [conversations, setConversations] = useState([])
  const [conversationsLoading, setConversationsLoading] = useState(true)
  const [conversationError, setConversationError] = useState(null)
  const [conversationId, setConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [selectedDocumentIds, setSelectedDocumentIds] = useState(() => {
    const initialDocumentId = new URLSearchParams(window.location.search).get('documentId')
    return initialDocumentId ? [initialDocumentId] : []
  })
  const [search, setSearch] = useState('')
  const [question, setQuestion] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [actionError, setActionError] = useState('')
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const readyDocuments = useMemo(() => documents.filter((document) => ['uploaded', 'completed'].includes(document.status)), [documents])
  const filteredDocuments = useMemo(() => readyDocuments.filter((document) => `${document.title} ${document.filename}`.toLowerCase().includes(search.trim().toLowerCase())), [readyDocuments, search])

  useEffect(() => {
    let isActive = true
    listChatConversations()
      .then((items) => { if (isActive) setConversations(items) })
      .catch((error) => {
        if (import.meta.env.DEV) console.error('Unable to load chat conversations.', error)
        if (isActive) setConversationError(error)
      })
      .finally(() => { if (isActive) setConversationsLoading(false) })
    return () => { isActive = false }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isSending])

  async function refreshConversations() {
    setConversationError(null)
    try {
      setConversations(await listChatConversations())
    } catch (error) {
      if (import.meta.env.DEV) console.error('Unable to refresh chat conversations.', error)
      setConversationError(error)
    }
  }

  async function openConversation(conversation) {
    setConversationId(conversation.id)
    setSelectedDocumentIds(conversation.document_ids)
    setMessages([])
    setActionError('')
    try {
      setMessages(await listChatMessages(conversation.id))
    } catch (error) {
      if (import.meta.env.DEV) console.error('Unable to load chat messages.', error)
      setActionError('Conversation messages could not be loaded. Try selecting it again.')
    }
  }

  function startNewConversation() {
    setConversationId(null)
    setMessages([])
    setSelectedDocumentIds([])
    setActionError('')
    setQuestion('')
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  function toggleDocument(documentId) {
    if (conversationId) return
    setSelectedDocumentIds((current) => current.includes(documentId)
      ? current.filter((id) => id !== documentId)
      : current.length < 20 ? [...current, documentId] : current)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmedQuestion = question.trim()
    if (!trimmedQuestion || isSending) return
    if (!conversationId && selectedDocumentIds.length === 0) {
      setActionError('Select at least one document so answers can be grounded in your notes.')
      return
    }

    const temporaryMessage = { id: `pending-${Date.now()}`, role: 'user', content: trimmedQuestion, citations: [], created_at: new Date().toISOString() }
    setMessages((current) => [...current, temporaryMessage])
    setQuestion('')
    setActionError('')
    setIsSending(true)

    try {
      const response = await askNotes({
        conversationId,
        documentIds: conversationId ? undefined : selectedDocumentIds,
        question: trimmedQuestion,
      })
      setConversationId(response.conversationId)
      setMessages((current) => [...current.filter((message) => message.id !== temporaryMessage.id), temporaryMessage, response.message])
      await refreshConversations()
    } catch (error) {
      if (import.meta.env.DEV) console.error('Ask Your Notes failed.', error)
      setMessages((current) => current.filter((message) => message.id !== temporaryMessage.id))
      setQuestion(trimmedQuestion)
      setActionError(error.message || 'We could not answer from your selected notes. Please try again.')
      await refreshConversations()
    } finally {
      setIsSending(false)
    }
  }

  const activeConversation = conversations.find((item) => item.id === conversationId)
  const selectedDocuments = documents.filter((document) => selectedDocumentIds.includes(document.id))

  return (
    <div className="ask-notes-layout">
      <aside className="ask-sidebar" aria-label="Ask Your Notes conversations and sources">
        <div className="ask-sidebar-header"><div><p className="workspace-eyebrow">STUDY / RAG CHAT</p><h1>Ask your notes</h1></div><button className="ask-new-chat" type="button" onClick={startNewConversation} aria-label="Start a new conversation" title="New conversation"><MessageSquarePlus size={17} /></button></div>
        {conversationError && <div className="ask-sidebar-error" role="alert">Conversation history couldn’t load.</div>}
        <div className="ask-sidebar-section"><p className="ask-sidebar-label">RECENT CONVERSATIONS</p>
          {conversationsLoading ? <p className="ask-sidebar-muted">Loading…</p> : conversations.length ? <div className="ask-conversation-list">{conversations.map((conversation) => <button type="button" className={`ask-conversation${conversation.id === conversationId ? ' is-active' : ''}`} onClick={() => openConversation(conversation)} key={conversation.id}><MessageSquarePlus size={14} aria-hidden="true" /><span>{conversation.title}</span></button>)}</div> : <p className="ask-sidebar-muted">Your conversations will appear here.</p>}
        </div>
        <div className="ask-sidebar-section ask-source-section"><div className="ask-sources-heading"><p className="ask-sidebar-label">YOUR SOURCES</p><span>{selectedDocumentIds.length}/20</span></div>
          <label className="ask-source-search"><Search size={14} aria-hidden="true" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find documents" aria-label="Find source documents" /></label>
          {documentsLoading ? <p className="ask-sidebar-muted">Loading documents…</p> : documentsError ? <button className="ask-sidebar-retry" type="button" onClick={refreshDocuments}>Could not load documents · Retry</button> : filteredDocuments.length ? <div className="ask-source-list">{filteredDocuments.map((document) => <label className={`ask-source-option${selectedDocumentIds.includes(document.id) ? ' is-selected' : ''}`} key={document.id}><input type="checkbox" checked={selectedDocumentIds.includes(document.id)} onChange={() => toggleDocument(document.id)} disabled={Boolean(conversationId)} /><span className="ask-source-check" aria-hidden="true" /><span className="ask-source-title" title={document.title || document.filename}>{document.title || document.filename}</span><small>{document.subject?.name || 'General'}</small></label>)}</div> : <p className="ask-sidebar-muted">No processed documents available yet.</p>}
          {conversationId && <p className="ask-locked-source-note">Sources are fixed for this conversation. Start a new chat to change them.</p>}
        </div>
        <Link className="ask-sidebar-back" to="/documents">Manage documents</Link>
      </aside>

      <section className="ask-chat-panel" aria-label="Ask questions about your notes">
        <header className="ask-chat-header"><div><p className="workspace-eyebrow">GROUNDED IN YOUR MATERIAL</p><h2>{activeConversation?.title || 'New conversation'}</h2></div><span className="ask-chat-status"><span />Private workspace</span></header>
        <div className={`ask-message-list${messages.length === 0 ? ' is-empty' : ''}`} aria-live="polite">
          {messages.length === 0 && <div className="ask-welcome"><span className="ask-welcome-icon"><BookOpenText size={21} aria-hidden="true" /></span><h2>Start with a question.</h2><p>Select one or more processed PDFs, then ask about the concepts, formulas, assumptions, or processes in those notes.</p>{selectedDocuments.length > 0 && <p className="ask-selected-count">{selectedDocuments.length} source{selectedDocuments.length === 1 ? '' : 's'} selected</p>}</div>}
          {messages.map((message) => <Message message={message} key={message.id} />)}
          {isSending && <div className="ask-thinking" role="status"><LoaderCircle className="auth-spinner" size={15} /> Searching selected notes and drafting a grounded answer…</div>}
          <div ref={messagesEndRef} />
        </div>
        {actionError && <p className="ask-action-error" role="alert">{actionError}</p>}
        <form className="ask-composer" onSubmit={handleSubmit}>
          <label className="ask-composer-label" htmlFor="ask-question">Your question</label>
          <div className="ask-composer-input-row"><textarea id="ask-question" ref={inputRef} value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit() } }} placeholder="Ask about a concept, formula, or process…" maxLength={2000} rows={2} disabled={isSending} /><button className="ask-send-button" type="submit" aria-label="Send question" title="Send question" disabled={isSending || !question.trim()}>{isSending ? <LoaderCircle className="auth-spinner" size={17} /> : <ArrowUp size={18} />}</button></div>
          <p className="ask-composer-footnote">Answers use selected notes only. If the material doesn’t support an answer, the assistant will say so.</p>
        </form>
      </section>
    </div>
  )
}

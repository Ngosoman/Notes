import { useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, FileText, LoaderCircle, Trash2, UploadCloud } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { createDocumentRecord, updateDocumentStatus } from '../../services/documentService.js'
import { createDocumentStoragePath, uploadPdf } from '../../services/storageService.js'
import { formatFileSize, getDataErrorMessage } from '../../utils/dataErrors.js'

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024

function fileValidationMessage(error) {
  if (error?.message?.startsWith('Supabase is not configured')) {
    return 'Supabase is not configured. Add the project URL and publishable key to your local environment.'
  }
  if (error?.status === 403 || error?.statusCode === '403') {
    return 'Supabase denied this upload. Apply the private Storage migration and check the bucket policies.'
  }
  if (error?.status === 413 || error?.statusCode === '413') {
    return 'This PDF exceeds the storage limit. Choose a file under 50 MB.'
  }
  if (error?.message?.includes('session has expired')) return error.message
  if (error?.code === 'PGRST205' || error?.code === '42P01') return getDataErrorMessage(error, 'your document record')
  return 'Something went wrong while uploading your PDF. Please try again.'
}

function getTitle(filename) {
  return filename.replace(/\.pdf$/i, '').trim().slice(0, 200) || 'Untitled notes'
}

export default function PdfUploader() {
  const inputRef = useRef(null)
  const { user } = useAuth()
  const navigate = useNavigate()
  const [selectedFile, setSelectedFile] = useState(null)
  const [documentRecord, setDocumentRecord] = useState(null)
  const [progress, setProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [uploadState, setUploadState] = useState('idle')
  const [errorMessage, setErrorMessage] = useState('')

  async function selectFile(file) {
    if (!file) return
    setErrorMessage('')
    setIsValidating(true)

    try {
      if (!file.name.toLowerCase().endsWith('.pdf') || (file.type && file.type !== 'application/pdf')) {
        throw new Error('Choose a PDF file to continue.')
      }
      if (file.size <= 0) throw new Error('This file is empty. Choose a different PDF.')
      if (file.size > MAX_FILE_SIZE_BYTES) throw new Error('This PDF is larger than the 50 MB upload limit.')

      const header = await file.slice(0, 1024).text()
      if (!header.includes('%PDF-')) throw new Error('This file does not appear to contain a valid PDF.')

      setSelectedFile(file)
      setDocumentRecord(null)
      setProgress(0)
      setUploadState('ready')
    } catch (validationError) {
      setSelectedFile(null)
      setUploadState('idle')
      setErrorMessage(validationError.message)
    } finally {
      setIsValidating(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function handleInputChange(event) {
    selectFile(event.target.files?.[0])
  }

  function handleDrop(event) {
    event.preventDefault()
    setIsDragging(false)
    selectFile(event.dataTransfer.files?.[0])
  }

  async function handleUpload() {
    if (!selectedFile || !user || uploadState === 'uploading') return
    setErrorMessage('')
    setProgress(0)
    setUploadState('uploading')

    let record = documentRecord
    try {
      if (!record) {
        const documentId = crypto.randomUUID()
        const storagePath = createDocumentStoragePath(user.id, documentId, selectedFile.name)
        record = await createDocumentRecord({
          title: getTitle(selectedFile.name),
          filename: selectedFile.name,
          storagePath,
          fileSizeBytes: selectedFile.size,
        })
        setDocumentRecord(record)
      } else {
        await updateDocumentStatus(record.id, 'uploading')
      }

      await uploadPdf(selectedFile, record.storage_path, setProgress)
      await updateDocumentStatus(record.id, 'uploaded')
      setUploadState('completed')
    } catch (uploadError) {
      if (import.meta.env.DEV) console.error('PDF upload failed.', uploadError)
      if (record) {
        try {
          await updateDocumentStatus(record.id, 'failed')
        } catch (statusError) {
          if (import.meta.env.DEV) console.error('Unable to mark the document upload as failed.', statusError)
        }
      }
      setErrorMessage(fileValidationMessage(uploadError))
      setUploadState('failed')
    }
  }

  function clearSelection() {
    setSelectedFile(null)
    setDocumentRecord(null)
    setProgress(0)
    setErrorMessage('')
    setUploadState('idle')
  }

  return (
    <section className="pdf-uploader" aria-label="Upload a PDF document">
      {uploadState === 'completed' && documentRecord ? <div className="pdf-upload-result" role="status">
        <span className="pdf-upload-result-icon"><CheckCircle2 size={22} aria-hidden="true" /></span>
        <p className="workspace-eyebrow">UPLOAD COMPLETE</p>
        <h2>Your PDF is in your library.</h2>
        <p className="pdf-upload-result-name">{selectedFile?.name}</p>
        <div className="pdf-upload-result-actions">
          <button className="button" type="button" onClick={() => navigate(`/documents/${documentRecord.id}`)}>View document</button>
          <button className="button button-secondary" type="button" onClick={clearSelection}>Upload another</button>
        </div>
      </div> : <>
        <div
          className={`pdf-dropzone${isDragging ? ' is-dragging' : ''}${selectedFile ? ' has-file' : ''}`}
          onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsDragging(false) }}
          onDrop={handleDrop}
        >
          <span className="pdf-dropzone-icon"><UploadCloud size={24} aria-hidden="true" /></span>
          {selectedFile ? <>
            <h2>PDF ready to upload</h2>
            <p>Check the file details, then upload it to your private library.</p>
            <div className="pdf-selected-file">
              <span className="pdf-selected-file-icon"><FileText size={19} aria-hidden="true" /></span>
              <span className="pdf-selected-file-info"><strong title={selectedFile.name}>{selectedFile.name}</strong><small>{formatFileSize(selectedFile.size)}</small></span>
              {uploadState !== 'uploading' && <button className="document-action" type="button" aria-label="Remove selected PDF" title="Remove selected PDF" onClick={clearSelection}><Trash2 size={16} aria-hidden="true" /></button>}
            </div>
          </> : <>
            <h2>Drop your lecture PDF here</h2>
            <p>Choose one PDF to add to your study library.</p>
            <button className="button button-secondary pdf-browse-button" type="button" onClick={() => inputRef.current?.click()} disabled={isValidating}>
              {isValidating ? <><LoaderCircle className="auth-spinner" size={15} aria-hidden="true" /> Checking file</> : 'Browse files'}
            </button>
            <input ref={inputRef} className="pdf-file-input" type="file" accept="application/pdf,.pdf" onChange={handleInputChange} tabIndex={-1} aria-label="Choose a PDF file" />
            <span className="pdf-file-limit">PDF only · Up to 50 MB</span>
          </>}
        </div>

        {errorMessage && <p className="pdf-upload-error" role="alert"><AlertCircle size={16} aria-hidden="true" />{errorMessage}</p>}

        {uploadState === 'uploading' && <div className="pdf-progress-area" role="status" aria-live="polite">
          <div className="pdf-progress-label"><span>Uploading to private storage</span><strong>{progress}%</strong></div>
          <progress className="pdf-progress" max="100" value={progress}>{progress}%</progress>
        </div>}

        {selectedFile && (uploadState === 'ready' || uploadState === 'failed') && <button className="button pdf-upload-button" type="button" onClick={handleUpload}>
          <UploadCloud size={16} aria-hidden="true" />{uploadState === 'failed' ? 'Retry upload' : 'Upload PDF'}
        </button>}
      </>}
      <p className="pdf-privacy-note">Your PDF is stored privately and is only accessible from your account.</p>
      <Link className="pdf-back-link" to="/documents">Return to documents</Link>
    </section>
  )
}
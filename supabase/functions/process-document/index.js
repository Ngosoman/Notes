import { createClient } from 'npm:@supabase/supabase-js@2'
import { extractText, getDocumentProxy } from 'npm:unpdf@1.8.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024
const MAX_PAGE_COUNT = 800
const MAX_EXTRACTED_CHARACTERS = 4_000_000
const MAX_CHUNK_CHARACTERS = 6000
const CHUNK_OVERLAP_CHARACTERS = 500

class ProcessingError extends Error {
  constructor(message, code, status = 422) {
    super(message)
    this.code = code
    this.status = status
  }
}

function respond(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function cleanPageText(value) {
  return value
    .replaceAll(String.fromCharCode(0), '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\t ]+\n/g, '\n')
    .replace(/\n[\t ]+\n/g, '\n\n')
    .replace(/[\t ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function createChunks(pageTexts) {
  const pageRanges = []
  let documentText = ''

  pageTexts.forEach((pageText, index) => {
    const cleaned = cleanPageText(pageText || '')
    if (!cleaned) return

    if (documentText) documentText += '\n\n'
    const start = documentText.length
    documentText += cleaned
    pageRanges.push({ page: index + 1, start, end: documentText.length })
  })

  if (!documentText.trim()) {
    throw new ProcessingError(
      'No selectable text was found. Scanned PDFs need OCR, which is not available yet.',
      'NO_SELECTABLE_TEXT',
    )
  }
  if (documentText.length > MAX_EXTRACTED_CHARACTERS) {
    throw new ProcessingError('This PDF contains too much text to process in one pass.', 'TEXT_LIMIT_EXCEEDED', 413)
  }

  const chunks = []
  let start = 0

  while (start < documentText.length) {
    let end = Math.min(start + MAX_CHUNK_CHARACTERS, documentText.length)
    if (end < documentText.length) {
      const boundary = Math.max(documentText.lastIndexOf('\n', end), documentText.lastIndexOf(' ', end))
      if (boundary > start + Math.floor(MAX_CHUNK_CHARACTERS * 0.6)) end = boundary
    }

    const content = documentText.slice(start, end).trim()
    if (content) {
      const firstPage = pageRanges.find((range) => range.end > start)?.page ?? 1
      const lastPage = [...pageRanges].reverse().find((range) => range.start < end)?.page ?? firstPage
      chunks.push({
        chunk_index: chunks.length,
        content,
        page_start: firstPage,
        page_end: lastPage,
        token_count: Math.max(1, Math.ceil(content.length / 4)),
      })
    }

    if (end >= documentText.length) break
    start = Math.max(start + 1, end - CHUNK_OVERLAP_CHARACTERS)
    while (start < end && /\s/.test(documentText[start])) start += 1
  }

  if (!chunks.length) {
    throw new ProcessingError('No usable text was extracted from this PDF.', 'NO_USABLE_TEXT')
  }

  return chunks
}

async function extractPdfPages(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const pdf = await getDocumentProxy(bytes, { maxImageSize: 16_777_216 })

  try {
    if (pdf.numPages > MAX_PAGE_COUNT) {
      throw new ProcessingError(`This PDF has more than ${MAX_PAGE_COUNT} pages. Split it into smaller documents and try again.`, 'PAGE_LIMIT_EXCEEDED', 413)
    }

    const { totalPages, text } = await extractText(pdf, { mergePages: false })
    const pageTexts = Array.isArray(text) ? text : [text]
    return { pageCount: totalPages || pdf.numPages, pageTexts }
  } finally {
    await pdf.destroy()
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return respond({ error: 'Method not allowed.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Document processor is missing required Supabase environment variables.')
    return respond({ error: 'Document processing is not configured.' }, 500)
  }

  const authorization = request.headers.get('Authorization')
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!accessToken) return respond({ error: 'Sign in to process this document.' }, 401)

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: { user }, error: authError } = await authClient.auth.getUser(accessToken)
  if (authError || !user) return respond({ error: 'Your session is invalid or expired. Log in again.' }, 401)

  let requestBody
  try {
    requestBody = await request.json()
  } catch {
    return respond({ error: 'A document ID is required.' }, 400)
  }

  const documentId = requestBody?.documentId
  if (typeof documentId !== 'string' || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(documentId)) {
    return respond({ error: 'A valid document ID is required.' }, 400)
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: document, error: documentError } = await serviceClient
    .from('documents')
    .select('id, user_id, storage_path, filename, mime_type, file_size_bytes, status')
    .eq('id', documentId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (documentError) {
    console.error('Unable to read the owned document record.', documentError)
    return respond({ error: 'We could not find this document record.' }, 500)
  }
  if (!document) return respond({ error: 'Document not found.' }, 404)
  if (document.mime_type !== 'application/pdf' || !document.storage_path.startsWith(`${user.id}/${document.id}/`)) {
    return respond({ error: 'The document does not have a valid private PDF path.' }, 400)
  }
  if (document.file_size_bytes > MAX_FILE_SIZE_BYTES) {
    return respond({ error: 'This PDF exceeds the processing size limit.' }, 413)
  }

  const { data: claimedDocument, error: claimError } = await serviceClient
    .from('documents')
    .update({ status: 'processing' })
    .eq('id', document.id)
    .eq('user_id', user.id)
    .in('status', ['uploaded', 'failed'])
    .select('id')
    .maybeSingle()

  if (claimError) {
    console.error('Unable to claim the document processing job.', claimError)
    return respond({ error: 'We could not start processing this document.' }, 500)
  }
  if (!claimedDocument) {
    if (document.status === 'processing') {
      return respond({ error: 'This document is already being processed.', code: 'ALREADY_PROCESSING' }, 409)
    }
    return respond({ error: 'This document has not finished uploading.', code: 'UPLOAD_INCOMPLETE' }, 409)
  }

  try {
    const { data: pdfBlob, error: downloadError } = await serviceClient.storage
      .from('documents')
      .download(document.storage_path)
    if (downloadError || !pdfBlob) throw new ProcessingError('The uploaded PDF could not be retrieved from private storage.', 'PRIVATE_FILE_UNAVAILABLE', 404)

    const { pageCount, pageTexts } = await extractPdfPages(pdfBlob)
    const chunks = createChunks(pageTexts)
    const { error: chunksError } = await serviceClient.rpc('replace_document_chunks', {
      p_document_id: document.id,
      p_user_id: user.id,
      p_chunks: chunks,
    })
    if (chunksError) throw chunksError

    const { error: completeError } = await serviceClient
      .from('documents')
      .update({ status: 'uploaded', page_count: pageCount })
      .eq('id', document.id)
      .eq('user_id', user.id)
    if (completeError) throw completeError

    return respond({
      documentId: document.id,
      pageCount,
      chunkCount: chunks.length,
      status: 'uploaded',
    })
  } catch (error) {
    console.error('Document text extraction failed.', error)
    const { error: statusError } = await serviceClient
      .from('documents')
      .update({ status: 'failed' })
      .eq('id', document.id)
      .eq('user_id', user.id)
    if (statusError) console.error('Unable to mark document processing as failed.', statusError)

    if (error instanceof ProcessingError) {
      return respond({ error: error.message, code: error.code }, error.status)
    }
    return respond({ error: 'Something went wrong while extracting text from this PDF.', code: 'EXTRACTION_FAILED' }, 500)
  }
})

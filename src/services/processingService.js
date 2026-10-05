import { getSupabaseClient } from './supabaseClient.js'

export async function processDocument(documentId) {
  const { data, error } = await getSupabaseClient().functions.invoke('process-document', {
    body: { documentId },
  })

  if (!error) return data

  let responseStatus
  let responseBody
  if (error.context instanceof Response) {
    responseStatus = error.context.status
    try {
      responseBody = await error.context.json()
    } catch {
      responseBody = null
    }
  }

  const processingError = new Error(responseBody?.error || 'The text extraction service could not be reached.')
  processingError.code = responseBody?.code || (responseStatus === 404 ? 'FUNCTION_UNAVAILABLE' : responseStatus === 409 ? 'ALREADY_PROCESSING' : 'PROCESSING_FAILED')
  processingError.status = responseStatus
  throw processingError
}
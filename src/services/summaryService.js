import { getSupabaseClient } from './supabaseClient.js'

export async function getDocumentSummary(documentId) {
  const client = getSupabaseClient()
  const { data: summary, error } = await client
    .from('summaries')
    .select('id, document_id, title, overview, is_bookmarked, created_at, updated_at')
    .eq('document_id', documentId)
    .maybeSingle()

  if (error) throw error
  if (!summary) return null

  const [topics, formulas, definitions, questions] = await Promise.all([
    client.from('topics').select('id, title, explanation, key_points, source_pages').eq('summary_id', summary.id).order('created_at'),
    client.from('formulas').select('id, name, formula, variables, explanation, application, source_pages').eq('summary_id', summary.id).order('created_at'),
    client.from('definitions').select('id, term, definition, source_pages').eq('summary_id', summary.id).order('created_at'),
    client.from('exam_questions').select('id, question, rationale, source_pages').eq('summary_id', summary.id).order('created_at'),
  ])

  const childError = topics.error || formulas.error || definitions.error || questions.error
  if (childError) throw childError

  return {
    ...summary,
    topics: topics.data ?? [],
    formulas: formulas.data ?? [],
    definitions: definitions.data ?? [],
    possible_questions: questions.data ?? [],
  }
}

export async function requestDocumentSummary(documentId) {
  const { data, error } = await getSupabaseClient().functions.invoke('generate-summary', {
    body: { documentId },
  })

  if (!error) return data

  let responseBody
  let status
  if (error.context instanceof Response) {
    status = error.context.status
    try {
      responseBody = await error.context.json()
    } catch {
      responseBody = null
    }
  }

  const summaryError = new Error(responseBody?.error || 'The summary service could not be reached.')
  summaryError.code = responseBody?.code || (status === 404 ? 'FUNCTION_UNAVAILABLE' : 'SUMMARY_FAILED')
  summaryError.status = status
  throw summaryError
}

export async function setSummaryBookmarked(summaryId, isBookmarked) {
  const { data, error } = await getSupabaseClient()
    .from('summaries')
    .update({ is_bookmarked: isBookmarked })
    .eq('id', summaryId)
    .select('id, is_bookmarked')
    .single()

  if (error) throw error
  return data
}
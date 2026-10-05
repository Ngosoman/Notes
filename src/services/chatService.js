import { getSupabaseClient } from './supabaseClient.js'

export async function listChatConversations() {
  const { data, error } = await getSupabaseClient()
    .from('chat_conversations')
    .select('id, title, document_ids, created_at, updated_at')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function listChatMessages(conversationId) {
  const { data, error } = await getSupabaseClient()
    .from('chat_messages')
    .select('id, role, content, citations, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function askNotes({ conversationId, documentIds, question }) {
  const { data, error } = await getSupabaseClient().functions.invoke('ask-notes', {
    body: { conversationId, documentIds, question },
  })
  if (!error) return data

  let responseBody
  if (error.context instanceof Response) {
    try { responseBody = await error.context.json() } catch { responseBody = null }
  }
  const result = new Error(responseBody?.error || 'Ask Your Notes could not complete this request.')
  result.code = responseBody?.code || 'RAG_REQUEST_FAILED'
  result.status = error.context instanceof Response ? error.context.status : undefined
  throw result
}

import { getSupabaseClient } from './supabaseClient.js'

const documentFields = 'id, title, filename, storage_path, mime_type, file_size_bytes, page_count, status, subject_id, created_at, updated_at, subject:subjects(id, name, color)'

export async function listDocuments() {
  const { data, error } = await getSupabaseClient()
    .from('documents')
    .select(documentFields)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getDocument(documentId) {
  const { data, error } = await getSupabaseClient()
    .from('documents')
    .select(documentFields)
    .eq('id', documentId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function deleteDocument(documentId) {
  const { error } = await getSupabaseClient()
    .from('documents')
    .delete()
    .eq('id', documentId)

  if (error) throw error
}
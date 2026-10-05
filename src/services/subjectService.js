import { getSupabaseClient } from './supabaseClient.js'

export async function listSubjects() {
  const { data, error } = await getSupabaseClient()
    .from('subjects')
    .select('id, name, description, color, created_at, updated_at')
    .order('name', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function createSubject({ name, description, color }) {
  const { data, error } = await getSupabaseClient()
    .from('subjects')
    .insert({ name: name.trim(), description: description.trim(), color })
    .select('id, name, description, color, created_at, updated_at')
    .single()

  if (error) throw error
  return data
}

export async function updateSubject(subjectId, { name, description, color }) {
  const { data, error } = await getSupabaseClient()
    .from('subjects')
    .update({ name: name.trim(), description: description.trim(), color })
    .eq('id', subjectId)
    .select('id, name, description, color, created_at, updated_at')
    .single()

  if (error) throw error
  return data
}

export async function deleteSubject(subjectId) {
  const { error } = await getSupabaseClient()
    .from('subjects')
    .delete()
    .eq('id', subjectId)

  if (error) throw error
}
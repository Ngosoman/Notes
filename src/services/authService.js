import { getSupabaseClient } from './supabaseClient.js'

export async function signInWithPassword(email, password) {
  const client = getSupabaseClient()
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  })

  if (error) throw error
  return data
}

export async function signUpWithPassword({ fullName, email, password }) {
  const client = getSupabaseClient()
  const { data, error } = await client.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { full_name: fullName.trim() },
      emailRedirectTo: `${window.location.origin}/dashboard`,
    },
  })

  if (error) throw error
  return data
}

export async function signOut() {
  const client = getSupabaseClient()
  const { error } = await client.auth.signOut()
  if (error) throw error
}

export async function requestPasswordReset(email) {
  const client = getSupabaseClient()
  const { error } = await client.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: `${window.location.origin}/reset-password`,
  })

  if (error) throw error
}

export async function updatePassword(password) {
  const client = getSupabaseClient()
  const { data, error } = await client.auth.updateUser({ password })

  if (error) throw error
  return data
}
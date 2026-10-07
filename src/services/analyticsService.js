import { getSupabaseClient } from './supabaseClient.js'

export async function getStudyAnalytics(days = 30) {
  const safeDays = Math.max(1, Math.min(Math.trunc(days), 365))
  const { data, error } = await getSupabaseClient().rpc('get_study_analytics', { p_days: safeDays })
  if (error) throw error
  return data
}

import { getSupabaseClient } from './supabaseClient.js'

export async function listFlashcards(documentId) {
  const { data, error } = await getSupabaseClient()
    .from('flashcards')
    .select('id, document_id, front, back, source_topic, source_pages, review_state, review_count, last_reviewed_at')
    .eq('document_id', documentId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function updateFlashcardReview(card) {
  const { data, error } = await getSupabaseClient()
    .from('flashcards')
    .update({
      review_state: card.review_state,
      review_count: card.review_count + 1,
      last_reviewed_at: new Date().toISOString(),
    })
    .eq('id', card.id)
    .select('id, review_state, review_count, last_reviewed_at')
    .single()

  if (error) throw error
  return data
}

export async function generateStudySet({ documentId, type, difficulty = 'medium', count }) {
  const { data, error } = await getSupabaseClient().functions.invoke('generate-study-set', {
    body: { documentId, type, difficulty, count },
  })
  if (error) throw await readFunctionError(error, 'Study set generation failed.')
  return data
}

export async function getQuiz(quizId) {
  const client = getSupabaseClient()
  const { data: quiz, error: quizError } = await client
    .from('quizzes')
    .select('id, document_id, title, difficulty, question_count, created_at')
    .eq('id', quizId)
    .maybeSingle()
  if (quizError) throw quizError
  if (!quiz) return null

  const { data: questions, error: questionError } = await client
    .from('quiz_questions')
    .select('id, position, question, question_type, options, source_topic, source_pages')
    .eq('quiz_id', quizId)
    .order('position', { ascending: true })
  if (questionError) throw questionError
  return { ...quiz, questions: questions ?? [] }
}

export async function submitQuiz({ quizId, answers, durationSeconds }) {
  const { data, error } = await getSupabaseClient().functions.invoke('submit-quiz', {
    body: { quizId, answers, durationSeconds },
  })
  if (error) throw await readFunctionError(error, 'Quiz submission failed.')
  return data
}

export async function startStudySession({ documentId, subjectId, sessionType }) {
  const { data, error } = await getSupabaseClient()
    .from('study_sessions')
    .insert({
      document_id: documentId || null,
      subject_id: subjectId || null,
      session_type: sessionType,
    })
    .select('id, started_at')
    .single()
  if (error) throw error
  return data
}

export async function finishStudySession({ sessionId, startedAt, questionsAnswered = 0, correctAnswers = 0, flashcardsReviewed = 0 }) {
  const endedAt = new Date()
  const startedAtTime = new Date(startedAt).getTime()
  const durationSeconds = Number.isFinite(startedAtTime) ? Math.max(0, Math.floor((endedAt.getTime() - startedAtTime) / 1000)) : 0
  const { error } = await getSupabaseClient()
    .from('study_sessions')
    .update({
      ended_at: endedAt.toISOString(),
      duration_seconds: durationSeconds,
      questions_answered: questionsAnswered,
      correct_answers: correctAnswers,
      flashcards_reviewed: flashcardsReviewed,
    })
    .eq('id', sessionId)
  if (error) throw error
  return durationSeconds
}

async function readFunctionError(error, fallbackMessage) {
  if (!(error.context instanceof Response)) return new Error(fallbackMessage)
  let body
  try { body = await error.context.json() } catch { body = null }
  const result = new Error(body?.error || fallbackMessage)
  result.code = body?.code || 'FUNCTION_FAILED'
  result.status = error.context.status
  return result
}
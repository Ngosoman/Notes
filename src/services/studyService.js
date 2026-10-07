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
    .rpc('record_flashcard_review', { p_flashcard_id: card.id, p_review_state: card.review_state })

  if (error) throw error
  return Array.isArray(data) ? data[0] : data
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
    .rpc('start_study_session', {
      p_document_id: documentId || null,
      p_subject_id: subjectId || null,
      p_session_type: sessionType,
    })
  if (error) throw error
  return Array.isArray(data) ? data[0] : data
}

export async function finishStudySession({ sessionId, questionsAnswered = 0, correctAnswers = 0, flashcardsReviewed = 0 }) {
  const { data, error } = await getSupabaseClient().rpc('finish_study_session', {
    p_session_id: sessionId,
    p_questions_answered: questionsAnswered,
    p_correct_answers: correctAnswers,
    p_flashcards_reviewed: flashcardsReviewed,
  })
  if (error) throw error
  return Number(data) || 0
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
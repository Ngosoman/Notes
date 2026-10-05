import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function respond(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return respond({ error: 'Method not allowed.' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return respond({ error: 'Quiz submission is not configured.' }, 500)

  const accessToken = request.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!accessToken) return respond({ error: 'Sign in to submit this quiz.' }, 401)
  const authClient = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: { user }, error: authError } = await authClient.auth.getUser(accessToken)
  if (authError || !user) return respond({ error: 'Your session is invalid or expired.' }, 401)

  let body
  try { body = await request.json() } catch { return respond({ error: 'Quiz answers are required.' }, 400) }
  const quizId = body?.quizId
  const answers = body?.answers
  const durationSeconds = Number.isInteger(body?.durationSeconds) ? Math.max(0, Math.min(body.durationSeconds, 86400)) : 0
  if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(quizId || '')) return respond({ error: 'A valid quiz ID is required.' }, 400)
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return respond({ error: 'Quiz answers must be an object.' }, 400)

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: quiz, error: quizError } = await serviceClient
    .from('quizzes')
    .select('id, title, document_id, user_id')
    .eq('id', quizId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (quizError) {
    console.error('Unable to read the owned quiz.', quizError)
    return respond({ error: 'Quiz data is unavailable.' }, 500)
  }
  if (!quiz) return respond({ error: 'Quiz not found.' }, 404)

  const { data: questions, error: questionError } = await serviceClient
    .from('quiz_questions')
    .select('id, position, question, question_type, options, source_topic, source_pages')
    .eq('quiz_id', quiz.id)
    .eq('user_id', user.id)
    .order('position', { ascending: true })
  if (questionError || !questions?.length) {
    console.error('Unable to read quiz questions.', questionError)
    return respond({ error: 'Quiz questions are unavailable.' }, 500)
  }

  const { data: answerKeys, error: answerError } = await serviceClient
    .from('quiz_answer_keys')
    .select('question_id, correct_answer, explanation')
    .eq('quiz_id', quiz.id)
    .eq('user_id', user.id)
  if (answerError || !answerKeys?.length) {
    console.error('Unable to read private quiz answer keys.', answerError)
    return respond({ error: 'Quiz grading is unavailable.' }, 500)
  }
  const answerKeyMap = new Map(answerKeys.map((item) => [item.question_id, item]))
  const validQuestionIds = new Set(questions.map((question) => question.id))
  for (const answerId of Object.keys(answers)) {
    if (!validQuestionIds.has(answerId)) return respond({ error: 'Answers contain a question that does not belong to this quiz.' }, 400)
  }

  const submittedAnswers = {}
  const results = []
  for (const question of questions) {
    const key = answerKeyMap.get(question.id)
    if (!key) return respond({ error: 'A quiz answer key is missing.' }, 500)
    const selectedAnswer = typeof answers[question.id] === 'string' ? answers[question.id] : ''
    if (selectedAnswer && !question.options.includes(selectedAnswer)) {
      return respond({ error: 'An answer does not match the options for its question.' }, 400)
    }
    if (selectedAnswer) submittedAnswers[question.id] = selectedAnswer
    results.push({
      questionId: question.id,
      position: question.position,
      question: question.question,
      questionType: question.question_type,
      options: question.options,
      selectedAnswer: selectedAnswer || null,
      correctAnswer: key.correct_answer,
      isCorrect: selectedAnswer === key.correct_answer,
      explanation: key.explanation,
      sourceTopic: question.source_topic,
      sourcePages: question.source_pages,
    })
  }

  const { data: attempt, error: attemptError } = await serviceClient.rpc('record_quiz_attempt', {
    p_quiz_id: quiz.id,
    p_user_id: user.id,
    p_answers: submittedAnswers,
    p_duration_seconds: durationSeconds,
  })
  if (attemptError || !attempt) {
    console.error('Unable to record quiz attempt.', attemptError)
    return respond({ error: 'Your answers were checked but the attempt could not be saved.' }, 500)
  }

  return respond({ quizId: quiz.id, title: quiz.title, ...attempt, results })
})

create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  front text not null,
  back text not null,
  source_topic text not null default '',
  source_pages integer[] not null default '{}',
  review_state text not null default 'new',
  review_count integer not null default 0,
  last_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint flashcards_front_length check (char_length(front) between 1 and 1200),
  constraint flashcards_back_length check (char_length(back) between 1 and 3000),
  constraint flashcards_source_topic_length check (char_length(source_topic) <= 200),
  constraint flashcards_review_state check (review_state in ('new', 'known', 'review')),
  constraint flashcards_review_count check (review_count >= 0)
);

create index flashcards_user_document_idx on public.flashcards (user_id, document_id, created_at);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  difficulty text not null default 'medium',
  question_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint quizzes_title_length check (char_length(title) between 1 and 200),
  constraint quizzes_difficulty check (difficulty in ('easy', 'medium', 'hard')),
  constraint quizzes_question_count check (question_count between 1 and 50)
);

create index quizzes_user_document_created_idx on public.quizzes (user_id, document_id, created_at desc);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  position integer not null,
  question text not null,
  question_type text not null,
  options jsonb not null,
  source_topic text not null default '',
  source_pages integer[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint quiz_questions_position check (position >= 0),
  constraint quiz_questions_question_length check (char_length(question) between 1 and 1200),
  constraint quiz_questions_type check (question_type in ('multiple_choice', 'true_false')),
  constraint quiz_questions_options check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6),
  constraint quiz_questions_source_topic_length check (char_length(source_topic) <= 200),
  constraint quiz_questions_quiz_position_unique unique (quiz_id, position)
);

create index quiz_questions_user_quiz_position_idx on public.quiz_questions (user_id, quiz_id, position);

create table public.quiz_answer_keys (
  question_id uuid primary key references public.quiz_questions (id) on delete cascade,
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  correct_answer text not null,
  explanation text not null,
  created_at timestamptz not null default now(),
  constraint quiz_answer_keys_answer_length check (char_length(correct_answer) between 1 and 500),
  constraint quiz_answer_keys_explanation_length check (char_length(explanation) between 1 and 2500)
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  responses jsonb not null,
  score_percent numeric(5,2) not null,
  correct_count integer not null,
  question_count integer not null,
  weak_topics text[] not null default '{}',
  completed_at timestamptz not null default now(),
  constraint quiz_attempts_responses_object check (jsonb_typeof(responses) = 'object'),
  constraint quiz_attempts_score_range check (score_percent between 0 and 100),
  constraint quiz_attempts_counts check (correct_count >= 0 and question_count > 0 and correct_count <= question_count)
);

create index quiz_attempts_user_completed_idx on public.quiz_attempts (user_id, completed_at desc);
create index quiz_attempts_user_document_idx on public.quiz_attempts (user_id, document_id, completed_at desc);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  document_id uuid references public.documents (id) on delete set null,
  subject_id uuid references public.subjects (id) on delete set null,
  session_type text not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer not null default 0,
  questions_answered integer not null default 0,
  correct_answers integer not null default 0,
  flashcards_reviewed integer not null default 0,
  created_at timestamptz not null default now(),
  constraint study_sessions_type check (session_type in ('quick_review', 'flashcards', 'quiz', 'deep_study')),
  constraint study_sessions_duration check (duration_seconds >= 0),
  constraint study_sessions_question_counts check (questions_answered >= 0 and correct_answers between 0 and questions_answered),
  constraint study_sessions_flashcard_count check (flashcards_reviewed >= 0),
  constraint study_sessions_end_after_start check (ended_at is null or ended_at >= started_at)
);

create index study_sessions_user_started_idx on public.study_sessions (user_id, started_at desc);
create index study_sessions_user_subject_idx on public.study_sessions (user_id, subject_id, started_at desc) where subject_id is not null;

alter table public.flashcards enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_answer_keys enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.study_sessions enable row level security;

revoke all on public.flashcards, public.quizzes, public.quiz_questions, public.quiz_answer_keys, public.quiz_attempts, public.study_sessions from anon, authenticated;
grant select on public.flashcards, public.quizzes, public.quiz_questions, public.quiz_attempts, public.study_sessions to authenticated;
grant update (review_state, review_count, last_reviewed_at) on public.flashcards to authenticated;
grant insert (document_id, subject_id, session_type, started_at, ended_at, duration_seconds, questions_answered, correct_answers, flashcards_reviewed) on public.study_sessions to authenticated;
grant update (ended_at, duration_seconds, questions_answered, correct_answers, flashcards_reviewed) on public.study_sessions to authenticated;
grant all on public.flashcards, public.quizzes, public.quiz_questions, public.quiz_answer_keys, public.quiz_attempts to service_role;

create policy "Owners can read their flashcards"
  on public.flashcards for select to authenticated
  using (user_id = (select auth.uid()) and exists (select 1 from public.documents where documents.id = flashcards.document_id and documents.user_id = (select auth.uid())));
create policy "Owners can update flashcard review state"
  on public.flashcards for update to authenticated
  using (user_id = (select auth.uid()) and exists (select 1 from public.documents where documents.id = flashcards.document_id and documents.user_id = (select auth.uid())))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.documents where documents.id = flashcards.document_id and documents.user_id = (select auth.uid())));

create policy "Owners can read their quizzes"
  on public.quizzes for select to authenticated
  using (user_id = (select auth.uid()) and exists (select 1 from public.documents where documents.id = quizzes.document_id and documents.user_id = (select auth.uid())));
create policy "Owners can read their quiz questions"
  on public.quiz_questions for select to authenticated
  using (user_id = (select auth.uid()) and exists (select 1 from public.documents where documents.id = quiz_questions.document_id and documents.user_id = (select auth.uid())));

create policy "Owners can read their quiz attempts"
  on public.quiz_attempts for select to authenticated
  using (user_id = (select auth.uid()) and exists (select 1 from public.documents where documents.id = quiz_attempts.document_id and documents.user_id = (select auth.uid())));

create policy "Owners can read their study sessions"
  on public.study_sessions for select to authenticated
  using (user_id = (select auth.uid()) and (document_id is null or exists (select 1 from public.documents where documents.id = study_sessions.document_id and documents.user_id = (select auth.uid()))));
create policy "Owners can create their study sessions"
  on public.study_sessions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (document_id is null or exists (select 1 from public.documents where documents.id = study_sessions.document_id and documents.user_id = (select auth.uid())))
    and (subject_id is null or exists (select 1 from public.subjects where subjects.id = study_sessions.subject_id and subjects.user_id = (select auth.uid())))
  );
create policy "Owners can update their study sessions"
  on public.study_sessions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (document_id is null or exists (select 1 from public.documents where documents.id = study_sessions.document_id and documents.user_id = (select auth.uid())))
    and (subject_id is null or exists (select 1 from public.subjects where subjects.id = study_sessions.subject_id and subjects.user_id = (select auth.uid())))
  );

create function public.replace_document_flashcards(
  p_document_id uuid,
  p_user_id uuid,
  p_cards jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_count integer;
begin
  if not exists (
    select 1 from public.summaries
    where document_id = p_document_id and user_id = p_user_id
  ) then
    raise exception 'Document summary is required before flashcards can be generated';
  end if;

  delete from public.flashcards where document_id = p_document_id and user_id = p_user_id;

  insert into public.flashcards (document_id, user_id, front, back, source_topic, source_pages)
  select p_document_id, p_user_id, item.front, item.back, coalesce(item.source_topic, ''), coalesce(item.source_pages, '{}')
  from jsonb_to_recordset(p_cards) as item(front text, back text, source_topic text, source_pages integer[]);

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

create function public.replace_document_quiz(
  p_document_id uuid,
  p_user_id uuid,
  p_title text,
  p_difficulty text,
  p_questions jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_quiz_id uuid;
  question_item record;
  created_question_id uuid;
  question_position integer := 0;
begin
  if not exists (
    select 1 from public.summaries
    where document_id = p_document_id and user_id = p_user_id
  ) then
    raise exception 'Document summary is required before quiz generation';
  end if;

  if jsonb_array_length(p_questions) < 1 or jsonb_array_length(p_questions) > 50 then
    raise exception 'Quiz question count is outside the supported range';
  end if;

  insert into public.quizzes (document_id, user_id, title, difficulty, question_count)
  values (p_document_id, p_user_id, p_title, p_difficulty, jsonb_array_length(p_questions))
  returning id into created_quiz_id;

  for question_item in
    select * from jsonb_to_recordset(p_questions) as item(
      question text,
      question_type text,
      options jsonb,
      source_topic text,
      source_pages integer[],
      correct_answer text,
      explanation text
    )
  loop
    created_question_id := gen_random_uuid();
    insert into public.quiz_questions (id, quiz_id, document_id, user_id, position, question, question_type, options, source_topic, source_pages)
    values (created_question_id, created_quiz_id, p_document_id, p_user_id, question_position, question_item.question, question_item.question_type, question_item.options, coalesce(question_item.source_topic, ''), coalesce(question_item.source_pages, '{}'));
    insert into public.quiz_answer_keys (question_id, quiz_id, document_id, user_id, correct_answer, explanation)
    values (created_question_id, created_quiz_id, p_document_id, p_user_id, question_item.correct_answer, question_item.explanation);
    question_position := question_position + 1;
  end loop;

  return created_quiz_id;
end;
$$;

create function public.record_quiz_attempt(
  p_quiz_id uuid,
  p_user_id uuid,
  p_answers jsonb,
  p_duration_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  quiz_record record;
  total_questions integer;
  correct_answers integer;
  score_value numeric(5,2);
  weak_topic_list text[];
  attempt_id uuid;
  answers_object jsonb;
begin
  select id, document_id into quiz_record
  from public.quizzes
  where id = p_quiz_id and user_id = p_user_id;
  if not found then raise exception 'Quiz owner check failed'; end if;

  if jsonb_typeof(p_answers) <> 'object' then raise exception 'Answers must be a JSON object'; end if;
  answers_object := p_answers;

  select count(*) into total_questions from public.quiz_questions where quiz_id = p_quiz_id and user_id = p_user_id;
  if total_questions < 1 then raise exception 'Quiz has no questions'; end if;

  select count(*) into correct_answers
  from public.quiz_questions question
  join public.quiz_answer_keys answer_key on answer_key.question_id = question.id
  where question.quiz_id = p_quiz_id
    and question.user_id = p_user_id
    and answers_object ->> question.id::text = answer_key.correct_answer;

  score_value := round((correct_answers::numeric * 100) / total_questions, 2);

  select coalesce(array_agg(distinct question.source_topic) filter (where question.source_topic <> ''), '{}')
  into weak_topic_list
  from public.quiz_questions question
  join public.quiz_answer_keys answer_key on answer_key.question_id = question.id
  where question.quiz_id = p_quiz_id
    and question.user_id = p_user_id
    and coalesce(answers_object ->> question.id::text, '') <> answer_key.correct_answer;

  insert into public.quiz_attempts (quiz_id, document_id, user_id, responses, score_percent, correct_count, question_count, weak_topics)
  values (p_quiz_id, quiz_record.document_id, p_user_id, answers_object, score_value, correct_answers, total_questions, weak_topic_list)
  returning id into attempt_id;

  insert into public.study_sessions (user_id, document_id, session_type, started_at, ended_at, duration_seconds, questions_answered, correct_answers)
  values (
    p_user_id,
    quiz_record.document_id,
    'quiz',
    now() - make_interval(secs => greatest(0, least(p_duration_seconds, 86400))),
    now(),
    greatest(0, least(p_duration_seconds, 86400)),
    total_questions,
    correct_answers
  );

  return jsonb_build_object(
    'attempt_id', attempt_id,
    'score_percent', score_value,
    'correct_count', correct_answers,
    'question_count', total_questions,
    'weak_topics', weak_topic_list
  );
end;
$$;

revoke all on function public.replace_document_flashcards(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.replace_document_quiz(uuid, uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.record_quiz_attempt(uuid, uuid, jsonb, integer) from public, anon, authenticated;
grant execute on function public.replace_document_flashcards(uuid, uuid, jsonb) to service_role;
grant execute on function public.replace_document_quiz(uuid, uuid, text, text, jsonb) to service_role;
grant execute on function public.record_quiz_attempt(uuid, uuid, jsonb, integer) to service_role;

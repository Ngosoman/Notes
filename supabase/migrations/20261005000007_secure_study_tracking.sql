revoke insert, update on public.study_sessions from authenticated;
revoke update (review_state, review_count, last_reviewed_at) on public.flashcards from authenticated;

grant select on public.study_sessions, public.flashcards to authenticated;

create function public.start_study_session(
  p_document_id uuid,
  p_subject_id uuid,
  p_session_type text
)
returns table (id uuid, started_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  document_subject_id uuid;
  resolved_subject_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if p_session_type not in ('quick_review', 'flashcards', 'quiz', 'deep_study') then raise exception 'Invalid session type'; end if;

  if p_document_id is not null then
    select subject_id into document_subject_id
    from public.documents
    where documents.id = p_document_id and documents.user_id = current_user_id;
    if not found then raise exception 'Document owner check failed'; end if;
  end if;

  resolved_subject_id := coalesce(p_subject_id, document_subject_id);
  if resolved_subject_id is not null and not exists (
    select 1 from public.subjects
    where subjects.id = resolved_subject_id and subjects.user_id = current_user_id
  ) then
    raise exception 'Subject owner check failed';
  end if;
  if p_subject_id is not null and document_subject_id is not null and p_subject_id <> document_subject_id then
    raise exception 'Subject does not match the selected document';
  end if;

  return query
  insert into public.study_sessions (user_id, document_id, subject_id, session_type)
  values (current_user_id, p_document_id, resolved_subject_id, p_session_type)
  returning study_sessions.id, study_sessions.started_at;
end;
$$;

create function public.finish_study_session(
  p_session_id uuid,
  p_questions_answered integer default 0,
  p_correct_answers integer default 0,
  p_flashcards_reviewed integer default 0
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_duration integer;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if p_questions_answered < 0 or p_correct_answers < 0 or p_correct_answers > p_questions_answered or p_flashcards_reviewed < 0 then
    raise exception 'Study activity counts are invalid';
  end if;

  update public.study_sessions as session
  set ended_at = now(),
      duration_seconds = greatest(0, least(floor(extract(epoch from (now() - session.started_at)))::integer, 86400)),
      questions_answered = p_questions_answered,
      correct_answers = p_correct_answers,
      flashcards_reviewed = p_flashcards_reviewed
  where session.id = p_session_id
    and session.user_id = current_user_id
    and session.ended_at is null
  returning session.duration_seconds into saved_duration;

  if not found then raise exception 'Active study session not found'; end if;
  return saved_duration;
end;
$$;

create function public.record_flashcard_review(
  p_flashcard_id uuid,
  p_review_state text
)
returns table (id uuid, review_state text, review_count integer, last_reviewed_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if p_review_state not in ('known', 'review') then raise exception 'Invalid review state'; end if;

  return query
  update public.flashcards as card
  set review_state = p_review_state,
      review_count = card.review_count + 1,
      last_reviewed_at = now()
  where card.id = p_flashcard_id and card.user_id = current_user_id
  returning card.id, card.review_state, card.review_count, card.last_reviewed_at;

  if not found then raise exception 'Flashcard owner check failed'; end if;
end;
$$;

revoke all on function public.start_study_session(uuid, uuid, text) from public, anon;
revoke all on function public.finish_study_session(uuid, integer, integer, integer) from public, anon;
revoke all on function public.record_flashcard_review(uuid, text) from public, anon;
grant execute on function public.start_study_session(uuid, uuid, text) to authenticated;
grant execute on function public.finish_study_session(uuid, integer, integer, integer) to authenticated;
grant execute on function public.record_flashcard_review(uuid, text) to authenticated;

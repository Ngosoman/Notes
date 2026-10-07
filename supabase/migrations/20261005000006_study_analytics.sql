create function public.get_study_analytics(p_days integer default 30)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with settings as (
    select greatest(1, least(coalesce(p_days, 30), 365)) as day_count
  ),
  session_window as (
    select session.*,
           coalesce(session_subject.name, document_subject.name) as resolved_subject_name,
           coalesce(session_subject.color, document_subject.color, '#1D4ED8') as resolved_subject_color
    from public.study_sessions as session
    left join public.subjects as session_subject
      on session_subject.id = session.subject_id and session_subject.user_id = (select auth.uid())
    left join public.documents as document
      on document.id = session.document_id and document.user_id = (select auth.uid())
    left join public.subjects as document_subject
      on document_subject.id = document.subject_id and document_subject.user_id = (select auth.uid())
    where session.user_id = (select auth.uid())
      and session.started_at >= now() - make_interval(days => (select day_count from settings))
      and session.ended_at is not null
  ),
  attempts_window as (
    select attempt.*
    from public.quiz_attempts as attempt
    where attempt.user_id = (select auth.uid())
      and attempt.completed_at >= now() - make_interval(days => (select day_count from settings))
  ),
  subject_totals as (
    select resolved_subject_name as name,
           resolved_subject_color as color,
           sum(duration_seconds)::bigint as duration_seconds
    from session_window
    where resolved_subject_name is not null
    group by resolved_subject_name, resolved_subject_color
    order by sum(duration_seconds) desc, resolved_subject_name
    limit 1
  ),
  weak_topic_totals as (
    select topic.name,
           count(*)::integer as misses
    from attempts_window as attempt
    cross join lateral unnest(attempt.weak_topics) as topic(name)
    where topic.name <> ''
    group by topic.name
    order by count(*) desc, topic.name
    limit 5
  ),
  daily_dates as (
    select generate_series(
      (current_date - 6)::timestamp,
      current_date::timestamp,
      interval '1 day'
    )::date as day
  ),
  daily_sessions as (
    select started_at::date as day,
           sum(duration_seconds)::bigint as duration_seconds,
           count(*)::integer as session_count
    from session_window
    where started_at >= current_date - 6
    group by started_at::date
  ),
  daily_attempts as (
    select completed_at::date as day,
           count(*)::integer as quiz_count
    from attempts_window
    where completed_at >= current_date - 6
    group by completed_at::date
  ),
  flashcard_totals as (
    select coalesce(sum(review_count), 0)::bigint as reviewed
    from public.flashcards
    where user_id = (select auth.uid())
  )
  select jsonb_build_object(
    'days', (select day_count from settings),
    'total_sessions', (select count(*)::integer from session_window),
    'total_study_seconds', (select coalesce(sum(duration_seconds), 0)::bigint from session_window),
    'quizzes_completed', (select count(*)::integer from attempts_window),
    'average_quiz_score', (select round(avg(score_percent), 1) from attempts_window),
    'flashcards_reviewed', (select reviewed from flashcard_totals),
    'most_studied_subject', coalesce(
      (select jsonb_build_object('name', name, 'color', color, 'duration_seconds', duration_seconds) from subject_totals),
      'null'::jsonb
    ),
    'weak_topics', coalesce(
      (select jsonb_agg(jsonb_build_object('name', name, 'misses', misses) order by misses desc, name) from weak_topic_totals),
      '[]'::jsonb
    ),
    'daily_activity', (
      select jsonb_agg(jsonb_build_object(
        'date', dates.day,
        'duration_seconds', coalesce(sessions.duration_seconds, 0),
        'session_count', coalesce(sessions.session_count, 0),
        'quiz_count', coalesce(attempts.quiz_count, 0)
      ) order by dates.day)
      from daily_dates as dates
      left join daily_sessions as sessions on sessions.day = dates.day
      left join daily_attempts as attempts on attempts.day = dates.day
    )
  );
$$;

revoke all on function public.get_study_analytics(integer) from public, anon;
grant execute on function public.get_study_analytics(integer) to authenticated;

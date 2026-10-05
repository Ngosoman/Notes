create table public.summaries (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null unique references public.documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  overview text not null,
  is_bookmarked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint summaries_title_length check (char_length(title) between 1 and 200),
  constraint summaries_overview_length check (char_length(overview) between 1 and 12000)
);

alter table public.summaries
  add column key_concepts jsonb not null default '[]'::jsonb,
  add column exam_alerts jsonb not null default '[]'::jsonb,
  add constraint summaries_key_concepts_array check (jsonb_typeof(key_concepts) = 'array'),
  add constraint summaries_exam_alerts_array check (jsonb_typeof(exam_alerts) = 'array');

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  summary_id uuid not null references public.summaries (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  explanation text not null,
  key_points text[] not null default '{}',
  source_pages integer[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint topics_title_length check (char_length(title) between 1 and 200),
  constraint topics_explanation_length check (char_length(explanation) between 1 and 6000)
);

create table public.formulas (
  id uuid primary key default gen_random_uuid(),
  summary_id uuid not null references public.summaries (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  formula text not null,
  variables jsonb not null default '[]'::jsonb,
  explanation text not null,
  application text not null default '',
  source_pages integer[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint formulas_name_length check (char_length(name) between 1 and 200),
  constraint formulas_formula_length check (char_length(formula) between 1 and 1000),
  constraint formulas_variables_array check (jsonb_typeof(variables) = 'array'),
  constraint formulas_explanation_length check (char_length(explanation) between 1 and 4000),
  constraint formulas_application_length check (char_length(application) <= 4000)
);

create table public.definitions (
  id uuid primary key default gen_random_uuid(),
  summary_id uuid not null references public.summaries (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  term text not null,
  definition text not null,
  source_pages integer[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint definitions_term_length check (char_length(term) between 1 and 200),
  constraint definitions_definition_length check (char_length(definition) between 1 and 3000)
);

create table public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  summary_id uuid not null references public.summaries (id) on delete cascade,
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  question text not null,
  rationale text not null default '',
  source_pages integer[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint exam_questions_question_length check (char_length(question) between 1 and 1200),
  constraint exam_questions_rationale_length check (char_length(rationale) <= 2500)
);

create index topics_user_document_idx on public.topics (user_id, document_id);
create index formulas_user_document_idx on public.formulas (user_id, document_id);
create index definitions_user_document_idx on public.definitions (user_id, document_id);
create index exam_questions_user_document_idx on public.exam_questions (user_id, document_id);

create trigger summaries_set_updated_at
  before update on public.summaries
  for each row execute function public.set_updated_at();

alter table public.summaries enable row level security;
alter table public.topics enable row level security;
alter table public.formulas enable row level security;
alter table public.definitions enable row level security;
alter table public.exam_questions enable row level security;

revoke all on public.summaries, public.topics, public.formulas, public.definitions, public.exam_questions from anon, authenticated;
grant select on public.summaries, public.topics, public.formulas, public.definitions, public.exam_questions to authenticated;
grant update (is_bookmarked) on public.summaries to authenticated;
grant all on public.summaries, public.topics, public.formulas, public.definitions, public.exam_questions to service_role;

create policy "Owners can read their summaries"
  on public.summaries for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (select 1 from public.documents where documents.id = summaries.document_id and documents.user_id = (select auth.uid()))
  );
create policy "Owners can bookmark their summaries"
  on public.summaries for update to authenticated
  using (
    user_id = (select auth.uid())
    and exists (select 1 from public.documents where documents.id = summaries.document_id and documents.user_id = (select auth.uid()))
  )
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.documents where documents.id = summaries.document_id and documents.user_id = (select auth.uid()))
  );

create policy "Owners can read their topic summaries"
  on public.topics for select to authenticated
  using (user_id = (select auth.uid()) and exists (select 1 from public.documents where documents.id = topics.document_id and documents.user_id = (select auth.uid())));
create policy "Owners can read their formulas"
  on public.formulas for select to authenticated
  using (user_id = (select auth.uid()) and exists (select 1 from public.documents where documents.id = formulas.document_id and documents.user_id = (select auth.uid())));
create policy "Owners can read their definitions"
  on public.definitions for select to authenticated
  using (user_id = (select auth.uid()) and exists (select 1 from public.documents where documents.id = definitions.document_id and documents.user_id = (select auth.uid())));
create policy "Owners can read their exam questions"
  on public.exam_questions for select to authenticated
  using (user_id = (select auth.uid()) and exists (select 1 from public.documents where documents.id = exam_questions.document_id and documents.user_id = (select auth.uid())));

create function public.replace_document_summary(
  p_document_id uuid,
  p_user_id uuid,
  p_summary jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  summary_id uuid;
begin
  if not exists (
    select 1 from public.documents
    where id = p_document_id and user_id = p_user_id
  ) then
    raise exception 'Document owner check failed';
  end if;

  insert into public.summaries (document_id, user_id, title, overview, key_concepts, exam_alerts)
  values (
    p_document_id,
    p_user_id,
    p_summary ->> 'title',
    p_summary ->> 'overview',
    coalesce(p_summary -> 'key_concepts', '[]'::jsonb),
    coalesce(p_summary -> 'exam_alerts', '[]'::jsonb)
  )
  on conflict (document_id) do update
    set title = excluded.title,
        overview = excluded.overview,
        key_concepts = excluded.key_concepts,
        exam_alerts = excluded.exam_alerts,
        updated_at = now()
  returning id into summary_id;

  delete from public.topics where document_id = p_document_id and user_id = p_user_id;
  delete from public.formulas where document_id = p_document_id and user_id = p_user_id;
  delete from public.definitions where document_id = p_document_id and user_id = p_user_id;
  delete from public.exam_questions where document_id = p_document_id and user_id = p_user_id;

  insert into public.topics (summary_id, document_id, user_id, title, explanation, key_points, source_pages)
  select summary_id, p_document_id, p_user_id, item.title, item.explanation, coalesce(item.key_points, '{}'), coalesce(item.source_pages, '{}')
  from jsonb_to_recordset(coalesce(p_summary -> 'topics', '[]'::jsonb)) as item(title text, explanation text, key_points text[], source_pages integer[]);

  insert into public.formulas (summary_id, document_id, user_id, name, formula, variables, explanation, application, source_pages)
  select summary_id, p_document_id, p_user_id, item.name, item.formula, coalesce(item.variables, '[]'::jsonb), item.explanation, coalesce(item.application, ''), coalesce(item.source_pages, '{}')
  from jsonb_to_recordset(coalesce(p_summary -> 'formulas', '[]'::jsonb)) as item(name text, formula text, variables jsonb, explanation text, application text, source_pages integer[]);

  insert into public.definitions (summary_id, document_id, user_id, term, definition, source_pages)
  select summary_id, p_document_id, p_user_id, item.term, item.definition, coalesce(item.source_pages, '{}')
  from jsonb_to_recordset(coalesce(p_summary -> 'definitions', '[]'::jsonb)) as item(term text, definition text, source_pages integer[]);

  insert into public.exam_questions (summary_id, document_id, user_id, question, rationale, source_pages)
  select summary_id, p_document_id, p_user_id, item.question, coalesce(item.rationale, ''), coalesce(item.source_pages, '{}')
  from jsonb_to_recordset(coalesce(p_summary -> 'possible_questions', '[]'::jsonb)) as item(question text, rationale text, source_pages integer[]);

  return summary_id;
end;
$$;

revoke all on function public.replace_document_summary(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.replace_document_summary(uuid, uuid, jsonb) to service_role;

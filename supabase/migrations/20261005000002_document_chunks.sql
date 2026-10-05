create table public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  page_start integer not null,
  page_end integer not null,
  token_count integer not null,
  created_at timestamptz not null default now(),
  constraint document_chunks_index_nonnegative check (chunk_index >= 0),
  constraint document_chunks_content_length check (char_length(content) between 1 and 6000),
  constraint document_chunks_page_range check (page_start > 0 and page_end >= page_start),
  constraint document_chunks_token_count_positive check (token_count > 0),
  constraint document_chunks_document_index_unique unique (document_id, chunk_index)
);

create index document_chunks_user_document_idx
  on public.document_chunks (user_id, document_id, chunk_index);

alter table public.document_chunks enable row level security;
revoke all on public.document_chunks from anon, authenticated;
grant select on public.document_chunks to authenticated;
grant all on public.document_chunks to service_role;

create policy "Owners can read their document chunks"
  on public.document_chunks for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.documents
      where documents.id = document_chunks.document_id
        and documents.user_id = (select auth.uid())
    )
  );

create function public.replace_document_chunks(
  p_document_id uuid,
  p_user_id uuid,
  p_chunks jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.documents
    where id = p_document_id and user_id = p_user_id
  ) then
    raise exception 'Document owner check failed';
  end if;

  delete from public.document_chunks
  where document_id = p_document_id and user_id = p_user_id;

  insert into public.document_chunks (
    document_id, user_id, chunk_index, content, page_start, page_end, token_count
  )
  select
    p_document_id,
    p_user_id,
    chunk.chunk_index,
    chunk.content,
    chunk.page_start,
    chunk.page_end,
    chunk.token_count
  from jsonb_to_recordset(p_chunks) as chunk(
    chunk_index integer,
    content text,
    page_start integer,
    page_end integer,
    token_count integer
  );
end;
$$;

revoke all on function public.replace_document_chunks(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.replace_document_chunks(uuid, uuid, jsonb) to service_role;

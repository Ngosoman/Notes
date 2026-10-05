create extension if not exists vector with schema extensions;

alter table public.document_chunks
  add column embedding extensions.vector(1536);

create index document_chunks_embedding_idx
  on public.document_chunks using hnsw (embedding extensions.vector_cosine_ops)
  where embedding is not null;

create table public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default 'New study conversation',
  document_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chat_conversations_title_length check (char_length(title) between 1 and 200),
  constraint chat_conversations_document_ids_count check (cardinality(document_ids) between 1 and 20)
);

create index chat_conversations_user_updated_idx
  on public.chat_conversations (user_id, updated_at desc);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null,
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint chat_messages_role check (role in ('user', 'assistant')),
  constraint chat_messages_content_length check (char_length(content) between 1 and 12000),
  constraint chat_messages_citations_array check (jsonb_typeof(citations) = 'array')
);

create index chat_messages_conversation_created_idx
  on public.chat_messages (user_id, conversation_id, created_at);

create trigger chat_conversations_set_updated_at
  before update on public.chat_conversations
  for each row execute function public.set_updated_at();

alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

revoke all on public.chat_conversations, public.chat_messages from anon, authenticated;
grant select on public.chat_conversations, public.chat_messages to authenticated;
grant all on public.chat_conversations, public.chat_messages to service_role;

create policy "Owners can read their chat conversations"
  on public.chat_conversations for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Owners can read their chat messages"
  on public.chat_messages for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.chat_conversations
      where chat_conversations.id = chat_messages.conversation_id
        and chat_conversations.user_id = (select auth.uid())
    )
  );

create function public.set_document_chunk_embeddings(
  p_document_id uuid,
  p_user_id uuid,
  p_embeddings jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_count integer;
  requested_count integer;
begin
  if not exists (select 1 from public.documents where id = p_document_id and user_id = p_user_id) then
    raise exception 'Document owner check failed';
  end if;

  select count(*) into requested_count from jsonb_array_elements(p_embeddings);
  update public.document_chunks as chunk
  set embedding = item.embedding::extensions.vector
  from jsonb_to_recordset(p_embeddings) as item(chunk_index integer, embedding text)
  where chunk.document_id = p_document_id
    and chunk.user_id = p_user_id
    and chunk.chunk_index = item.chunk_index;

  get diagnostics updated_count = row_count;
  if updated_count <> requested_count then
    raise exception 'Embedding count did not match the stored chunk count';
  end if;
  return updated_count;
end;
$$;

create function public.match_document_chunks(
  p_query_embedding extensions.vector(1536),
  p_user_id uuid,
  p_document_ids uuid[],
  p_match_count integer default 8
)
returns table (
  id uuid,
  document_id uuid,
  chunk_index integer,
  content text,
  page_start integer,
  page_end integer,
  similarity double precision
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    chunk.id,
    chunk.document_id,
    chunk.chunk_index,
    chunk.content,
    chunk.page_start,
    chunk.page_end,
    1 - (chunk.embedding <=> p_query_embedding) as similarity
  from public.document_chunks as chunk
  where chunk.user_id = p_user_id
    and chunk.embedding is not null
    and chunk.document_id = any(p_document_ids)
  order by chunk.embedding <=> p_query_embedding
  limit greatest(1, least(p_match_count, 20));
$$;

revoke all on function public.match_document_chunks(extensions.vector, uuid, uuid[], integer) from public, anon, authenticated;
revoke all on function public.set_document_chunk_embeddings(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.match_document_chunks(extensions.vector, uuid, uuid[], integer) to service_role;
grant execute on function public.set_document_chunk_embeddings(uuid, uuid, jsonb) to service_role;

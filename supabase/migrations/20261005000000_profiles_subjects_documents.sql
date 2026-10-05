create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  institution text not null default '',
  course text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_full_name_length check (char_length(full_name) <= 100),
  constraint profiles_institution_length check (char_length(institution) <= 160),
  constraint profiles_course_length check (char_length(course) <= 160)
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  description text not null default '',
  color text not null default '#1D4ED8',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subjects_name_length check (name = btrim(name) and char_length(name) between 1 and 100),
  constraint subjects_description_length check (char_length(description) <= 500),
  constraint subjects_color_format check (color ~ '^#[0-9A-Fa-f]{6}$')
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  title text not null,
  filename text not null,
  storage_path text not null,
  mime_type text not null default 'application/pdf',
  file_size_bytes bigint not null,
  page_count integer,
  status text not null default 'uploading',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint documents_title_length check (char_length(btrim(title)) between 1 and 200),
  constraint documents_filename_length check (char_length(filename) between 1 and 255),
  constraint documents_storage_path_length check (char_length(storage_path) between 1 and 1024),
  constraint documents_pdf_mime_type check (mime_type = 'application/pdf'),
  constraint documents_positive_file_size check (file_size_bytes > 0),
  constraint documents_positive_page_count check (page_count is null or page_count > 0),
  constraint documents_status check (status in ('uploading', 'uploaded', 'processing', 'completed', 'failed')),
  constraint documents_user_storage_path_unique unique (user_id, storage_path)
);

create unique index subjects_user_name_unique
  on public.subjects (user_id, lower(name));
create index subjects_user_created_at_idx
  on public.subjects (user_id, created_at desc);
create index documents_user_created_at_idx
  on public.documents (user_id, created_at desc);
create index documents_user_status_idx
  on public.documents (user_id, status);
create index documents_user_subject_idx
  on public.documents (user_id, subject_id)
  where subject_id is not null;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), ''),
    coalesce(new.email, '')
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  return new;
end;
$$;

create function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
    set email = coalesce(new.email, ''),
        updated_at = now()
    where id = new.id;
  end if;

  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger subjects_set_updated_at
  before update on public.subjects
  for each row execute function public.set_updated_at();
create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_for_auth_user();
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute function public.sync_profile_email();

revoke all on function public.create_profile_for_auth_user() from public, anon, authenticated;
revoke all on function public.sync_profile_email() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.documents enable row level security;

revoke all on public.profiles, public.subjects, public.documents from anon;
grant select on public.profiles to authenticated;
grant insert (id, full_name, institution, course) on public.profiles to authenticated;
grant update (full_name, institution, course) on public.profiles to authenticated;
grant select, insert, update, delete on public.subjects to authenticated;
grant select, insert, update, delete on public.documents to authenticated;

create policy "Profiles are readable by their owner"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "Profiles can be created by their owner"
  on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy "Profiles can be updated by their owner"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Subjects are readable by their owner"
  on public.subjects for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Subjects can be created by their owner"
  on public.subjects for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Subjects can be updated by their owner"
  on public.subjects for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Subjects can be deleted by their owner"
  on public.subjects for delete to authenticated
  using ((select auth.uid()) = user_id);

create policy "Documents are readable by their owner"
  on public.documents for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Documents can be created by their owner"
  on public.documents for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (
      subject_id is null
      or exists (
        select 1 from public.subjects
        where subjects.id = documents.subject_id
          and subjects.user_id = (select auth.uid())
      )
    )
  );
create policy "Documents can be updated by their owner"
  on public.documents for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (
      subject_id is null
      or exists (
        select 1 from public.subjects
        where subjects.id = documents.subject_id
          and subjects.user_id = (select auth.uid())
      )
    )
  );
create policy "Documents can be deleted by their owner"
  on public.documents for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Durable records for the standalone Unified Chat capability.
--
-- These tables intentionally do not replace or reference the existing
-- client-local workflow chat used by onboarding, Arc/Goal creation, or To-do
-- management. The authenticated Kwilt client owns the records directly under
-- row-level security; the embedded web workbench receives credential-free
-- snapshots only.

create extension if not exists "pgcrypto";

create table if not exists public.kwilt_agent_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat' check (char_length(title) between 1 and 160),
  status text not null default 'active' check (status in ('active', 'archived')),
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'active' and archived_at is null)
    or (status = 'archived' and archived_at is not null)
  )
);

create index if not exists kwilt_agent_threads_user_updated_idx
  on public.kwilt_agent_threads(user_id, updated_at desc);

create index if not exists kwilt_agent_threads_user_status_updated_idx
  on public.kwilt_agent_threads(user_id, status, updated_at desc);

create table if not exists public.kwilt_agent_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.kwilt_agent_threads(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  body text not null check (char_length(body) between 1 and 100000),
  feedback text null check (feedback in ('positive', 'negative')),
  client_request_id text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kwilt_agent_messages_thread_created_idx
  on public.kwilt_agent_messages(thread_id, created_at, id);

create unique index if not exists kwilt_agent_messages_user_request_idx
  on public.kwilt_agent_messages(user_id, client_request_id)
  where client_request_id is not null;

create table if not exists public.kwilt_agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.kwilt_agent_threads(id) on delete cascade,
  user_message_id uuid null references public.kwilt_agent_messages(id) on delete set null,
  assistant_message_id uuid null references public.kwilt_agent_messages(id) on delete set null,
  status text not null default 'queued'
    check (status in ('queued', 'active', 'complete', 'partial', 'stopped', 'steered', 'failed')),
  error_code text null,
  error_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz null
);

create index if not exists kwilt_agent_runs_thread_created_idx
  on public.kwilt_agent_runs(thread_id, created_at, id);

create unique index if not exists kwilt_agent_runs_one_active_per_thread_idx
  on public.kwilt_agent_runs(thread_id)
  where status in ('queued', 'active');

grant select, insert, update, delete
  on table public.kwilt_agent_threads,
    public.kwilt_agent_messages,
    public.kwilt_agent_runs
  to authenticated;

revoke all
  on table public.kwilt_agent_threads,
    public.kwilt_agent_messages,
    public.kwilt_agent_runs
  from anon;

alter table public.kwilt_agent_threads enable row level security;
alter table public.kwilt_agent_messages enable row level security;
alter table public.kwilt_agent_runs enable row level security;

create policy "kwilt_agent_threads_owner_select"
  on public.kwilt_agent_threads for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "kwilt_agent_threads_owner_insert"
  on public.kwilt_agent_threads for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "kwilt_agent_threads_owner_update"
  on public.kwilt_agent_threads for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "kwilt_agent_threads_owner_delete"
  on public.kwilt_agent_threads for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "kwilt_agent_messages_owner_select"
  on public.kwilt_agent_messages for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "kwilt_agent_messages_owner_insert"
  on public.kwilt_agent_messages for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.kwilt_agent_threads thread
      where thread.id = thread_id
        and thread.user_id = (select auth.uid())
    )
  );

create policy "kwilt_agent_messages_owner_update"
  on public.kwilt_agent_messages for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.kwilt_agent_threads thread
      where thread.id = thread_id
        and thread.user_id = (select auth.uid())
    )
  );

create policy "kwilt_agent_messages_owner_delete"
  on public.kwilt_agent_messages for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "kwilt_agent_runs_owner_select"
  on public.kwilt_agent_runs for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "kwilt_agent_runs_owner_insert"
  on public.kwilt_agent_runs for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.kwilt_agent_threads thread
      where thread.id = thread_id
        and thread.user_id = (select auth.uid())
    )
  );

create policy "kwilt_agent_runs_owner_update"
  on public.kwilt_agent_runs for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.kwilt_agent_threads thread
      where thread.id = thread_id
        and thread.user_id = (select auth.uid())
    )
  );

create policy "kwilt_agent_runs_owner_delete"
  on public.kwilt_agent_runs for delete
  to authenticated
  using ((select auth.uid()) = user_id);

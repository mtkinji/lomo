-- Phase 6: small editable assistant drafts. These are not capability proposals or receipts.

create table public.kwilt_agent_artifacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.kwilt_agent_threads(id) on delete cascade,
  run_id uuid not null references public.kwilt_agent_runs(id) on delete cascade,
  message_id uuid not null references public.kwilt_agent_messages(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  kind text not null check (kind in ('document', 'checklist', 'table', 'code')),
  content text not null check (char_length(btrim(content)) between 1 and 20000),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (run_id)
);

create index kwilt_agent_artifacts_thread_created_idx
  on public.kwilt_agent_artifacts(thread_id, created_at, id);

grant select, insert, update, delete on table public.kwilt_agent_artifacts to authenticated;
revoke all on table public.kwilt_agent_artifacts from anon;
alter table public.kwilt_agent_artifacts enable row level security;

create policy "kwilt_agent_artifacts_owner_select"
  on public.kwilt_agent_artifacts for select to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);

create policy "kwilt_agent_artifacts_owner_insert"
  on public.kwilt_agent_artifacts for insert to authenticated
  with check (
    public.is_non_anonymous_kwilt_user()
    and (select auth.uid()) = user_id
    and exists (
      select 1
      from public.kwilt_agent_runs run
      join public.kwilt_agent_messages message
        on message.id = public.kwilt_agent_artifacts.message_id
      join public.kwilt_agent_threads thread
        on thread.id = public.kwilt_agent_artifacts.thread_id
      where run.id = public.kwilt_agent_artifacts.run_id
        and run.thread_id = public.kwilt_agent_artifacts.thread_id
        and run.user_id = (select auth.uid())
        and message.thread_id = public.kwilt_agent_artifacts.thread_id
        and message.user_id = (select auth.uid())
        and message.role = 'assistant' and thread.user_id = (select auth.uid())
    )
  );

create policy "kwilt_agent_artifacts_owner_update"
  on public.kwilt_agent_artifacts for update to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id)
  with check (
    public.is_non_anonymous_kwilt_user()
    and (select auth.uid()) = user_id
    and exists (
      select 1
      from public.kwilt_agent_runs run
      join public.kwilt_agent_messages message
        on message.id = public.kwilt_agent_artifacts.message_id
      join public.kwilt_agent_threads thread
        on thread.id = public.kwilt_agent_artifacts.thread_id
      where run.id = public.kwilt_agent_artifacts.run_id
        and run.thread_id = public.kwilt_agent_artifacts.thread_id
        and run.user_id = (select auth.uid())
        and message.thread_id = public.kwilt_agent_artifacts.thread_id
        and message.user_id = (select auth.uid())
        and message.role = 'assistant'
        and thread.user_id = (select auth.uid())
    )
  );

create policy "kwilt_agent_artifacts_owner_delete"
  on public.kwilt_agent_artifacts for delete to authenticated
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);

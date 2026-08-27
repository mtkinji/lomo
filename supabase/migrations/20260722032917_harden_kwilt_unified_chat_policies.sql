-- Limit Unified Chat persistence to signed-in, non-anonymous Kwilt accounts.
-- Supabase anonymous sessions use the authenticated Postgres role, so the
-- JWT claim must also be checked explicitly.

create or replace function public.is_non_anonymous_kwilt_user()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'is_anonymous'), 'false') = 'false';
$$;

revoke all on function public.is_non_anonymous_kwilt_user() from public;
grant execute on function public.is_non_anonymous_kwilt_user() to authenticated;

alter policy "kwilt_agent_threads_owner_select"
  on public.kwilt_agent_threads
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);

alter policy "kwilt_agent_threads_owner_insert"
  on public.kwilt_agent_threads
  with check (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);

alter policy "kwilt_agent_threads_owner_update"
  on public.kwilt_agent_threads
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id)
  with check (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);

alter policy "kwilt_agent_threads_owner_delete"
  on public.kwilt_agent_threads
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);

alter policy "kwilt_agent_messages_owner_select"
  on public.kwilt_agent_messages
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);

alter policy "kwilt_agent_messages_owner_insert"
  on public.kwilt_agent_messages
  with check (
    public.is_non_anonymous_kwilt_user()
    and (select auth.uid()) = user_id
    and exists (
      select 1
      from public.kwilt_agent_threads thread
      where thread.id = thread_id
        and thread.user_id = (select auth.uid())
    )
  );

alter policy "kwilt_agent_messages_owner_update"
  on public.kwilt_agent_messages
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id)
  with check (
    public.is_non_anonymous_kwilt_user()
    and (select auth.uid()) = user_id
    and exists (
      select 1
      from public.kwilt_agent_threads thread
      where thread.id = thread_id
        and thread.user_id = (select auth.uid())
    )
  );

alter policy "kwilt_agent_messages_owner_delete"
  on public.kwilt_agent_messages
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);

alter policy "kwilt_agent_runs_owner_select"
  on public.kwilt_agent_runs
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);

alter policy "kwilt_agent_runs_owner_insert"
  on public.kwilt_agent_runs
  with check (
    public.is_non_anonymous_kwilt_user()
    and (select auth.uid()) = user_id
    and exists (
      select 1
      from public.kwilt_agent_threads thread
      where thread.id = thread_id
        and thread.user_id = (select auth.uid())
    )
  );

alter policy "kwilt_agent_runs_owner_update"
  on public.kwilt_agent_runs
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id)
  with check (
    public.is_non_anonymous_kwilt_user()
    and (select auth.uid()) = user_id
    and exists (
      select 1
      from public.kwilt_agent_threads thread
      where thread.id = thread_id
        and thread.user_id = (select auth.uid())
    )
  );

alter policy "kwilt_agent_runs_owner_delete"
  on public.kwilt_agent_runs
  using (public.is_non_anonymous_kwilt_user() and (select auth.uid()) = user_id);

create index if not exists kwilt_agent_runs_user_message_idx
  on public.kwilt_agent_runs(user_message_id)
  where user_message_id is not null;

create index if not exists kwilt_agent_runs_assistant_message_idx
  on public.kwilt_agent_runs(assistant_message_id)
  where assistant_message_id is not null;

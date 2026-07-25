-- Keep artifact linkage inside the authenticated owner's Chat graph on direct updates.

drop policy if exists "kwilt_agent_artifacts_owner_update"
  on public.kwilt_agent_artifacts;

create policy "kwilt_agent_artifacts_owner_update"
  on public.kwilt_agent_artifacts for update to authenticated
  using (
    public.is_non_anonymous_kwilt_user()
    and (select auth.uid()) = user_id
  )
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

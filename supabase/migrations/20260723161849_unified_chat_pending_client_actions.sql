create table public.kwilt_agent_client_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid not null references public.kwilt_agent_threads(id) on delete cascade,
  run_id uuid not null references public.kwilt_agent_runs(id) on delete cascade,
  message_id uuid null references public.kwilt_agent_messages(id) on delete set null,
  capability_id text not null,
  action_type text not null,
  target_type text null,
  target_id text null,
  title text not null check (char_length(title) between 1 and 500),
  consequence_summary text not null check (char_length(consequence_summary) between 1 and 2000),
  payload jsonb not null default '{}'::jsonb,
  idempotency_key text not null check (char_length(idempotency_key) between 1 and 200),
  status text not null default 'pending_client_action'
    check (status in ('pending_client_action', 'presenting', 'completed', 'declined', 'failed')),
  result jsonb null,
  error_code text null,
  error_message text null,
  version integer not null default 1 check (version > 0),
  presented_at timestamptz null,
  completed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, capability_id, idempotency_key)
);

create index kwilt_agent_client_actions_thread_created_idx
  on public.kwilt_agent_client_actions(thread_id, created_at, id);

create index kwilt_agent_client_actions_pending_idx
  on public.kwilt_agent_client_actions(user_id, status, created_at)
  where status in ('pending_client_action', 'presenting');

grant select, insert on table public.kwilt_agent_client_actions to authenticated;
revoke all on table public.kwilt_agent_client_actions from anon;

alter table public.kwilt_agent_client_actions enable row level security;

create policy "kwilt_agent_client_actions_owner_select"
  on public.kwilt_agent_client_actions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "kwilt_agent_client_actions_owner_insert"
  on public.kwilt_agent_client_actions for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.kwilt_agent_threads thread
      where thread.id = thread_id and thread.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.kwilt_agent_runs run
      where run.id = run_id and run.thread_id = thread_id and run.user_id = (select auth.uid())
    )
  );

create or replace function public.transition_kwilt_agent_client_action(
  p_action_id uuid,
  p_from_status text,
  p_to_status text,
  p_expected_version integer,
  p_result jsonb default null,
  p_error_code text default null,
  p_error_message text default null,
  p_presented_at timestamptz default null,
  p_completed_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action public.kwilt_agent_client_actions%rowtype;
begin
  select * into v_action
  from public.kwilt_agent_client_actions as candidate
  where candidate.id = p_action_id
    and candidate.user_id = (select auth.uid())
  for update;

  if not found then raise exception 'client_action_not_found'; end if;
  if v_action.status <> p_from_status then raise exception 'invalid_client_action_source_status'; end if;
  if v_action.version <> p_expected_version then raise exception 'stale_client_action_version'; end if;
  if not (
    (v_action.status = 'pending_client_action' and p_to_status in ('presenting', 'declined'))
    or (v_action.status = 'presenting' and p_to_status in ('completed', 'declined', 'failed'))
  ) then
    raise exception 'invalid_client_action_transition';
  end if;

  update public.kwilt_agent_client_actions
  set status = p_to_status,
      result = case
        when p_to_status in ('completed', 'declined') then coalesce(p_result, '{}'::jsonb)
        else result
      end,
      error_code = case when p_to_status = 'failed' then p_error_code else null end,
      error_message = case when p_to_status = 'failed' then p_error_message else null end,
      presented_at = case
        when p_to_status = 'presenting' then coalesce(p_presented_at, now())
        else presented_at
      end,
      completed_at = case
        when p_to_status in ('completed', 'declined', 'failed') then coalesce(p_completed_at, now())
        else completed_at
      end,
      version = version + 1,
      updated_at = now()
  where id = v_action.id
  returning * into v_action;

  return to_jsonb(v_action);
end;
$$;

revoke all on function public.transition_kwilt_agent_client_action(
  uuid, text, text, integer, jsonb, text, text, timestamptz, timestamptz
) from public, anon;
grant execute on function public.transition_kwilt_agent_client_action(
  uuid, text, text, integer, jsonb, text, text, timestamptz, timestamptz
) to authenticated;

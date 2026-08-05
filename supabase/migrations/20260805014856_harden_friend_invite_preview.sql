-- Repair the existing Friends projection against Kwilt's actual auth identity
-- source and add a bounded, privacy-preserving public invite preview budget.

create or replace function public.get_kwilt_friendships()
returns table (
  friendship_id uuid,
  friend_user_id uuid,
  relationship_status text,
  initiated_by_me boolean,
  incoming_request boolean,
  created_at timestamptz,
  accepted_at timestamptz,
  display_name text,
  avatar_url text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null or coalesce(auth.jwt()->>'is_anonymous', 'false') = 'true' then
    raise exception 'authentication_required';
  end if;

  return query
  select
    candidate.id,
    case when candidate.user_a = v_actor then candidate.user_b else candidate.user_a end,
    candidate.status,
    candidate.initiated_by = v_actor,
    candidate.status = 'pending' and candidate.initiated_by <> v_actor,
    candidate.created_at,
    candidate.accepted_at,
    coalesce(
      nullif(btrim(friend_identity.raw_user_meta_data->>'full_name'), ''),
      nullif(btrim(friend_identity.raw_user_meta_data->>'name'), ''),
      'Friend'
    )::text,
    case
      when coalesce(
        nullif(btrim(friend_identity.raw_user_meta_data->>'avatar_url'), ''),
        nullif(btrim(friend_identity.raw_user_meta_data->>'picture'), '')
      ) ~ '^https://'
      then coalesce(
        nullif(btrim(friend_identity.raw_user_meta_data->>'avatar_url'), ''),
        nullif(btrim(friend_identity.raw_user_meta_data->>'picture'), '')
      )
      else null
    end::text
  from public.kwilt_friendships candidate
  left join auth.users friend_identity
    on friend_identity.id = case
      when candidate.user_a = v_actor then candidate.user_b
      else candidate.user_a
    end
  where (candidate.user_a = v_actor or candidate.user_b = v_actor)
    and candidate.status in ('pending', 'active')
  order by candidate.created_at desc;
end;
$$;

revoke all on function public.get_kwilt_friendships() from public, anon;
grant execute on function public.get_kwilt_friendships() to authenticated;

create table public.kwilt_friend_invite_preview_budgets (
  install_hash text not null check (install_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz not null,
  attempts integer not null default 0 check (attempts >= 0),
  primary key (install_hash, window_started_at)
);

create index kwilt_friend_invite_preview_budgets_window_idx
  on public.kwilt_friend_invite_preview_budgets(window_started_at);

alter table public.kwilt_friend_invite_preview_budgets enable row level security;
revoke all on public.kwilt_friend_invite_preview_budgets from public, anon, authenticated, service_role;

create or replace function public.consume_kwilt_friend_invite_preview_budget(p_install_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := date_trunc('hour', now());
  v_attempts integer;
begin
  if p_install_hash is null or p_install_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_preview_identity';
  end if;

  delete from public.kwilt_friend_invite_preview_budgets
  where window_started_at < now() - interval '7 days';

  insert into public.kwilt_friend_invite_preview_budgets (
    install_hash, window_started_at, attempts
  ) values (
    p_install_hash, v_window, 1
  )
  on conflict (install_hash, window_started_at)
  do update set attempts = least(public.kwilt_friend_invite_preview_budgets.attempts + 1, 1000)
  returning attempts into v_attempts;

  return v_attempts <= 30;
end;
$$;

revoke all on function public.consume_kwilt_friend_invite_preview_budget(text) from public, anon, authenticated;
grant execute on function public.consume_kwilt_friend_invite_preview_budget(text) to service_role;

comment on function public.get_kwilt_friendships() is
  'Returns the authenticated participant safe active and pending Friend projection using non-authoritative auth display metadata.';
comment on function public.consume_kwilt_friend_invite_preview_budget(text) is
  'Consumes one public Friend-preview attempt for a server-hashed installation identity; raw installation IDs are never stored.';

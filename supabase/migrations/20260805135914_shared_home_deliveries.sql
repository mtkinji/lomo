-- Recipient-scoped projection for meaningful cross-capability family events.
-- Source capabilities remain authoritative; this table owns delivery only.

create table public.kwilt_shared_deliveries (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_kind text not null check (event_kind in ('goal_invitation', 'game_turn')),
  source_capability text not null check (source_capability in ('goals', 'games')),
  source_entity_type text not null check (source_entity_type in ('goal_invite', 'game_session')),
  source_entity_id text not null,
  actor_display_name text,
  title text not null,
  body text not null,
  destination jsonb not null check (jsonb_typeof(destination) = 'object'),
  state text not null default 'pending' check (state in ('pending', 'settled', 'expired', 'unavailable')),
  settled_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  settled_at timestamptz,
  expires_at timestamptz,
  retain_until timestamptz not null default (now() + interval '30 days'),
  constraint kwilt_shared_deliveries_idempotency unique (idempotency_key),
  constraint kwilt_shared_deliveries_idempotency_length check (char_length(idempotency_key) between 1 and 240),
  constraint kwilt_shared_deliveries_source_id_length check (char_length(source_entity_id) between 1 and 240),
  constraint kwilt_shared_deliveries_actor_name_length check (actor_display_name is null or char_length(actor_display_name) <= 80),
  constraint kwilt_shared_deliveries_title_length check (char_length(title) between 1 and 180),
  constraint kwilt_shared_deliveries_body_length check (char_length(body) between 1 and 240),
  constraint kwilt_shared_deliveries_destination_kind check (
    (event_kind = 'goal_invitation' and source_capability = 'goals' and source_entity_type = 'goal_invite'
      and destination ->> 'kind' = 'goal_invite'
      and nullif(btrim(destination ->> 'inviteCode'), '') is not null)
    or
    (event_kind = 'game_turn' and source_capability = 'games' and source_entity_type = 'game_session'
      and destination ->> 'kind' = 'game_room'
      and nullif(btrim(destination ->> 'sessionId'), '') is not null)
  )
);

create index kwilt_shared_deliveries_recipient_state_created_idx
  on public.kwilt_shared_deliveries(recipient_user_id, state, created_at desc);
create index kwilt_shared_deliveries_source_idx
  on public.kwilt_shared_deliveries(source_capability, source_entity_type, source_entity_id);
create index kwilt_shared_deliveries_retention_idx
  on public.kwilt_shared_deliveries(retain_until);

alter table public.kwilt_shared_deliveries enable row level security;

create policy "Recipients read own shared deliveries"
  on public.kwilt_shared_deliveries
  for select
  to authenticated
  using (
    (select auth.uid()) is not null
    and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
    and recipient_user_id = (select auth.uid())
  );

revoke all on public.kwilt_shared_deliveries from anon;
grant select on public.kwilt_shared_deliveries to authenticated;
revoke insert, update, delete on public.kwilt_shared_deliveries from authenticated;
grant all on public.kwilt_shared_deliveries to service_role;

create or replace function public.sync_goal_invite_shared_delivery()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    update public.kwilt_shared_deliveries
    set
      state = 'unavailable',
      settled_reason = 'source_deleted',
      settled_at = now(),
      updated_at = now(),
      actor_display_name = null,
      title = 'Invitation unavailable',
      body = 'This invitation is no longer available.'
    where event_kind = 'goal_invitation'
      and source_entity_id = old.id::text
      and state = 'pending';
    return old;
  end if;

  if new.recipient_state in ('accepted', 'declined', 'revoked') then
    update public.kwilt_shared_deliveries
    set
      state = 'settled',
      settled_reason = new.recipient_state,
      settled_at = now(),
      updated_at = now()
    where event_kind = 'goal_invitation'
      and source_entity_id = new.id::text
      and state = 'pending';
  end if;

  return new;
end;
$$;

revoke all on function public.sync_goal_invite_shared_delivery() from public, anon, authenticated;

create trigger sync_goal_invite_shared_delivery_update
after update of recipient_state on public.kwilt_invites
for each row execute function public.sync_goal_invite_shared_delivery();

create trigger sync_goal_invite_shared_delivery_delete
after delete on public.kwilt_invites
for each row execute function public.sync_goal_invite_shared_delivery();

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'kwilt_shared_deliveries'
    ) then
    alter publication supabase_realtime add table public.kwilt_shared_deliveries;
  end if;
end;
$$;

comment on table public.kwilt_shared_deliveries is
  'Minimum recipient-only projection of meaningful capability-owned family events for Shared Home.';

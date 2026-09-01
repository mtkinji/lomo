-- Period-correct, idempotent RevenueCat lifecycle storage.
create table if not exists public.kwilt_revenuecat_events (
  event_id text primary key,
  received_at timestamptz not null default now(),
  occurred_at timestamptz not null,
  revenuecat_app_user_id text not null,
  aliases text[] not null default '{}',
  transaction_id text null,
  original_transaction_id text null,
  product_id text null,
  entitlement_ids text[] not null default '{}',
  period_type text null,
  expires_at timestamptz null,
  environment text null,
  event_type text not null,
  price numeric null,
  currency text null,
  tax_percentage numeric null,
  commission_percentage numeric null,
  offer_code text null,
  presented_offering_id text null,
  is_family_share boolean null,
  parsed_payload jsonb not null default '{}'::jsonb
);

create index if not exists kwilt_revenuecat_events_user_occurred_idx
  on public.kwilt_revenuecat_events (revenuecat_app_user_id, occurred_at desc);

alter table public.kwilt_revenuecat_events enable row level security;
revoke all on public.kwilt_revenuecat_events from public, anon, authenticated;

alter table public.kwilt_revenuecat_subscriptions
  add column if not exists will_renew boolean null,
  add column if not exists access_state text not null default 'expired',
  add column if not exists grace_expires_at timestamptz null,
  add column if not exists latest_provider_event_at timestamptz null,
  add column if not exists latest_provider_event_id text null,
  add column if not exists environment text null,
  add column if not exists cleanup_status text not null default 'not_scheduled',
  add column if not exists cleanup_last_attempt_at timestamptz null,
  add column if not exists cleanup_last_error_code text null;

alter table public.kwilt_revenuecat_subscriptions
  drop constraint if exists kwilt_revenuecat_subscriptions_access_state_check;
alter table public.kwilt_revenuecat_subscriptions
  add constraint kwilt_revenuecat_subscriptions_access_state_check
  check (access_state in ('active', 'grace', 'expired', 'refunded'));

alter table public.kwilt_revenuecat_subscriptions
  drop constraint if exists kwilt_revenuecat_subscriptions_cleanup_status_check;
alter table public.kwilt_revenuecat_subscriptions
  add constraint kwilt_revenuecat_subscriptions_cleanup_status_check
  check (cleanup_status in ('not_scheduled', 'disabled', 'pending', 'running', 'complete', 'failed'));

create or replace function public.kwilt_has_active_pro()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    exists (
      select 1
      from public.kwilt_revenuecat_subscriptions s
      where s.revenuecat_app_user_id = (select auth.uid())::text
        and s.is_pro is true
        and (s.expires_at is null or s.expires_at > now())
    )
    or exists (
      select 1
      from public.kwilt_pro_entitlements e
      where e.quota_key = 'user:' || (select auth.uid())::text
        and e.is_pro is true
        and (e.expires_at is null or e.expires_at > now())
    ),
    false
  );
$$;

revoke all on function public.kwilt_has_active_pro() from public, anon;
grant execute on function public.kwilt_has_active_pro() to authenticated, service_role;

create table if not exists public.kwilt_monetization_downgrade_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  capability text not null,
  subject_id uuid null,
  provider_event_id text not null references public.kwilt_revenuecat_events(event_id),
  reason text not null check (reason in ('expired', 'refunded')),
  desired_version bigint null,
  status text not null default 'pending' check (status in ('pending', 'acknowledged', 'failed')),
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz null,
  unique (capability, subject_id, provider_event_id)
);

alter table public.kwilt_monetization_downgrade_receipts enable row level security;
revoke all on public.kwilt_monetization_downgrade_receipts from public, anon, authenticated;

create or replace function public.kwilt_require_family_screen_time_pro_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_table_name = 'kwilt_family_screen_time_agreements' and new.active is not true then return new; end if;
  if tg_table_name = 'kwilt_family_screen_time_selections' and new.status <> 'active' then return new; end if;
  if tg_table_name = 'kwilt_family_screen_time_overrides' and new.status <> 'active' then return new; end if;
  if not public.kwilt_has_active_pro() then raise exception 'kwilt_pro_required'; end if;
  return new;
end;
$$;

revoke all on function public.kwilt_require_family_screen_time_pro_write() from public, anon, authenticated;

drop trigger if exists require_pro_for_family_screen_time_agreement on public.kwilt_family_screen_time_agreements;
create trigger require_pro_for_family_screen_time_agreement
before insert or update of active, rule, selection_id on public.kwilt_family_screen_time_agreements
for each row execute function public.kwilt_require_family_screen_time_pro_write();

drop trigger if exists require_pro_for_family_screen_time_selection on public.kwilt_family_screen_time_selections;
create trigger require_pro_for_family_screen_time_selection
before insert or update of status, selection_ref on public.kwilt_family_screen_time_selections
for each row execute function public.kwilt_require_family_screen_time_pro_write();

drop trigger if exists require_pro_for_family_screen_time_override on public.kwilt_family_screen_time_overrides;
create trigger require_pro_for_family_screen_time_override
before insert or update of status, action, expires_at, usage_minutes on public.kwilt_family_screen_time_overrides
for each row execute function public.kwilt_require_family_screen_time_pro_write();

create or replace function public.kwilt_deactivate_family_screen_time_for_user(
  p_user_id uuid,
  p_reason text,
  p_provider_event_id text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subject record;
  v_count integer := 0;
begin
  if p_user_id is null or p_reason not in ('expired', 'refunded') or nullif(trim(p_provider_event_id), '') is null then
    raise exception 'invalid_monetization_downgrade';
  end if;
  for v_subject in
    select distinct subject.id
    from public.kwilt_family_screen_time_subjects subject
    join public.kwilt_household_memberships membership on membership.household_id = subject.household_id
    join public.kwilt_person_auth_bindings binding on binding.person_id = membership.person_id
    where binding.user_id = p_user_id and binding.status = 'active'
      and membership.status = 'active' and membership.role in ('owner', 'caregiver')
  loop
    continue when exists (
      select 1 from public.kwilt_monetization_downgrade_receipts receipt
      where receipt.capability = 'family_screen_time'
        and receipt.subject_id = v_subject.id
        and receipt.provider_event_id = p_provider_event_id
    );
    update public.kwilt_family_screen_time_agreements
      set active = false, version = version + 1, updated_at = now()
      where subject_id = v_subject.id and active is true;
    update public.kwilt_family_screen_time_overrides
      set status = 'cancelled', cancelled_at = now(), updated_at = now()
      where subject_id = v_subject.id and status = 'active';
    update public.kwilt_family_screen_time_subjects
      set desired_policy_version = desired_policy_version + 1, updated_at = now()
      where id = v_subject.id;
    insert into public.kwilt_monetization_downgrade_receipts
      (user_id, capability, subject_id, provider_event_id, reason, desired_version)
    select p_user_id, 'family_screen_time', v_subject.id, p_provider_event_id, p_reason, desired_policy_version
      from public.kwilt_family_screen_time_subjects where id = v_subject.id
    on conflict (capability, subject_id, provider_event_id) do nothing;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.kwilt_deactivate_family_screen_time_for_user(uuid, text, text) from public, anon, authenticated;
grant execute on function public.kwilt_deactivate_family_screen_time_for_user(uuid, text, text) to service_role;

create table if not exists public.kwilt_mvp_preview_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  capability text not null check (capability in ('live_conversation', 'cook_mode')),
  occurred_at timestamptz not null default now(),
  lease_expires_at timestamptz null
);

create index if not exists kwilt_mvp_preview_usage_capability_time_idx
  on public.kwilt_mvp_preview_usage_events (capability, occurred_at desc);
create index if not exists kwilt_mvp_preview_usage_user_time_idx
  on public.kwilt_mvp_preview_usage_events (user_id, capability, occurred_at desc);
alter table public.kwilt_mvp_preview_usage_events enable row level security;
revoke all on public.kwilt_mvp_preview_usage_events from public, anon, authenticated;

create or replace function public.kwilt_reserve_mvp_preview_usage(
  p_user_id uuid,
  p_capability text,
  p_per_minute integer,
  p_per_user_day integer,
  p_global_day integer,
  p_lease_seconds integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_lease_expires_at timestamptz;
begin
  if p_user_id is null or p_capability not in ('live_conversation', 'cook_mode')
    or p_per_minute < 1 or p_per_user_day < 1 or p_global_day < 1 or p_lease_seconds < 0 then
    raise exception 'invalid_mvp_preview_reservation';
  end if;
  perform pg_advisory_xact_lock(hashtext(p_capability || ':' || p_user_id::text));
  if p_lease_seconds > 0 and exists (
    select 1 from public.kwilt_mvp_preview_usage_events
    where user_id = p_user_id and capability = p_capability and lease_expires_at > v_now
  ) then return jsonb_build_object('allowed', false, 'code', 'active_lease', 'leaseExpiresAt', null); end if;
  if (select count(*) from public.kwilt_mvp_preview_usage_events
      where user_id = p_user_id and capability = p_capability and occurred_at >= v_now - interval '1 minute') >= p_per_minute
  then return jsonb_build_object('allowed', false, 'code', 'per_minute_limit', 'leaseExpiresAt', null); end if;
  if (select count(*) from public.kwilt_mvp_preview_usage_events
      where user_id = p_user_id and capability = p_capability and occurred_at >= date_trunc('day', v_now at time zone 'UTC') at time zone 'UTC') >= p_per_user_day
  then return jsonb_build_object('allowed', false, 'code', 'user_daily_limit', 'leaseExpiresAt', null); end if;
  if (select count(*) from public.kwilt_mvp_preview_usage_events
      where capability = p_capability and occurred_at >= date_trunc('day', v_now at time zone 'UTC') at time zone 'UTC') >= p_global_day
  then return jsonb_build_object('allowed', false, 'code', 'global_daily_limit', 'leaseExpiresAt', null); end if;
  v_lease_expires_at := case when p_lease_seconds > 0 then v_now + make_interval(secs => p_lease_seconds) else null end;
  insert into public.kwilt_mvp_preview_usage_events(user_id, capability, occurred_at, lease_expires_at)
    values (p_user_id, p_capability, v_now, v_lease_expires_at);
  return jsonb_build_object('allowed', true, 'code', 'reserved', 'leaseExpiresAt', v_lease_expires_at);
end;
$$;

revoke all on function public.kwilt_reserve_mvp_preview_usage(uuid, text, integer, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.kwilt_reserve_mvp_preview_usage(uuid, text, integer, integer, integer, integer) to service_role;

-- Money remains readable after downgrade, while direct authenticated writes
-- pause. Trusted provider sync functions use service_role and must perform
-- their own entitlement check before mutating provider-owned records.
create or replace function public.kwilt_require_money_pro_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) = 'service_role' then return new; end if;
  if not public.kwilt_has_active_pro() then raise exception 'kwilt_pro_required'; end if;
  return new;
end;
$$;

revoke all on function public.kwilt_require_money_pro_write() from public, anon, authenticated;

do $$
declare v_table text;
begin
  foreach v_table in array array[
    'budget_categories', 'budget_category_groups', 'budget_category_group_members',
    'budget_plans', 'budget_transaction_allocations', 'budget_transaction_match_rules',
    'budget_forecast_settings', 'budget_living_plan_preferences', 'budget_living_target_intents',
    'budget_planning_income_sources', 'budget_living_plan_overrides', 'budget_planning_basis_overrides'
  ] loop
    if to_regclass('public.' || v_table) is not null then
      execute format('drop trigger if exists require_pro_for_money_write on public.%I', v_table);
      execute format(
        'create trigger require_pro_for_money_write before insert or update on public.%I for each row execute function public.kwilt_require_money_pro_write()',
        v_table
      );
    end if;
  end loop;
end $$;

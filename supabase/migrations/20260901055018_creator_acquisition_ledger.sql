-- Creator attribution is deliberately separate from subscription entitlement.
-- These tables never grant Pro and are private to service-role workflows.

create table if not exists public.kwilt_creator_partners (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(display_name) between 1 and 120),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'ended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kwilt_creator_campaigns (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.kwilt_creator_partners(id) on delete restrict,
  code text not null unique check (code = lower(code) and code ~ '^[a-z0-9][a-z0-9_-]{2,39}$'),
  slug text not null unique check (slug = lower(slug) and slug ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'ended')),
  approved_promise text not null default '' check (char_length(approved_promise) <= 500),
  challenge_template jsonb not null default '{}'::jsonb check (jsonb_typeof(challenge_template) = 'object'),
  storefronts text[] not null default array['USA']::text[],
  starts_at timestamptz null,
  ends_at timestamptz null,
  attribution_window_days integer not null default 30 check (attribution_window_days between 1 and 90),
  bounty_amount_minor integer not null default 0 check (bounty_amount_minor >= 0),
  bounty_currency text not null default 'USD' check (bounty_currency ~ '^[A-Z]{3}$'),
  hold_days integer not null default 30 check (hold_days between 0 and 120),
  approved_claim_version integer not null default 1 check (approved_claim_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table if not exists public.kwilt_creator_attributions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.kwilt_creator_campaigns(id) on delete restrict,
  install_hash text not null unique check (char_length(install_hash) between 32 and 128),
  user_id uuid null references auth.users(id) on delete set null,
  revenuecat_app_user_id text null,
  status text not null default 'claimed' check (status in ('claimed', 'qualified', 'disqualified', 'expired')),
  claim_version integer not null,
  claimed_at timestamptz not null default now(),
  qualified_at timestamptz null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists kwilt_creator_attributions_user_unique
  on public.kwilt_creator_attributions(user_id) where user_id is not null;
create unique index if not exists kwilt_creator_attributions_revenuecat_unique
  on public.kwilt_creator_attributions(revenuecat_app_user_id) where revenuecat_app_user_id is not null;

create table if not exists public.kwilt_creator_commission_events (
  id uuid primary key default gen_random_uuid(),
  attribution_id uuid not null references public.kwilt_creator_attributions(id) on delete restrict,
  campaign_id uuid not null references public.kwilt_creator_campaigns(id) on delete restrict,
  provider_event_id text not null,
  provider_transaction_id text null,
  kind text not null check (kind in ('pending', 'approved', 'reversal', 'void')),
  amount_minor integer not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  hold_until timestamptz null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique (provider_event_id, kind)
);

create table if not exists public.kwilt_creator_payouts (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.kwilt_creator_partners(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'approved', 'paid', 'void')),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  external_reference text null,
  approved_at timestamptz null,
  paid_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists public.kwilt_creator_payout_items (
  payout_id uuid not null references public.kwilt_creator_payouts(id) on delete restrict,
  commission_event_id uuid not null unique references public.kwilt_creator_commission_events(id) on delete restrict,
  primary key (payout_id, commission_event_id)
);

do $$
declare v_table text;
begin
  foreach v_table in array array[
    'kwilt_creator_partners', 'kwilt_creator_campaigns', 'kwilt_creator_attributions',
    'kwilt_creator_commission_events', 'kwilt_creator_payouts', 'kwilt_creator_payout_items'
  ] loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('revoke all on public.%I from public, anon, authenticated', v_table);
  end loop;
end $$;

create or replace function public.kwilt_resolve_creator_campaign(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select jsonb_build_object(
      'campaignId', c.id,
      'code', c.code,
      'slug', c.slug,
      'promise', c.approved_promise,
      'challengeTemplate', c.challenge_template,
      'claimVersion', c.approved_claim_version
    )
    from public.kwilt_creator_campaigns c
    join public.kwilt_creator_partners p on p.id = c.partner_id
    where c.code = lower(trim(p_code))
      and c.status = 'active' and p.status = 'active'
      and (c.starts_at is null or c.starts_at <= now())
      and (c.ends_at is null or c.ends_at > now())
  ), jsonb_build_object('campaignId', null));
$$;

revoke all on function public.kwilt_resolve_creator_campaign(text) from public, anon, authenticated;
grant execute on function public.kwilt_resolve_creator_campaign(text) to service_role;

create or replace function public.kwilt_claim_creator_campaign(
  p_campaign_id uuid,
  p_install_hash text,
  p_user_id uuid default null,
  p_revenuecat_app_user_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_campaign public.kwilt_creator_campaigns%rowtype;
  v_id uuid;
begin
  if p_install_hash is null or char_length(p_install_hash) not between 32 and 128 then
    raise exception 'invalid_install_hash';
  end if;
  select * into v_campaign from public.kwilt_creator_campaigns
    where id = p_campaign_id and status = 'active'
      and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now());
  if not found then raise exception 'campaign_unavailable'; end if;

  insert into public.kwilt_creator_attributions(
    campaign_id, install_hash, user_id, revenuecat_app_user_id, claim_version, expires_at
  ) values (
    v_campaign.id, p_install_hash, p_user_id, nullif(trim(p_revenuecat_app_user_id), ''),
    v_campaign.approved_claim_version, now() + make_interval(days => v_campaign.attribution_window_days)
  ) on conflict (install_hash) do update set
    user_id = coalesce(public.kwilt_creator_attributions.user_id, excluded.user_id),
    revenuecat_app_user_id = coalesce(public.kwilt_creator_attributions.revenuecat_app_user_id, excluded.revenuecat_app_user_id),
    updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.kwilt_claim_creator_campaign(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.kwilt_claim_creator_campaign(uuid, text, uuid, text) to service_role;

create or replace function public.kwilt_record_creator_subscription_event(
  p_provider_event_id text,
  p_event_type text,
  p_period_type text,
  p_environment text,
  p_revenuecat_app_user_id text,
  p_transaction_id text,
  p_original_transaction_id text,
  p_is_family_share boolean
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attr public.kwilt_creator_attributions%rowtype;
  v_campaign public.kwilt_creator_campaigns%rowtype;
  v_prior public.kwilt_creator_commission_events%rowtype;
  v_id uuid;
begin
  if upper(coalesce(p_environment, '')) <> 'PRODUCTION' or coalesce(p_is_family_share, false) then return null; end if;
  select * into v_attr from public.kwilt_creator_attributions
    where revenuecat_app_user_id = p_revenuecat_app_user_id and status in ('claimed', 'qualified')
      and expires_at > now();
  if not found then return null; end if;
  select * into v_campaign from public.kwilt_creator_campaigns where id = v_attr.campaign_id;

  if upper(p_event_type) in ('INITIAL_PURCHASE', 'RENEWAL')
    and upper(coalesce(p_period_type, 'NORMAL')) <> 'TRIAL'
    and v_campaign.bounty_amount_minor > 0 then
    update public.kwilt_creator_attributions set status = 'qualified', qualified_at = coalesce(qualified_at, now()), updated_at = now()
      where id = v_attr.id;
    insert into public.kwilt_creator_commission_events(
      attribution_id, campaign_id, provider_event_id, provider_transaction_id,
      kind, amount_minor, currency, hold_until, metadata
    ) values (
      v_attr.id, v_campaign.id, p_provider_event_id, p_transaction_id,
      'pending', v_campaign.bounty_amount_minor, v_campaign.bounty_currency,
      now() + make_interval(days => v_campaign.hold_days), jsonb_build_object('eventType', p_event_type)
    ) on conflict (provider_event_id, kind) do nothing returning id into v_id;
    return v_id;
  end if;

  if upper(p_event_type) in ('REFUND', 'REFUNDED') then
    select * into v_prior from public.kwilt_creator_commission_events
      where attribution_id = v_attr.id and kind = 'pending'
        and (provider_transaction_id = p_original_transaction_id or provider_transaction_id = p_transaction_id)
      order by created_at desc limit 1;
    if not found then return null; end if;
    insert into public.kwilt_creator_commission_events(
      attribution_id, campaign_id, provider_event_id, provider_transaction_id,
      kind, amount_minor, currency, metadata
    ) values (
      v_attr.id, v_campaign.id, p_provider_event_id, p_transaction_id,
      'reversal', -abs(v_prior.amount_minor), v_prior.currency,
      jsonb_build_object('reversesCommissionEventId', v_prior.id)
    ) on conflict (provider_event_id, kind) do nothing returning id into v_id;
    return v_id;
  end if;
  return null;
end;
$$;

revoke all on function public.kwilt_record_creator_subscription_event(text, text, text, text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.kwilt_record_creator_subscription_event(text, text, text, text, text, text, text, boolean) to service_role;

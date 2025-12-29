-- Kwilt: Pro access codes (install-based, pre-account).
-- This provides a secure(ish) way to grant "Pro" via one-time/limited-use codes
-- without shipping any secrets in the client.
--
-- Important posture:
-- - Client is local-first and currently install-identified (no auth.users yet).
-- - Codes are stored as SHA-256 hashes (never plaintext).
-- - Redemption is performed via an Edge Function using the service role key.
-- - Tables have RLS enabled with no policies so anon clients cannot read/write them directly.

create extension if not exists "pgcrypto";

create table if not exists public.kwilt_pro_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz null,
  max_uses integer not null default 1,
  uses integer not null default 0,
  note text null
);

create table if not exists public.kwilt_pro_redemptions (
  id uuid primary key default gen_random_uuid(),
  code_id uuid not null references public.kwilt_pro_codes(id) on delete cascade,
  quota_key text not null,
  redeemed_at timestamptz not null default now(),
  unique (code_id, quota_key)
);

create table if not exists public.kwilt_pro_entitlements (
  quota_key text primary key,
  is_pro boolean not null default true,
  source text not null default 'code',
  granted_at timestamptz not null default now(),
  expires_at timestamptz null,
  updated_at timestamptz not null default now()
);

alter table public.kwilt_pro_codes enable row level security;
alter table public.kwilt_pro_redemptions enable row level security;
alter table public.kwilt_pro_entitlements enable row level security;

-- Helper: normalize + hash a code.
create or replace function public.kwilt_hash_pro_code(p_code text)
returns text
language sql
immutable
as $$
  select encode(digest(lower(trim(p_code)), 'sha256'), 'hex');
$$;

-- Redeem a code for a quota key (install/user bucket).
-- Runs server-side via Edge Function (service role), but we keep it atomic in SQL.
create or replace function public.kwilt_redeem_pro_code(
  p_code text,
  p_quota_key text
) returns table (
  ok boolean,
  already_redeemed boolean,
  message text
)
language plpgsql
as $$
declare
  v_hash text;
  v_code public.kwilt_pro_codes%rowtype;
begin
  if p_code is null or length(trim(p_code)) = 0 then
    return query select false, false, 'Missing code';
    return;
  end if;
  if p_quota_key is null or length(trim(p_quota_key)) = 0 then
    return query select false, false, 'Missing quota key';
    return;
  end if;

  v_hash := public.kwilt_hash_pro_code(p_code);

  select *
    into v_code
    from public.kwilt_pro_codes
    where code_hash = v_hash
    for update;

  if not found then
    return query select false, false, 'Code not found';
    return;
  end if;

  if v_code.active is not true then
    return query select false, false, 'Code is inactive';
    return;
  end if;

  if v_code.expires_at is not null and v_code.expires_at < now() then
    return query select false, false, 'Code expired';
    return;
  end if;

  if v_code.max_uses is not null and v_code.uses >= v_code.max_uses then
    return query select false, false, 'Code has no remaining uses';
    return;
  end if;

  begin
    insert into public.kwilt_pro_redemptions(code_id, quota_key)
    values (v_code.id, trim(p_quota_key));
  exception when unique_violation then
    -- Idempotent: same install redeemed same code already.
    return query select true, true, 'Already redeemed';
    return;
  end;

  update public.kwilt_pro_codes
    set uses = uses + 1
    where id = v_code.id;

  insert into public.kwilt_pro_entitlements(quota_key, is_pro, source, granted_at, expires_at, updated_at)
  values (trim(p_quota_key), true, 'code', now(), v_code.expires_at, now())
  on conflict (quota_key) do update
    set is_pro = true,
        source = 'code',
        expires_at = excluded.expires_at,
        updated_at = now();

  return query select true, false, 'Redeemed';
end;
$$;



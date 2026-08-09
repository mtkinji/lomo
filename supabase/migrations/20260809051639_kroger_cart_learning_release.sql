-- Kroger-family learning release: server-owned OAuth tokens, selected store,
-- explicit product matches, and an honest cart-add acknowledgement.
alter table public.kwilt_grocery_provider_accounts
  add column if not exists retailer_label text,
  add column if not exists location_id text,
  add column if not exists location_name text,
  add column if not exists location_address text,
  add column if not exists provider_account_label text,
  add column if not exists access_expires_at timestamptz,
  add column if not exists last_used_at timestamptz;

create table if not exists public.kwilt_grocery_provider_tokens (
  account_id uuid primary key references public.kwilt_grocery_provider_accounts(id) on delete cascade,
  token_payload jsonb not null,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.kwilt_grocery_provider_tokens enable row level security;
revoke all on public.kwilt_grocery_provider_tokens from public, anon, authenticated;

create table if not exists public.kwilt_grocery_provider_oauth_states (
  nonce uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider = 'kroger'),
  verifier_payload jsonb not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.kwilt_grocery_provider_oauth_states enable row level security;
revoke all on public.kwilt_grocery_provider_oauth_states from public, anon, authenticated;

alter table public.kwilt_retailer_handoffs
  drop constraint if exists kwilt_retailer_handoffs_state_check;
alter table public.kwilt_retailer_handoffs
  add constraint kwilt_retailer_handoffs_state_check check (state in (
    'provider_link_requested','provider_link_created','opened_for_product_review',
    'cart_add_requested','cart_add_acknowledged','confirmation_required',
    'user_reported_checkout_complete','failed'
  ));

create index if not exists kwilt_grocery_product_mappings_confirmed_idx
  on public.kwilt_grocery_product_mappings(grocery_list_id, provider, state);
create index if not exists kwilt_grocery_provider_oauth_states_expiry_idx
  on public.kwilt_grocery_provider_oauth_states(expires_at) where consumed_at is null;

comment on table public.kwilt_grocery_provider_tokens is
  'Server-only encrypted OAuth material. No client grants or RLS policies.';
comment on column public.kwilt_grocery_provider_accounts.retailer_label is
  'User-facing Kroger-family banner such as Smith''s; not authorization evidence.';

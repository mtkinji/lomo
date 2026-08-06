-- Evidence-backed savings. Provider secrets remain server-side; only vault references are stored.
create table public.kwilt_grocery_provider_accounts (
  id uuid primary key default gen_random_uuid(), owner_person_id uuid not null references public.kwilt_people(id) on delete restrict,
  provider text not null, scopes text[] not null default '{}', token_vault_ref text not null, state text not null check(state in ('active','revoked','expired')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(owner_person_id,provider)
);
create table public.kwilt_grocery_product_mappings (
  id uuid primary key default gen_random_uuid(), grocery_list_id uuid not null references public.kwilt_grocery_lists(id) on delete cascade,
  grocery_item_id uuid not null references public.kwilt_grocery_items(id) on delete cascade, provider text not null, retailer_product_id text not null,
  title text not null, store_name text not null, location_id text, package_base_units numeric not null check(package_base_units>0), quantity integer not null check(quantity>0),
  state text not null check(state in ('proposed','confirmed','rejected')), confirmed_by_person_id uuid references public.kwilt_people(id) on delete restrict,
  created_at timestamptz not null default now(), unique(grocery_item_id,provider,retailer_product_id)
);
create table public.kwilt_grocery_price_quotes (
  id uuid primary key default gen_random_uuid(), product_mapping_id uuid not null references public.kwilt_grocery_product_mappings(id) on delete cascade,
  regular_price_cents bigint not null check(regular_price_cents>=0), current_price_cents bigint not null check(current_price_cents>=0), fee_cents bigint not null default 0 check(fee_cents>=0),
  observed_at timestamptz not null, expires_at timestamptz not null, provider_reference text, created_at timestamptz not null default now()
);
create table public.kwilt_grocery_offers (
  id uuid primary key default gen_random_uuid(), product_mapping_id uuid not null references public.kwilt_grocery_product_mappings(id) on delete cascade,
  kind text not null check(kind in ('public_promotion','member_price','coupon','rebate')), amount_cents bigint not null check(amount_cents>=0),
  member_required boolean not null default false, activation_required boolean not null default false,
  state text not null check(state in ('observed','eligible','activated','redeemed','expired')), acknowledgement_ref text,
  observed_at timestamptz not null, expires_at timestamptz not null, created_at timestamptz not null default now(),
  check(state not in ('activated','redeemed') or acknowledgement_ref is not null)
);
create table public.kwilt_grocery_savings_plans (
  id uuid primary key default gen_random_uuid(), owner_person_id uuid not null references public.kwilt_people(id) on delete restrict,
  grocery_list_id uuid not null references public.kwilt_grocery_lists(id) on delete restrict, grocery_list_revision integer not null,
  version integer not null default 1, selected_mapping_ids uuid[] not null default '{}', selected_offer_ids uuid[] not null default '{}',
  predicted_subtotal_cents bigint not null check(predicted_subtotal_cents>=0), predicted_savings_cents bigint not null check(predicted_savings_cents>=0),
  evidence_observed_at timestamptz not null, state text not null check(state in ('prepared','accepted','superseded','reconciled')),
  accepted_at timestamptz, created_at timestamptz not null default now()
);
create table public.kwilt_grocery_receipt_evidence (
  id uuid primary key default gen_random_uuid(), owner_person_id uuid not null references public.kwilt_people(id) on delete restrict,
  provider text, authority text not null check(authority in ('user_supplied','provider_authoritative')), observed_at timestamptz not null,
  source_artifact_ref text, provider_receipt_id text, reviewed boolean not null default false, lines jsonb not null default '[]'::jsonb check(jsonb_typeof(lines)='array'), paid_total_cents bigint not null check(paid_total_cents>=0), created_at timestamptz not null default now()
);
create table public.kwilt_grocery_savings_outcomes (
  id uuid primary key default gen_random_uuid(), savings_plan_id uuid not null references public.kwilt_grocery_savings_plans(id) on delete restrict,
  receipt_evidence_id uuid not null references public.kwilt_grocery_receipt_evidence(id) on delete restrict,
  baseline_cents bigint not null check(baseline_cents>=0), paid_cents bigint not null check(paid_cents>=0), realized_savings_cents bigint not null check(realized_savings_cents>=0),
  itemized jsonb not null default '[]'::jsonb check(jsonb_typeof(itemized)='array'), calculated_at timestamptz not null default now(), unique(savings_plan_id,receipt_evidence_id)
);
alter table public.kwilt_grocery_provider_accounts enable row level security; alter table public.kwilt_grocery_product_mappings enable row level security; alter table public.kwilt_grocery_price_quotes enable row level security; alter table public.kwilt_grocery_offers enable row level security; alter table public.kwilt_grocery_savings_plans enable row level security; alter table public.kwilt_grocery_receipt_evidence enable row level security; alter table public.kwilt_grocery_savings_outcomes enable row level security;
create policy kwilt_grocery_provider_accounts_owner_read on public.kwilt_grocery_provider_accounts for select to authenticated using(owner_person_id=public.kwilt_current_person_id());
create policy kwilt_grocery_product_mappings_owner_read on public.kwilt_grocery_product_mappings for select to authenticated using(public.kwilt_owns_grocery_list(grocery_list_id));
create policy kwilt_grocery_price_quotes_owner_read on public.kwilt_grocery_price_quotes for select to authenticated using(exists(select 1 from public.kwilt_grocery_product_mappings mapping where mapping.id=product_mapping_id and public.kwilt_owns_grocery_list(mapping.grocery_list_id)));
create policy kwilt_grocery_offers_owner_read on public.kwilt_grocery_offers for select to authenticated using(exists(select 1 from public.kwilt_grocery_product_mappings mapping where mapping.id=product_mapping_id and public.kwilt_owns_grocery_list(mapping.grocery_list_id)));
create policy kwilt_grocery_savings_plans_owner_read on public.kwilt_grocery_savings_plans for select to authenticated using(owner_person_id=public.kwilt_current_person_id());
create policy kwilt_grocery_receipt_evidence_owner_read on public.kwilt_grocery_receipt_evidence for select to authenticated using(owner_person_id=public.kwilt_current_person_id());
create policy kwilt_grocery_savings_outcomes_owner_read on public.kwilt_grocery_savings_outcomes for select to authenticated using(exists(select 1 from public.kwilt_grocery_savings_plans plan where plan.id=savings_plan_id and plan.owner_person_id=public.kwilt_current_person_id()));
grant select on public.kwilt_grocery_provider_accounts,public.kwilt_grocery_product_mappings,public.kwilt_grocery_price_quotes,public.kwilt_grocery_offers,public.kwilt_grocery_savings_plans,public.kwilt_grocery_receipt_evidence,public.kwilt_grocery_savings_outcomes to authenticated;
revoke insert,update,delete on public.kwilt_grocery_provider_accounts,public.kwilt_grocery_product_mappings,public.kwilt_grocery_price_quotes,public.kwilt_grocery_offers,public.kwilt_grocery_savings_plans,public.kwilt_grocery_receipt_evidence,public.kwilt_grocery_savings_outcomes from public,anon,authenticated;

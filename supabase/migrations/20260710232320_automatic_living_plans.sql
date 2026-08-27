create table if not exists public.budget_living_target_intents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  living_percent integer not null check (living_percent between 50 and 100 and living_percent % 5 = 0),
  provenance text not null check (provenance in ('onboarding', 'settings', 'legacy_migration')),
  updated_at timestamptz not null default now()
);

create table if not exists public.budget_planning_income_sources (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  source_key text not null, cashflow_meaning text not null, planning_role text not null,
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  expected_monthly_cents bigint not null default 0 check (expected_monthly_cents >= 0),
  evidence jsonb not null default '[]'::jsonb, policy_version text not null,
  user_confirmed boolean not null default false, updated_at timestamptz not null default now(),
  unique (user_id, source_key, policy_version)
);

create table if not exists public.budget_living_plan_versions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  period_id text not null, predecessor_version_id uuid references public.budget_living_plan_versions(id),
  reversal_of_version_id uuid references public.budget_living_plan_versions(id),
  living_percent integer not null, resource_basis_cents bigint not null check (resource_basis_cents >= 0),
  target_cents bigint not null check (target_cents >= 0), planned_cents bigint not null check (planned_cents >= 0),
  unassigned_cents bigint not null check (unassigned_cents >= 0), over_target_cents bigint not null check (over_target_cents >= 0),
  status text not null check (status in ('ready', 'over_target', 'blocked', 'missing_resource')),
  evidence_hash text not null, candidate_hash text not null, allocator_version text not null,
  created_at timestamptz not null default now(), unique (user_id, candidate_hash)
);

create table if not exists public.budget_living_plan_components (
  id uuid primary key default gen_random_uuid(), plan_version_id uuid not null references public.budget_living_plan_versions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, category_id text not null,
  amount_cents bigint not null check (amount_cents >= 0), fixed_cents bigint not null default 0 check (fixed_cents >= 0),
  override_cents bigint not null default 0 check (override_cents >= 0), flexible_cents bigint not null default 0 check (flexible_cents >= 0),
  exposure_cents bigint not null default 0 check (exposure_cents >= 0), source text not null,
  unique (plan_version_id, category_id)
);

create table if not exists public.budget_living_plan_overrides (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  category_id text not null, amount_cents bigint not null check (amount_cents >= 0), active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (user_id, category_id)
);

create table if not exists public.budget_living_plan_receipts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  plan_version_id uuid not null unique references public.budget_living_plan_versions(id) on delete cascade,
  prior_version_id uuid references public.budget_living_plan_versions(id), trigger text not null,
  outcome text not null check (outcome in ('initial', 'routine', 'material', 'reversal')),
  cause text not null, changed_category_ids jsonb not null default '[]'::jsonb,
  material_reasons jsonb not null default '[]'::jsonb, seen_at timestamptz, created_at timestamptz not null default now()
);

create table if not exists public.budget_active_living_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_version_id uuid not null references public.budget_living_plan_versions(id), updated_at timestamptz not null default now()
);

create table if not exists public.budget_living_plan_config (
  user_id uuid primary key references auth.users(id) on delete cascade,
  promotion_enabled boolean not null default false, updated_at timestamptz not null default now()
);

alter table public.budget_living_target_intents enable row level security;
alter table public.budget_planning_income_sources enable row level security;
alter table public.budget_living_plan_versions enable row level security;
alter table public.budget_living_plan_components enable row level security;
alter table public.budget_living_plan_overrides enable row level security;
alter table public.budget_living_plan_receipts enable row level security;
alter table public.budget_active_living_plans enable row level security;
alter table public.budget_living_plan_config enable row level security;

create policy "Household can read living targets" on public.budget_living_target_intents for select to authenticated using (public.can_access_budget_user(user_id));
create policy "Owners write living targets" on public.budget_living_target_intents for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Household can read planning sources" on public.budget_planning_income_sources for select to authenticated using (public.can_access_budget_user(user_id));
create policy "Household can read living versions" on public.budget_living_plan_versions for select to authenticated using (public.can_access_budget_user(user_id));
create policy "Household can read living components" on public.budget_living_plan_components for select to authenticated using (public.can_access_budget_user(user_id));
create policy "Household can read living receipts" on public.budget_living_plan_receipts for select to authenticated using (public.can_access_budget_user(user_id));
create policy "Household can read active living plans" on public.budget_active_living_plans for select to authenticated using (public.can_access_budget_user(user_id));
create policy "Owners manage living overrides" on public.budget_living_plan_overrides for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Household can read living overrides" on public.budget_living_plan_overrides for select to authenticated using (public.can_access_budget_user(user_id));
create policy "Owners read living config" on public.budget_living_plan_config for select to authenticated using (user_id = (select auth.uid()));

grant select on public.budget_living_target_intents, public.budget_planning_income_sources, public.budget_living_plan_versions, public.budget_living_plan_components, public.budget_living_plan_receipts, public.budget_active_living_plans to authenticated;
grant select, insert, update, delete on public.budget_living_plan_overrides to authenticated;
grant select, insert, update on public.budget_living_target_intents to authenticated;

create or replace function public.promote_budget_living_plan(
  expected_active_version_id uuid, candidate jsonb, components jsonb, receipt jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare owner_id uuid := auth.uid(); current_id uuid; new_id uuid; component_total bigint;
begin
  if owner_id is null then raise exception 'authentication required'; end if;
  if not coalesce((select promotion_enabled from public.budget_living_plan_config where user_id = owner_id), false) then raise exception 'living plan promotion disabled'; end if;
  select plan_version_id into current_id from public.budget_active_living_plans where user_id = owner_id for update;
  if current_id is distinct from expected_active_version_id then raise exception 'active living plan changed'; end if;
  if candidate->>'status' in ('blocked', 'missing_resource') then raise exception 'candidate cannot promote'; end if;
  if nullif(candidate->>'candidateHash', '') is null or nullif(candidate->>'evidenceHash', '') is null or nullif(candidate->>'allocatorVersion', '') is null then raise exception 'candidate provenance missing'; end if;
  if (candidate->>'livingPercent')::integer not between 50 and 100 or (candidate->>'livingPercent')::integer % 5 <> 0 then raise exception 'invalid living target'; end if;
  if (candidate->>'targetCents')::bigint <> round((candidate->>'resourceBasisCents')::numeric * (candidate->>'livingPercent')::integer / 100.0) then raise exception 'target math mismatch'; end if;
  select coalesce(sum((row->>'amountCents')::bigint), 0) into component_total from jsonb_array_elements(components) row;
  if component_total <> (candidate->>'plannedCents')::bigint then raise exception 'component total mismatch'; end if;
  if greatest(0, (candidate->>'plannedCents')::bigint - (candidate->>'targetCents')::bigint) <> (candidate->>'overTargetCents')::bigint then raise exception 'over-target mismatch'; end if;
  if greatest(0, (candidate->>'targetCents')::bigint - (candidate->>'plannedCents')::bigint) <> (candidate->>'unassignedCents')::bigint then raise exception 'unassigned mismatch'; end if;
  insert into public.budget_living_plan_versions (user_id, period_id, predecessor_version_id, living_percent, resource_basis_cents, target_cents, planned_cents, unassigned_cents, over_target_cents, status, evidence_hash, candidate_hash, allocator_version)
  values (owner_id, candidate->>'periodId', current_id, (candidate->>'livingPercent')::integer, (candidate->>'resourceBasisCents')::bigint, (candidate->>'targetCents')::bigint, (candidate->>'plannedCents')::bigint, (candidate->>'unassignedCents')::bigint, (candidate->>'overTargetCents')::bigint, candidate->>'status', candidate->>'evidenceHash', candidate->>'candidateHash', candidate->>'allocatorVersion') returning id into new_id;
  insert into public.budget_living_plan_components (plan_version_id, user_id, category_id, amount_cents, fixed_cents, override_cents, flexible_cents, exposure_cents, source)
  select new_id, owner_id, row->>'categoryId', (row->>'amountCents')::bigint, coalesce((row->>'fixedCents')::bigint,0), coalesce((row->>'overrideCents')::bigint,0), coalesce((row->>'flexibleCents')::bigint,0), coalesce((row->>'exposureCents')::bigint,0), row->>'source' from jsonb_array_elements(components) row;
  insert into public.budget_living_plan_receipts (user_id, plan_version_id, prior_version_id, trigger, outcome, cause, changed_category_ids, material_reasons)
  values (owner_id, new_id, current_id, receipt->>'trigger', receipt->>'outcome', receipt->>'cause', coalesce(receipt->'changedCategoryIds','[]'::jsonb), coalesce(receipt->'materialReasons','[]'::jsonb));
  insert into public.budget_active_living_plans (user_id, plan_version_id) values (owner_id, new_id) on conflict (user_id) do update set plan_version_id = excluded.plan_version_id, updated_at = now();
  return new_id;
end; $$;

create or replace function public.reverse_budget_living_plan(expected_active_version_id uuid, restore_version_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare owner_id uuid := auth.uid(); current_id uuid; restored public.budget_living_plan_versions%rowtype; new_id uuid;
begin
  select plan_version_id into current_id from public.budget_active_living_plans where user_id = owner_id for update;
  if current_id is distinct from expected_active_version_id then raise exception 'active living plan changed'; end if;
  select * into restored from public.budget_living_plan_versions where id = restore_version_id and user_id = owner_id;
  if restored.id is null then raise exception 'restore version unavailable'; end if;
  insert into public.budget_living_plan_versions (user_id, period_id, predecessor_version_id, reversal_of_version_id, living_percent, resource_basis_cents, target_cents, planned_cents, unassigned_cents, over_target_cents, status, evidence_hash, candidate_hash, allocator_version)
  values (owner_id, restored.period_id, current_id, current_id, restored.living_percent, restored.resource_basis_cents, restored.target_cents, restored.planned_cents, restored.unassigned_cents, restored.over_target_cents, restored.status, restored.evidence_hash, restored.candidate_hash || '-reversal-' || current_id, restored.allocator_version) returning id into new_id;
  insert into public.budget_living_plan_components (plan_version_id, user_id, category_id, amount_cents, fixed_cents, override_cents, flexible_cents, exposure_cents, source)
  select new_id, owner_id, category_id, amount_cents, fixed_cents, override_cents, flexible_cents, exposure_cents, source from public.budget_living_plan_components where plan_version_id = restore_version_id;
  insert into public.budget_living_plan_receipts (user_id, plan_version_id, prior_version_id, trigger, outcome, cause, changed_category_ids, material_reasons)
  values (owner_id, new_id, current_id, 'user_reversal', 'reversal', 'Restored the prior monthly budgets.', '[]', '["reversal"]');
  update public.budget_active_living_plans set plan_version_id = new_id, updated_at = now() where user_id = owner_id;
  return new_id;
end; $$;

create or replace function public.mark_budget_living_plan_receipt_seen(receipt_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.budget_living_plan_receipts set seen_at = coalesce(seen_at, now()) where id = receipt_id and user_id = auth.uid();
$$;

revoke all on function public.promote_budget_living_plan(uuid, jsonb, jsonb, jsonb) from public;
revoke all on function public.reverse_budget_living_plan(uuid, uuid) from public;
grant execute on function public.promote_budget_living_plan(uuid, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.reverse_budget_living_plan(uuid, uuid) to authenticated;
revoke all on function public.mark_budget_living_plan_receipt_seen(uuid) from public;
grant execute on function public.mark_budget_living_plan_receipt_seen(uuid) to authenticated;
;

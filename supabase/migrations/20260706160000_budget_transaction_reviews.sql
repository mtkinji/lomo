alter table public.budget_transactions
  add column if not exists budget_id text,
  add column if not exists budget_match_source text
    check (budget_match_source is null or budget_match_source in ('confirmed', 'corrected', 'excluded')),
  add column if not exists budget_match_confidence numeric,
  add column if not exists budget_match_reason text,
  add column if not exists budget_match_reviewed_at timestamptz;
create table if not exists public.budget_transaction_match_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  budget_id text not null,
  merchant_contains text not null,
  merchant_match_mode text not null default 'partial' check (merchant_match_mode in ('exact', 'partial')),
  label text not null default 'Merchant rule',
  created_from_transaction_id uuid references public.budget_transactions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, budget_id, merchant_contains, merchant_match_mode)
);
drop trigger if exists set_budget_transaction_match_rules_updated_at on public.budget_transaction_match_rules;
create trigger set_budget_transaction_match_rules_updated_at
before update on public.budget_transaction_match_rules
for each row execute function public.set_updated_at();
alter table public.budget_transaction_match_rules enable row level security;
drop policy if exists "Users can update their own budget transaction reviews" on public.budget_transactions;
create policy "Users can update their own budget transaction reviews"
on public.budget_transactions
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
drop policy if exists "Users can read their own budget transaction match rules" on public.budget_transaction_match_rules;
create policy "Users can read their own budget transaction match rules"
on public.budget_transaction_match_rules
for select
to authenticated
using ((select auth.uid()) = user_id);
drop policy if exists "Users can insert their own budget transaction match rules" on public.budget_transaction_match_rules;
create policy "Users can insert their own budget transaction match rules"
on public.budget_transaction_match_rules
for insert
to authenticated
with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update their own budget transaction match rules" on public.budget_transaction_match_rules;
create policy "Users can update their own budget transaction match rules"
on public.budget_transaction_match_rules
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
revoke all on public.budget_transaction_match_rules from anon, authenticated;
grant select, insert, update on public.budget_transaction_match_rules to authenticated;
grant update (
  budget_id,
  budget_match_source,
  budget_match_confidence,
  budget_match_reason,
  budget_match_reviewed_at
) on public.budget_transactions to authenticated;

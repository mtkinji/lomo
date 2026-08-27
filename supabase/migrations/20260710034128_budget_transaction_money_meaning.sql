alter table public.budget_transactions
  add column if not exists money_meaning text
    check (money_meaning is null or money_meaning in ('income', 'category_credit', 'transfer', 'not_counted', 'unknown')),
  add column if not exists money_meaning_source text
    check (money_meaning_source is null or money_meaning_source in ('inferred', 'confirmed', 'corrected', 'rule')),
  add column if not exists money_meaning_category_budget_id text,
  add column if not exists money_meaning_reason text,
  add column if not exists money_meaning_reviewed_at timestamptz;

grant update (
  budget_id,
  budget_match_source,
  budget_match_confidence,
  budget_match_reason,
  budget_match_reviewed_at,
  money_meaning,
  money_meaning_source,
  money_meaning_category_budget_id,
  money_meaning_reason,
  money_meaning_reviewed_at
) on public.budget_transactions to authenticated;;

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = [
  'supabase/migrations/20260728051739_merchant_rules_apply_all_transactions.sql',
  'supabase/migrations/20260728052413_ensure_merchant_rule_backfill_on_rule_write.sql',
  'supabase/migrations/20260816135842_optimize_merchant_rule_save.sql',
].map((path) => readFileSync(resolve(process.cwd(), path), 'utf8')).join('\n').toLowerCase();

const optimizedMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260816135842_optimize_merchant_rule_save.sql'),
  'utf8',
).toLowerCase();

const editablePartialMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260822005604_allow_editable_partial_merchant_rules.sql'),
  'utf8',
).toLowerCase();

const indexedHistoryMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260902121922_optimize_exact_merchant_rule_history.sql'),
  'utf8',
).toLowerCase();

describe('Money merchant rule persistence migration', () => {
  it('atomically saves a rule and reapplies it across matching history', () => {
    expect(migration).toContain('function public.upsert_budget_transaction_match_rule');
    expect(migration).toContain('v_user_id uuid := (select auth.uid())');
    expect(migration).toContain("budget_match_source = 'merchant_rule'");
    expect(migration).toContain('from public.budget_transaction_match_rules rule');
    expect(migration).toContain('get diagnostics v_applied_count = row_count');
    expect(migration).toContain('security invoker');
    expect(migration).not.toContain('security definer');
  });

  it('applies saved rules when future transactions are inserted or their merchant changes', () => {
    expect(migration).toContain('function public.apply_budget_transaction_match_rule_to_row');
    expect(migration).toContain('before insert or update of merchant_name, name, user_id');
    expect(migration).toContain('execute function public.apply_budget_transaction_match_rule_to_row()');
  });

  it('backfills complete history even when an older app writes the rule table directly', () => {
    expect(migration).toContain('function public.apply_budget_transaction_match_rule_to_history');
    expect(migration).toContain('after insert or update of budget_id, merchant_contains, merchant_match_mode');
    expect(migration).toContain('execute function public.apply_budget_transaction_match_rule_to_history()');
  });

  it('keeps explicit exclusions, transfers, category credits, and splits as stronger row-level overrides', () => {
    expect(migration).toContain("budget_match_source = 'excluded'");
    expect(migration).toContain("money_meaning in ('transfer', 'not_counted', 'category_credit')");
    expect(migration).toContain('from public.budget_transaction_allocations allocation');
  });

  it('limits the public RPC to authenticated users', () => {
    expect(migration).toContain('revoke execute on function public.upsert_budget_transaction_match_rule');
    expect(migration).toContain('from public, anon');
    expect(migration).toContain('grant execute on function public.upsert_budget_transaction_match_rule');
    expect(migration).toContain('to authenticated');
  });

  it('updates only transactions affected by the written rule and does not repeat the history pass in the RPC', () => {
    const rpcStart = optimizedMigration.indexOf('function public.upsert_budget_transaction_match_rule');
    const rpcEnd = optimizedMigration.indexOf('revoke execute on function public.upsert_budget_transaction_match_rule', rpcStart);
    const rpcBody = optimizedMigration.slice(rpcStart, rpcEnd);

    expect(optimizedMigration).toContain("tg_op <> 'delete'");
    expect(optimizedMigration).toContain('new.merchant_contains');
    expect(optimizedMigration).toContain("tg_op <> 'insert'");
    expect(optimizedMigration).toContain('old.merchant_contains');
    expect(optimizedMigration).toContain("set_config('kwilt.merchant_rule_applied_count'");
    expect(rpcBody).toContain("current_setting('kwilt.merchant_rule_applied_count', true)");
    expect(rpcBody).not.toContain('with resolved as');
  });

  it('accepts an edited partial key only when it remains inside the source merchant', () => {
    expect(editablePartialMigration).toContain("p_match_mode = 'partial'");
    expect(editablePartialMigration).toContain('strpos(v_source_merchant_key, v_rule_merchant_key) = 0');
    expect(editablePartialMigration).toContain('trim(p_budget_id),\n    v_rule_merchant_key');
    expect(editablePartialMigration).toContain('security invoker');
    expect(editablePartialMigration).toContain('set search_path = \'\'');
  });

  it('uses an indexed exact-key pass and scans broadly only for partial rules', () => {
    expect(indexedHistoryMigration).toContain('budget_transactions_user_exact_merchant_idx');
    expect(indexedHistoryMigration).toContain('if cardinality(v_exact_merchant_keys) > 0 then');
    expect(indexedHistoryMigration).toContain('= any (v_exact_merchant_keys)');
    expect(indexedHistoryMigration).toContain('if cardinality(v_partial_merchant_keys) > 0 then');
    expect(indexedHistoryMigration).toMatch(/public\.budget_merchant_rule_matches\(\s*partial_key,/);
  });
});

import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('pending transaction categorization migration', () => {
  const migration = readFileSync(
    path.join(process.cwd(), 'supabase/pending-migrations/20260817184447_pending_transaction_categorization.sql'),
    'utf8',
  );

  it('adds bounded server-owned retry state and an ordered candidate index', () => {
    expect(migration).toContain('classification_attempt_count integer not null default 0');
    expect(migration).toContain("classification_last_outcome in ('assigned', 'unresolved', 'retryable_failure')");
    expect(migration).toContain('budget_transactions_classification_candidates_idx');
    expect(migration).toContain('classification_next_retry_at');
  });

  it('does not grant authenticated clients the operational classification fields', () => {
    expect(migration).toContain('revoke update (');
    expect(migration).toContain('on public.budget_transactions from authenticated');
    expect(migration).not.toMatch(/grant update \([\s\S]*classification_attempted_at/);
  });

  it('applies attempts atomically without outranking a concurrent user correction or split', () => {
    expect(migration).toContain('apply_money_transaction_classification_attempt');
    expect(migration).toContain('txn.classification_attempt_count = p_expected_attempt_count');
    expect(migration).toContain("txn.money_meaning is null or txn.money_meaning = 'unknown'");
    expect(migration).toContain('from public.budget_transaction_allocations as allocation');
    expect(migration).toContain("category.status = 'active'");
    expect(migration).toContain('to service_role');
    expect(migration).not.toMatch(/apply_money_transaction_classification_attempt\([\s\S]*to authenticated/);
  });
});

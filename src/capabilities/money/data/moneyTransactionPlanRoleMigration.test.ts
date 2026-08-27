import { readFileSync } from 'fs';
import path from 'path';

describe('transaction plan-role override migration', () => {
  const migration = readFileSync(path.join(
    process.cwd(),
    'supabase/migrations/20260804151537_add_money_transaction_plan_role_override.sql',
  ), 'utf8');

  it('adds a bounded nullable override for categorized outflows', () => {
    expect(migration).toContain('add column if not exists plan_role_override text');
    expect(migration).toContain("plan_role_override in ('protected', 'flexible')");
    expect(migration).toContain("direction = 'outflow'");
    expect(migration).toContain('budget_id is not null');
  });

  it('clears a transaction override whenever its category or money meaning changes', () => {
    expect(migration).toContain('clear_budget_transaction_plan_role_override_on_classification_change');
    expect(migration).toContain('new.budget_id is distinct from old.budget_id');
    expect(migration).toContain('new.money_meaning is distinct from old.money_meaning');
    expect(migration).toContain('new.plan_role_override := null');
  });

  it('allows signed-in owners to update only the new review columns', () => {
    expect(migration).toContain('grant update (plan_role_override, plan_role_override_reviewed_at)');
    expect(migration).toContain('to authenticated');
  });
});

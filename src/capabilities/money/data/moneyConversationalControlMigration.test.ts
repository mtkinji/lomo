import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(resolve(
  process.cwd(), 'supabase/migrations/20260827153000_money_conversational_control.sql',
), 'utf8');

describe('Money conversational control migration', () => {
  it('reviews exactly two owned transfer rows atomically with a freshness check', () => {
    expect(migration).toContain('create or replace function public.review_budget_transfer_pair');
    expect(migration).toContain('cardinality(p_transaction_ids) <> 2');
    expect(migration).toMatch(/for update[\s\S]*if v_row_count <> 2/);
    expect(migration).toContain('user_id = auth.uid()');
    expect(migration).toContain('max(updated_at)');
    expect(migration).toContain('p_expected_updated_at');
  });

  it('keeps confirmed transfers neutral and unpaired rows unresolved', () => {
    expect(migration).toContain("p_decision not in ('confirm_pair', 'unpair')");
    expect(migration).toContain("money_meaning = case when p_decision = 'confirm_pair' then 'transfer' else 'unknown' end");
    expect(migration).toContain('budget_id = null');
    expect(migration).toContain('saved_resource_cents = 0');
  });

  it('keeps the RPC owner-scoped and unavailable to anonymous callers', () => {
    expect(migration).toMatch(/revoke execute on function public\.review_budget_transfer_pair[\s\S]*from public, anon;/);
    expect(migration).toMatch(/grant execute on function public\.review_budget_transfer_pair[\s\S]*to authenticated;/);
  });
});

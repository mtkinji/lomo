import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('Money category ordering migration', () => {
  const migration = readFileSync(
    path.resolve(__dirname, '../../../../supabase/migrations/20260805010645_reorder_budget_categories.sql'),
    'utf8',
  );

  it('validates and locks the complete owner-scoped active category set', () => {
    expect(migration).toContain('create or replace function public.reorder_budget_categories');
    expect(migration).toContain("v_user_id uuid := (select auth.uid())");
    expect(migration).toContain("status = 'active'");
    expect(migration).toContain('for update');
    expect(migration).toContain('category_order_must_match_active_categories');
  });

  it('rewrites one contiguous order and exposes the RPC only to signed-in users', () => {
    expect(migration).toContain('if v_active_ids = p_category_ids then');
    expect(migration).toContain('with ordinality');
    expect(migration).toContain('ordinality - 1');
    expect(migration).toContain('security invoker');
    expect(migration).toContain('revoke execute on function public.reorder_budget_categories(uuid[]) from public, anon');
    expect(migration).toContain('grant execute on function public.reorder_budget_categories(uuid[]) to authenticated');
  });
});

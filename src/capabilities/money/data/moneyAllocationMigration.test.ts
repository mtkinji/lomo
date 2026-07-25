import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260725145417_add_money_transaction_allocations.sql'),
  'utf8',
);
const permanentUserMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260725145619_require_permanent_users_for_money_allocations.sql'),
  'utf8',
);
const explicitPolicyMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260725145703_make_money_allocation_policy_auth_explicit.sql'),
  'utf8',
);

describe('Money transaction allocation migration', () => {
  it('keeps allocations owner-scoped under RLS', () => {
    expect(migration).toContain('alter table public.budget_transaction_allocations enable row level security');
    expect(migration).toContain('public.can_access_budget_user(user_id)');
    expect(migration).toContain("(select auth.uid()) = user_id");
    expect(migration).toContain('revoke all on public.budget_transaction_allocations from anon, authenticated');
    expect(permanentUserMigration).toContain('as restrictive');
    expect(permanentUserMigration).toContain("auth.jwt()->>'is_anonymous'");
    expect(explicitPolicyMigration.match(/auth\.jwt\(\)->>'is_anonymous'/g)).toHaveLength(3);
  });

  it('enforces exact posted-outflow allocation truth at transaction commit', () => {
    expect(migration).toContain('create constraint trigger ensure_budget_transaction_allocations_valid');
    expect(migration).toContain('deferrable initially deferred');
    expect(migration).toContain("v_transaction.direction <> 'outflow' or v_transaction.pending");
    expect(migration).toContain('v_allocation_sum <> v_transaction.amount_cents');
    expect(migration).toContain('category.id::text = allocation.budget_id');
  });

  it('uses security-invoker RPCs to atomically replace splits and later reviews', () => {
    expect(migration).toContain('function public.replace_budget_transaction_allocations');
    expect(migration).toContain('function public.replace_budget_transaction_review');
    expect(migration.match(/security invoker/g)).toHaveLength(3);
    expect(migration).not.toContain('security definer');
    expect(migration).toContain('grant execute on function public.replace_budget_transaction_allocations(uuid, jsonb) to authenticated');
    expect(migration).toContain('grant execute on function public.replace_budget_transaction_review(uuid[], text, boolean) to authenticated');
  });
});

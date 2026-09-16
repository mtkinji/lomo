import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migrationsDirectory = resolve(process.cwd(), 'supabase/migrations');
const migrationPath = readdirSync(migrationsDirectory)
  .filter((name) => name.endsWith('.sql'))
  .map((name) => resolve(migrationsDirectory, name))
  .find((path) => readFileSync(path, 'utf8').includes('kwilt_household_money_transaction_write_authority_v1'));
const migration = migrationPath ? readFileSync(migrationPath, 'utf8') : '';
const transferSourceFix = readFileSync(resolve(
  migrationsDirectory,
  '20260915165809_fix_household_transfer_review_meaning_source.sql',
), 'utf8');

describe('household Money transaction write authority migration', () => {
  it('lets active household adults update the canonical owner transaction without changing ownership', () => {
    expect(migration).toContain('on public.budget_transactions');
    expect(migration).toContain('for update to authenticated');
    expect(migration).toContain('using (public.can_manage_budget_user(user_id))');
    expect(migration).toContain('with check (user_id = public.budget_effective_owner_user_id())');
    expect(migration).toContain('v_owner_user_id uuid := public.budget_effective_owner_user_id()');
  });

  it('moves every transaction mutation RPC to the canonical owner while preserving invoker authority', () => {
    expect(migration).toContain('function public.replace_budget_transaction_review');
    expect(migration).toContain('function public.replace_budget_transaction_allocations');
    expect(migration).toContain('function public.upsert_budget_transaction_match_rule');
    expect(migration).toContain('function public.review_budget_transfer_pair');
    expect(migration.match(/v_owner_user_id uuid := public\.budget_effective_owner_user_id\(\)/g)?.length).toBeGreaterThanOrEqual(4);
    expect(migration.match(/security invoker/g)?.length).toBeGreaterThanOrEqual(4);
    expect(migration).not.toContain('security definer');
  });

  it('removes the global permanent-user allocation policy and scopes allocations and merchant rules to the household owner', () => {
    expect(migration).toContain('drop policy if exists "Only permanent users can access budget transaction allocations"');
    expect(migration).toContain('on public.budget_transaction_allocations');
    expect(migration).toContain('on public.budget_transaction_match_rules');
    expect(migration).toContain('with check (user_id = public.budget_effective_owner_user_id())');
  });

  it('returns an authoritative receipt for transaction categorization', () => {
    expect(migration).toContain("'transaction_ids', to_jsonb(p_transaction_ids)");
    expect(migration).toContain("'review_state', case when p_excluded then 'not_counted' else 'assigned' end");
    expect(migration).toContain("'updated_at', v_updated_at");
    expect(migration).toContain('get diagnostics v_updated_count = row_count');
  });

  it('stores user-reviewed transfer provenance with a schema-supported source', () => {
    expect(transferSourceFix).toContain("money_meaning_source = 'confirmed'");
    expect(transferSourceFix).not.toContain("money_meaning_source = 'user'");
  });
});

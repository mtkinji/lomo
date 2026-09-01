import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migrationsDirectory = resolve(process.cwd(), 'supabase/migrations');
const migrationPath = readdirSync(migrationsDirectory)
  .filter((name) => name.endsWith('.sql'))
  .map((name) => resolve(migrationsDirectory, name))
  .find((path) => readFileSync(path, 'utf8').includes('kwilt_household_money_access_v1'));
const migration = migrationPath ? readFileSync(migrationPath, 'utf8') : '';

describe('canonical Household Money access migration', () => {
  it('automatically grants active adults access without admitting child memberships', () => {
    expect(migration).toContain('create or replace function public.can_access_budget_user');
    expect(migration).toContain('public.kwilt_household_memberships');
    expect(migration).toContain("role in ('owner', 'caregiver')");
    expect(migration).toContain("status = 'active'");
    expect(migration).not.toContain("role in ('owner', 'caregiver', 'child')");
    expect(migration).toContain("auth.jwt()->>'is_anonymous'");
    expect(migration).toContain('private.budget_canonical_adult_owner_user_id');
    expect(migration).toContain('private.budget_actor_is_active_household_child');
    expect(migration).toContain('target_user_id = context.canonical_owner_user_id');
  });

  it('resolves all shared category creation and ordering to the household Money owner', () => {
    expect(migration).toContain('create or replace function public.budget_effective_owner_user_id');
    expect(migration).toContain('create or replace function public.create_budget_category_with_plan');
    expect(migration).toContain('create or replace function public.reorder_budget_categories');
    expect(migration).toContain('create or replace function public.set_budget_category_cover');
    expect(migration).toContain('v_owner_user_id uuid := public.budget_effective_owner_user_id()');
  });

  it('lets active adult household members update the shared category and plan rows', () => {
    expect(migration).toContain('create or replace function public.can_manage_budget_user');
    expect(migration).toContain('on public.budget_categories');
    expect(migration).toContain('on public.budget_plans');
    expect(migration).toContain('using (public.can_manage_budget_user(user_id))');
    expect(migration).toContain('with check (user_id = public.budget_effective_owner_user_id())');
  });
});

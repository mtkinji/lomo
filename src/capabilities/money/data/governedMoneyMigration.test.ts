import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260727140041_governed_household_money_plan.sql'),
  'utf8',
);
const hardeningMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260727140246_harden_governed_household_money_plan.sql'),
  'utf8',
);
const explicitPolicyMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260727140359_make_governed_money_policies_auth_explicit.sql'),
  'utf8',
);

describe('governed household Money migration', () => {
  const foundation = migration.slice(
    migration.indexOf('create or replace function public.ensure_governed_household_money_foundation'),
    migration.indexOf('revoke execute on function public.ensure_governed_household_money_foundation'),
  );

  it('assigns ungoverned transactions even when governed categories already exist', () => {
    expect(foundation).not.toContain('if v_existing_count > 0 then');
    expect(foundation).toContain('resolved_assignment');
    expect(foundation).toContain('eligible.category_budget_id');
  });

  it('resolves provider policy through owned category mappings instead of writing starter slugs blindly', () => {
    expect(foundation).toContain('category.mapping_tags');
    expect(foundation).toContain('category.user_id = v_user_id');
    expect(foundation).not.toContain('set budget_id = eligible.category_slug');
  });

  it('defines one atomic category-plan Save that includes plan promotion', () => {
    expect(migration).toContain('create or replace function public.apply_governed_category_plan_change');
    expect(migration).toContain('public.promote_budget_living_plan(');
  });

  it('persists reserve facts into every promoted immutable plan component', () => {
    const promotion = migration.slice(
      migration.indexOf('create or replace function public.promote_budget_living_plan'),
      migration.indexOf('revoke execute on function public.promote_budget_living_plan'),
    );
    expect(promotion).toContain('funding_rhythm');
    expect(promotion).toContain("row->>'priorReserveCents'");
    expect(promotion).toContain("row->'expectedNeed'->>'amountCents'");
    expect(promotion).toContain("row->'expectedNeed'->>'dueMonth'");
  });

  it('rejects anonymous-auth sessions from governed planning persistence', () => {
    expect(hardeningMigration.match(/as restrictive/g)).toHaveLength(2);
    expect(hardeningMigration.match(/auth\.jwt\(\)->>'is_anonymous'/g)).toHaveLength(4);
    expect(hardeningMigration).toContain('budget_planning_basis_overrides');
    expect(hardeningMigration).toContain('budget_held_living_plan_candidates');
    expect(explicitPolicyMigration.match(/auth\.jwt\(\)->>'is_anonymous'/g)).toHaveLength(9);
    expect(explicitPolicyMigration.match(/alter policy/g)).toHaveLength(7);
  });
});

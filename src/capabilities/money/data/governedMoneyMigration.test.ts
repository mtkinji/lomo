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
const trustedReconciliationMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260727150101_move_governed_money_reconciliation_server_side.sql'),
  'utf8',
);
const canonicalCategoryV2Migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260822005804_canonical_money_categories_v2.sql'),
  'utf8',
);
const neutralPaymentRepairMigration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260822020828_preserve_neutral_payments_in_governed_reconciliation.sql'),
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

  it('keeps governed transaction provenance behind a service-only reconciliation boundary', () => {
    expect(trustedReconciliationMigration).toContain(
      'create or replace function public.reconcile_governed_household_money_foundation(p_user_id uuid)',
    );
    expect(trustedReconciliationMigration).toContain('security invoker');
    expect(trustedReconciliationMigration).toMatch(
      /revoke execute on function public\.reconcile_governed_household_money_foundation\(uuid\)\s+from public, anon, authenticated;/,
    );
    expect(trustedReconciliationMigration).toMatch(
      /grant execute on function public\.reconcile_governed_household_money_foundation\(uuid\)\s+to service_role;/,
    );
    expect(trustedReconciliationMigration).toMatch(
      /revoke execute on function public\.ensure_governed_household_money_foundation\(\)\s+from authenticated;/,
    );
    expect(trustedReconciliationMigration).not.toMatch(
      /grant update\s*\([^)]*budget_assignment_(?:source|policy_version|governed)/i,
    );
  });

  it('creates the canonical v2 core without replacing an existing household category set', () => {
    expect(canonicalCategoryV2Migration).toContain("'governed-category-v2'");
    expect(canonicalCategoryV2Migration).toContain("('groceries', 'Groceries'");
    expect(canonicalCategoryV2Migration).toContain("('dining', 'Dining'");
    expect(canonicalCategoryV2Migration).toContain("('other-spending', 'Other spending'");
    expect(canonicalCategoryV2Migration).toContain('if v_existing_count = 0 then');
    expect(canonicalCategoryV2Migration).not.toMatch(/update public\.budget_categories[\s\S]*set\s+(?:slug|name)\s*=/i);
  });

  it('activates Work & business from supported evidence and recognizes an existing startup category', () => {
    expect(canonicalCategoryV2Migration).toContain("'work-business', 'Work & business'");
    expect(canonicalCategoryV2Migration).toContain("personal_finance_category_confidence in ('HIGH', 'VERY_HIGH')");
    expect(canonicalCategoryV2Migration).toMatch(/BUSINESS_SERVICES\|OFFICE_SUPPLIES\|ACCOUNTING_AND_FINANCIAL_PLANNING\|ADVERTISING_AND_MARKETING/);
    expect(canonicalCategoryV2Migration).toMatch(/\(work\|business\|startup\|entrepreneur/);
    expect(canonicalCategoryV2Migration).toContain("array['work_business']::text[]");
  });

  it('keeps v2 reconciliation service-only', () => {
    expect(canonicalCategoryV2Migration).toContain('security invoker');
    expect(canonicalCategoryV2Migration).toMatch(
      /revoke execute on function public\.reconcile_governed_household_money_foundation\(uuid\)\s+from public, anon, authenticated;/,
    );
    expect(canonicalCategoryV2Migration).toMatch(
      /grant execute on function public\.reconcile_governed_household_money_foundation\(uuid\)\s+to service_role;/,
    );
  });

  it('never auto-assigns credit-card payments and repairs only v2 provider assignments', () => {
    expect(canonicalCategoryV2Migration).toContain(
      "upper(coalesce(txn.personal_finance_category_detailed, '')) <> 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT'",
    );
    expect(neutralPaymentRepairMigration).toContain(
      "upper(coalesce(txn.personal_finance_category_detailed, '')) <> 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT'",
    );
    expect(neutralPaymentRepairMigration).toContain(
      "upper(coalesce(personal_finance_category_detailed, '')) = 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT'",
    );
    expect(neutralPaymentRepairMigration).toContain(
      "budget_assignment_source = 'provider_policy'",
    );
    expect(neutralPaymentRepairMigration).toContain(
      "budget_assignment_policy_version = 'governed-category-v2'",
    );
    expect(neutralPaymentRepairMigration).not.toMatch(/budget_assignment_governed\s*=\s*true/);
  });
});

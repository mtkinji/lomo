import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve(
    process.cwd(),
    'supabase/migrations/20260824223149_default_user_created_categories_to_flexible.sql',
  ),
  'utf8',
);

describe('user-created category plan-role migration', () => {
  it('creates every new category with an explicit flexible role in the atomic RPC', () => {
    expect(migration).toContain(
      'create or replace function public.create_budget_category_with_plan(',
    );
    expect(migration).toMatch(
      /insert into public\.budget_plans\s*\([\s\S]*plan_role[\s\S]*\) values \([\s\S]*'flexible'[\s\S]*\);/,
    );
  });

  it('repairs only null roles on categories recognizable as created by that RPC', () => {
    expect(migration).toContain("set plan_role = 'flexible'");
    expect(migration).toContain('plan.plan_role is null');
    expect(migration).toContain("category.creation_provenance = 'legacy'");
    expect(migration).toContain('category.slug = category.legacy_budget_id');
    expect(migration).toContain("category.slug ~ '-[0-9a-f]{8}$'");
  });
});

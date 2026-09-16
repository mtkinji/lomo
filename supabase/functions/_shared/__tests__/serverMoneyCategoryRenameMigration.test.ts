import fs from 'node:fs';
import path from 'node:path';

const migration = fs.readFileSync(path.resolve(
  __dirname,
  '../../../migrations/20260915173000_server_money_category_rename.sql',
), 'utf8');

test('server Money category rename is atomic, user-scoped, Pro-gated, and receipt-backed', () => {
  expect(migration).toContain('rename_budget_category_from_agent');
  expect(migration).toContain('category.id = p_category_id and category.user_id = p_user_id');
  expect(migration).toContain("category.status = 'active'");
  expect(migration).toContain('kwilt_revenuecat_subscriptions');
  expect(migration).toContain('kwilt_pro_entitlements');
  expect(migration).toContain('kwilt_agent_mutation_receipts');
  expect(migration).toContain("'rename_money_category'");
  expect(migration).toContain("'money_category'");
  expect(migration).toContain("grant execute on function public.rename_budget_category_from_agent");
});

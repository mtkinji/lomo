import type { SupabaseClient } from '@supabase/supabase-js';
import { getActiveLivingPlan } from '../data/livingPlanRepository';
import { previewLivingPlanOverride } from './livingPlanReconciliation';

jest.mock('../data/livingPlanRepository', () => ({ ...jest.requireActual('../data/livingPlanRepository'), getActiveLivingPlan: jest.fn() }));

function fixture() {
  const rows: Record<string, unknown> = {
    budget_living_target_intents: { living_percent: 80 },
    budget_categories: [
      { id: 'food-uuid', legacy_budget_id: 'food', slug: 'groceries' },
      { id: 'care-uuid', legacy_budget_id: null, slug: 'day-care' },
    ],
    budget_plans: [
      { category_id: 'food-uuid', base_budget_cents: 50000, forecast_mode: 'automatic' },
      { category_id: 'care-uuid', base_budget_cents: 0, forecast_mode: 'automatic' },
    ],
    budget_planning_basis_overrides: { monthly_basis_cents: 500000 },
    budget_financial_connections: [{ status: 'active', last_synced_at: '2026-11-05T00:00:00Z' }],
    budget_financial_accounts: [],
    budget_forecast_settings: [], budget_living_plan_overrides: [],
    budget_transactions: [
      { id: 'one', date: '2026-09-10', amount_cents: 60000, direction: 'outflow', budget_id: 'food-uuid' },
      { id: 'two', date: '2026-10-10', amount_cents: 60000, direction: 'outflow', budget_id: 'groceries' },
      { id: 'three', date: '2026-11-01', amount_cents: 10000, direction: 'outflow', budget_id: 'food' },
    ],
  };
  const from = jest.fn((table: string) => {
    const query: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'order', 'range', 'maybeSingle']) query[method] = () => query;
    query.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows[table], error: null }).then(resolve);
    return query;
  });
  return { rows, client: { from, auth: { getUser: async () => ({ data: { user: { id: 'owner' } }, error: null }) } } as unknown as SupabaseClient };
}

beforeEach(() => { jest.useFakeTimers().setSystemTime(new Date('2026-11-05T01:00:00Z')); jest.mocked(getActiveLivingPlan).mockResolvedValue(null); });
afterEach(() => jest.useRealTimers());

it('previews a new category amount with one allocation per category despite mixed transaction identifiers', async () => {
  const { client } = fixture();
  const result = await previewLivingPlanOverride(client, 'day-care', 133600);
  expect(result.outcome).toBe('ready');
  if (result.outcome !== 'ready') throw new Error('Expected a ready preview');
  expect(result.candidate.allocations.map((item) => item.categoryId).sort()).toEqual(['day-care', 'food']);
  expect(result.candidate.allocations.find((item) => item.categoryId === 'day-care')?.amountCents).toBe(133600);
  expect(result.candidate.allocations.find((item) => item.categoryId === 'food')?.exposureCents).toBe(10000);
});

it('normalizes saved forecast and override identifiers before replacing the reviewed amount', async () => {
  const { client, rows } = fixture();
  rows.budget_forecast_settings = [{ budget_id: 'food-uuid', forecast_mode: 'scheduled', scheduled_amount_cents: 60000 }];
  rows.budget_living_plan_overrides = [{ category_id: 'care-uuid', amount_cents: 90000 }];
  const result = await previewLivingPlanOverride(client, 'day-care', 133600);
  expect(result.outcome).toBe('ready');
  if (result.outcome !== 'ready') throw new Error('Expected a ready preview');
  expect(result.candidate.allocations.map((item) => item.categoryId).sort()).toEqual(['day-care', 'food']);
  expect(result.candidate.allocations.find((item) => item.categoryId === 'food')?.fixedCents).toBe(60000);
});

it('rejects conflicting saved overrides for aliases of the same category', async () => {
  const { client, rows } = fixture();
  rows.budget_living_plan_overrides = [{ category_id: 'food', amount_cents: 50000 }, { category_id: 'food-uuid', amount_cents: 70000 }];
  await expect(previewLivingPlanOverride(client, 'day-care', 133600)).rejects.toThrow('conflicting saved amounts');
});

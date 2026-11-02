import type { SupabaseClient } from '@supabase/supabase-js';
import { createMoneyRepository } from './moneyRepository';

type Row = Record<string, unknown>;
function fixture(owner: string | null = 'owner', lookupError: unknown = null, tableErrors: Record<string, unknown> = {}) {
  const calls: Array<{ table: string; filters: Array<[string, unknown]>; range?: [number, number] }> = [];
  const rows: Record<string, Row[]> = {
    budget_categories: ['owner', 'caregiver'].map((user_id) => ({
      user_id, id: `${user_id}-category`, slug: `${user_id}-food`, legacy_budget_id: null,
      name: `${user_id} food`, description: null, accent_color: null, sort_order: 0, status: 'active',
    })),
    budget_plans: ['owner', 'caregiver'].map((user_id) => ({
      user_id, category_id: `${user_id}-category`, status: 'active', base_budget_cents: 10000,
      rollover_enabled: true, funding_rhythm: 'monthly',
      rollover_policy: { startMonth: '2026-01', startingBalanceCents: 0, monthlyAmounts: { '2026-01': 10000 }, timeZone: 'America/Denver' },
    })),
    budget_transactions: Array.from({ length: 4001 }, (_, index) => ({
      user_id: 'owner', id: `transaction-${index}`, financial_account_id: 'owner-account',
      name: 'Synthetic transaction', merchant_name: null, direction: 'outflow',
      amount_cents: index === 4000 ? 900 : 100, date: index === 4000 ? '2026-01-01' : '2026-11-13',
      pending: false, iso_currency_code: 'USD', budget_id: 'owner-food', money_meaning: null,
    })),
    budget_financial_connections: [{ user_id: 'owner', id: 'connection', environment: 'production', institution_name: 'Synthetic bank', status: 'healthy', last_synced_at: '2026-11-15T12:00:00Z' }],
    budget_financial_accounts: [{ user_id: 'owner', id: 'owner-account', connection_id: 'connection', name: 'Checking', official_name: null, mask: null, type: 'depository', subtype: 'checking', budget_financial_connections: { environment: 'production', institution_name: 'Synthetic bank', status: 'healthy', last_synced_at: '2026-11-15T12:00:00Z' } }],
    budget_active_living_plans: [{ user_id: 'owner', plan_version_id: 'owner-version' }],
    budget_living_plan_versions: [{
      user_id: 'owner', id: 'owner-version', predecessor_version_id: null, period_id: '2026-11',
      living_percent: 80, allocator_version: 'living-plan-v2', evidence_hash: 'evidence', candidate_hash: 'candidate',
      status: 'ready', resource_basis_cents: 100000, target_cents: 80000, planned_cents: 10000,
      unassigned_cents: 70000, over_target_cents: 0,
    }],
    budget_living_plan_components: [{ plan_version_id: 'owner-version', category_id: 'owner-food', amount_cents: 10000, fixed_cents: 0, override_cents: 10000, flexible_cents: 0, exposure_cents: 0, source: 'override', funding_rhythm: 'monthly' }],
    budget_planning_basis_overrides: [
      { user_id: 'owner', active: true, monthly_basis_cents: 100000, updated_at: '2026-11-01T12:00:00Z' },
      { user_id: 'caregiver', active: true, monthly_basis_cents: 999999, updated_at: '2026-11-02T12:00:00Z' },
    ],
  };
  const auth = { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'caregiver', is_anonymous: false } }, error: null }) };
  const rpc = jest.fn().mockResolvedValue({ data: owner, error: lookupError });
  const client = { auth, rpc,
    from(table: string) {
      const call: typeof calls[number] = { table, filters: [] }; calls.push(call);
      const failures = tableErrors[table];
      const tableError = Array.isArray(failures) ? failures.shift() : failures;
      const result = (single = false) => {
        let data = (rows[table] ?? []).filter((row) => call.filters.every(([key, value]) => {
          if (key.includes('.')) return true; // Relationship environment is covered by repository tests.
          return row[key] === value;
        }));
        if (call.range) data = data.slice(call.range[0], call.range[1] + 1);
        return { data: single ? data[0] ?? null : data, error: tableError ?? null };
      };
      const query = {
        select: () => query, eq: (key: string, value: unknown) => { call.filters.push([key, value]); return query; },
        neq: () => query, order: () => query, limit: () => query,
        range: (start: number, end: number) => { call.range = [start, end]; return query; },
        maybeSingle: async () => result(true), single: async () => result(true),
        then: (resolve: (value: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(resolve),
      }; return query;
    },
  };
  return { client: client as unknown as SupabaseClient, auth, rpc, calls, rows };
}

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(new Date(2026, 10, 15, 12)); });
afterEach(() => jest.useRealTimers());

it('loads one owner throughout a caregiver snapshot, including the plan and historical rollover beyond 4000 rows', async () => {
  const { client, auth, rpc, calls } = fixture();
  const snapshot = await createMoneyRepository(client).loadSnapshot();
  expect(snapshot.categories).toHaveLength(1);
  expect(snapshot.categories[0]).toMatchObject({ name: 'owner food', spentCents: 400000, rolloverCarriedInCents: 99100, remainingCents: -290900 });
  expect(snapshot.transactions).toHaveLength(4001);
  expect(snapshot.livingLimitAnswer?.facts.planVersionId).toBe('owner-version');
  expect(snapshot.monthlyPlan?.derivation).toBe('user_set');
  expect(auth.getUser).toHaveBeenCalledTimes(1);
  expect(rpc).toHaveBeenCalledTimes(1);
  expect(rpc).toHaveBeenCalledWith('budget_effective_owner_user_id');
  const versionTables = ['budget_living_plan_versions', 'budget_living_plan_components', 'budget_living_plan_receipts'];
  expect(calls.filter((call) => !versionTables.includes(call.table)).every((call) => call.filters.some(([key, value]) => key === 'user_id' && value === 'owner'))).toBe(true);
});

it.each([
  [null, null], ['owner', { message: 'owner lookup unavailable' }],
])('does not silently read actor or mixed data when owner resolution fails (%s)', async (owner, error) => {
  const { client, calls } = fixture(owner, error);
  await expect(createMoneyRepository(client).loadSnapshot()).rejects.toBeDefined();
  expect(calls).toEqual([]);
});

it('does not silently discard split allocations when the read is denied', async () => {
  const { client } = fixture('owner', null, {
    budget_transaction_allocations: { code: '42501', message: 'permission denied for table budget_transaction_allocations' },
  });
  await expect(createMoneyRepository(client).loadSnapshot()).rejects.toThrow('transaction allocations');
});

it.each(['PGRST205', '42P01'])('retains the documented missing-allocation-table compatibility (%s)', async (code) => {
  const { client } = fixture('owner', null, {
    budget_transaction_allocations: { code, message: 'allocation table missing' },
  });
  const snapshot = await createMoneyRepository(client).loadSnapshot();
  expect(snapshot.transactions).toHaveLength(4001);
  expect(snapshot.categories[0].rolloverCarriedInCents).toBe(99100);
});

it('rejects an anonymous account before resolving or loading household data', async () => {
  const { client, auth, rpc, calls } = fixture();
  auth.getUser.mockResolvedValue({ data: { user: { id: 'anonymous', is_anonymous: true } }, error: null });
  await expect(createMoneyRepository(client).loadSnapshot()).rejects.toThrow('Sign in');
  expect(rpc).not.toHaveBeenCalled();
  expect(calls).toEqual([]);
});

it('retains owner filters through legacy category and plan schema fallbacks', async () => {
  const missing = { code: 'PGRST204', message: 'column missing' };
  const { client, calls } = fixture('owner', null, {
    budget_categories: [missing, null], budget_plans: [missing, missing, missing, null],
  });
  const snapshot = await createMoneyRepository(client).loadSnapshot();
  expect(snapshot.categories).toHaveLength(1);
  const categoryReads = calls.filter((call) => call.table === 'budget_categories');
  const planReads = calls.filter((call) => call.table === 'budget_plans');
  expect(categoryReads).toHaveLength(2);
  expect(planReads).toHaveLength(4);
  expect([...categoryReads, ...planReads].every((call) => call.filters.some(([key, value]) => key === 'user_id' && value === 'owner'))).toBe(true);
});

it('keeps all split allocations across pages and excludes a different owner from their totals', async () => {
  const { client, rows, calls } = fixture();
  rows.budget_categories.push({ ...rows.budget_categories[0], id: 'extra-category', slug: 'owner-extra' });
  rows.budget_transaction_allocations = [];
  for (let index = 0; index < 1001; index += 1) {
    rows.budget_transactions[index].budget_id = null;
    for (const budget_id of ['owner-food', 'owner-extra']) {
      rows.budget_transaction_allocations.push({ user_id: 'owner', transaction_id: `transaction-${index}`, budget_id, amount_cents: 50 });
    }
  }
  rows.budget_transaction_allocations.push({ user_id: 'caregiver', transaction_id: 'transaction-0', budget_id: 'caregiver-food', amount_cents: 100 });
  const snapshot = await createMoneyRepository(client).loadSnapshot();
  expect(snapshot.categories.find((category) => category.id === 'owner-food')?.spentCents).toBe(349950);
  expect(snapshot.categories.find((category) => category.id === 'owner-extra')?.spentCents).toBe(50050);
  expect(calls.filter((call) => call.table === 'budget_transaction_allocations').map((call) => call.range)).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
});

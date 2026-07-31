import type { SupabaseClient } from '@supabase/supabase-js';
import { createMoneyRepository } from './moneyRepository';

type RecordedCall = {
  table: string;
  selected?: string;
  update?: Record<string, unknown>;
  upsert?: Record<string, unknown>;
  onConflict?: string;
  filters: Array<[string, unknown]>;
  inFilters?: Array<[string, unknown[]]>;
  ranges: Array<[number, number]>;
};

function createClient(options: { updatedRowCount?: number; rpcResult?: unknown; functionResult?: unknown } = {}) {
  const calls: RecordedCall[] = [];
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const functionCalls: Array<{ name: string; body: Record<string, unknown> }> = [];
  const client = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
    from(table: string) {
      const call: RecordedCall = { table, filters: [], ranges: [] };
      calls.push(call);
      const query = {
        select: (columns: string) => {
          call.selected = columns;
          return query;
        },
        update: (values: Record<string, unknown>) => {
          call.update = values;
          return query;
        },
        upsert: (values: Record<string, unknown>, options?: { onConflict?: string }) => {
          call.upsert = values;
          call.onConflict = options?.onConflict;
          return query;
        },
        eq: (column: string, value: unknown) => {
          call.filters.push([column, value]);
          return query;
        },
        neq: () => query,
        in: (column: string, values: unknown[]) => {
          call.inFilters = [...(call.inFilters ?? []), [column, values]];
          return query;
        },
        order: () => query,
        limit: () => query,
        maybeSingle: () => Promise.resolve({ data: null, error: null }),
        range: (from: number, to: number) => {
          call.ranges.push([from, to]);
          return query;
        },
        then: (
          resolve: (value: { data: unknown[]; error: null }) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => Promise.resolve({
          data: call.update
            ? Array.from({ length: options.updatedRowCount ?? 1 }, (_, index) => ({ id: `updated-${index + 1}`, category_id: `updated-${index + 1}` }))
            : [],
          error: null,
        }).then(resolve, reject),
      };
      return query;
    },
    rpc(name: string, args: Record<string, unknown>) {
      rpcCalls.push({ name, args });
      return Promise.resolve({ data: options.rpcResult ?? 'groceries-a1b2c3d4', error: null });
    },
    functions: {
      invoke(name: string, invokeOptions: { body: Record<string, unknown> }) {
        functionCalls.push({ name, body: invokeOptions.body });
        return Promise.resolve({ data: options.functionResult ?? { outcome: 'reconciled_governed_foundation' }, error: null });
      },
    },
  };
  return { client: client as unknown as SupabaseClient, calls, rpcCalls, functionCalls };
}

describe('createMoneyRepository transaction review', () => {
  it('loads forecast settings and paginates the complete transaction history', async () => {
    const { client, calls, rpcCalls } = createClient();

    await createMoneyRepository(client).loadSnapshot();

    expect(calls.find((call) => call.table === 'budget_plans')?.selected).toContain('forecast_mode');
    expect(calls.find((call) => call.table === 'budget_plans')?.selected).toContain('funding_rhythm');
    expect(calls.find((call) => call.table === 'budget_categories')?.selected).toContain('cover_image');
    expect(calls.find((call) => call.table === 'budget_transactions')?.selected).toContain('budget_assignment_source');
    expect(calls.find((call) => call.table === 'budget_transactions')?.selected).toContain('budget_assignment_policy_version');
    expect(calls.find((call) => call.table === 'budget_transactions')?.selected).toContain('budget_assignment_governed');
    expect(calls.find((call) => call.table === 'budget_transactions')?.ranges).toEqual([[0, 999]]);
    expect(calls.find((call) => call.table === 'budget_transaction_allocations')?.selected)
      .toBe('transaction_id,budget_id,amount_cents');
  });

  it('requests governed reconciliation through the authenticated server boundary', async () => {
    const { client, rpcCalls, functionCalls } = createClient();

    await createMoneyRepository(client).ensureGovernedPlanFoundation();

    expect(functionCalls).toEqual([{
      name: 'reconcile-governed-money',
      body: {},
    }]);
    expect(rpcCalls).not.toContainEqual(expect.objectContaining({
      name: 'ensure_governed_household_money_foundation',
    }));
  });

  it('requests unresolved classification through an authenticated optional background boundary', async () => {
    const { client, functionCalls } = createClient({
      functionResult: { consideredCount: 3, assignedCount: 2, unresolvedCount: 1 },
    });

    await expect(createMoneyRepository(client).classifyUnresolvedTransactions()).resolves.toEqual({
      consideredCount: 3, assignedCount: 2, unresolvedCount: 1,
    });
    expect(functionCalls).toContainEqual({ name: 'classify-money-transactions', body: {} });
  });

  it('atomically assigns one category and resolves without a snapshot reload', async () => {
    const { client, calls, rpcCalls } = createClient();
    const repository = createMoneyRepository(client);

    const result = await repository.assignTransactionCategory('transaction-1', 'category-1');

    expect(rpcCalls).toContainEqual({
      name: 'replace_budget_transaction_review',
      args: {
        p_transaction_ids: ['transaction-1'],
        p_budget_id: 'category-1',
        p_excluded: false,
      },
    });
    expect(calls.filter((call) => call.table === 'budget_categories')).toHaveLength(0);
    expect(calls.filter((call) => call.table === 'budget_transactions')).toHaveLength(0);
    expect(result).toMatchObject({ transactionId: 'transaction-1', categorySourceId: 'category-1', meaning: null });
    expect(client.auth.getUser).toHaveBeenCalledTimes(1);
  });

  it('persists an exact split through the atomic allocation RPC, then reloads', async () => {
    const { client, rpcCalls } = createClient();
    const repository = createMoneyRepository(client);

    await repository.splitTransaction({
      transactionId: 'transaction-1',
      transactionAmountCents: 18496,
      direction: 'outflow',
      pending: false,
      allocations: [
        { categoryId: 'category-grocery-uuid', amountCents: 14000 },
        { categoryId: 'category-household-uuid', amountCents: 4496 },
      ],
    });

    expect(rpcCalls).toContainEqual({
      name: 'replace_budget_transaction_allocations',
      args: {
        p_transaction_id: 'transaction-1',
        p_allocations: [
          { budget_id: 'category-grocery-uuid', amount_cents: 14000 },
          { budget_id: 'category-household-uuid', amount_cents: 4496 },
        ],
      },
    });
  });

  it('rejects a partial split before any database mutation', async () => {
    const { client, rpcCalls } = createClient();

    await expect(createMoneyRepository(client).splitTransaction({
      transactionId: 'transaction-1',
      transactionAmountCents: 18496,
      direction: 'outflow',
      pending: false,
      allocations: [
        { categoryId: 'category-grocery-uuid', amountCents: 14000 },
        { categoryId: 'category-household-uuid', amountCents: 4000 },
      ],
    })).rejects.toThrow('full transaction amount');
    expect(rpcCalls).toEqual([]);
  });

  it('persists an inflow meaning and category credit in one update', async () => {
    const { client, calls } = createClient();
    const repository = createMoneyRepository(client);

    await repository.reviewTransactionMeaning('transaction-credit', {
      meaning: 'category_credit',
      categoryId: 'category-1',
    });

    expect(calls.find((call) => call.update)).toMatchObject({
      table: 'budget_transactions',
      filters: [['id', 'transaction-credit']],
      update: {
        money_meaning: 'category_credit',
        money_meaning_source: 'confirmed',
        money_meaning_category_budget_id: 'category-1',
        budget_id: 'category-1',
        budget_match_source: 'corrected',
      },
    });
  });

  it('does not report a direct transaction review as confirmed when no row was updated', async () => {
    const { client } = createClient({ updatedRowCount: 0 });

    await expect(createMoneyRepository(client).reviewTransactionMeaning('missing-transaction', {
      meaning: 'income',
    })).rejects.toThrow('could not confirm the transaction review');
  });

  it('returns the confirmed merchant-rule receipt without reloading the Money snapshot', async () => {
    const { client, calls, rpcCalls } = createClient({
      rpcResult: {
        ruleId: 'rule-1',
        appliedTransactionCount: 12,
        merchantKey: 'costco 01234',
        matchMode: 'exact',
        categoryId: 'category-1',
      },
    });
    const repository = createMoneyRepository(client);

    const result = await repository.saveMerchantRule({
      transactionId: 'transaction-1',
      merchantName: 'COSTCO #01234',
      categoryId: 'category-1',
      categoryName: 'Groceries',
    });

    expect(rpcCalls).toContainEqual({
      name: 'upsert_budget_transaction_match_rule',
      args: {
        p_transaction_id: 'transaction-1',
        p_budget_id: 'category-1',
        p_merchant_contains: 'costco 01234',
        p_match_mode: 'exact',
        p_label: 'Groceries merchant rule',
      },
    });
    expect(calls.filter((call) => call.upsert)).toHaveLength(0);
    expect(calls).toHaveLength(0);
    expect(result).toEqual({
      confirmedAt: expect.any(String),
      ruleId: 'rule-1',
      transactionId: 'transaction-1',
      appliedTransactionCount: 12,
      merchantKey: 'costco 01234',
      matchMode: 'exact',
      categorySourceId: 'category-1',
    });
  });

  it('does not send visible transaction ids when saving a partial rule', async () => {
    const { client, calls, rpcCalls } = createClient({
      rpcResult: {
        ruleId: 'rule-2',
        appliedTransactionCount: 4,
        merchantKey: 'trader joe',
        matchMode: 'partial',
        categoryId: 'category-1',
      },
    });
    const repository = createMoneyRepository(client);

    await repository.saveMerchantRule({
      transactionId: 'transaction-1',
      merchantName: "Trader Joe's #01234",
      categoryId: 'category-1',
      categoryName: 'Groceries',
      matchMode: 'partial',
    });

    expect(rpcCalls).toContainEqual({
      name: 'upsert_budget_transaction_match_rule',
      args: {
        p_budget_id: 'category-1',
        p_label: 'Groceries merchant rule',
        p_match_mode: 'partial',
        p_merchant_contains: 'trader joe',
        p_transaction_id: 'transaction-1',
      },
    });
    expect(rpcCalls).not.toContainEqual(expect.objectContaining({ name: 'replace_budget_transaction_review' }));
    expect(calls.filter((call) => call.upsert)).toHaveLength(0);
  });

  it('creates a category and plan atomically through the verified RPC, then reloads', async () => {
    const { client, calls, rpcCalls } = createClient();
    const repository = createMoneyRepository(client);

    const result = await repository.createCategory({ name: 'Groceries', budgetCents: 60025 });

    expect(rpcCalls).toEqual([{
      name: 'create_budget_category_with_plan',
      args: {
        p_name: 'Groceries',
        p_budget_cents: 60025,
        p_icon_key: 'custom',
        p_description: null,
        p_accent_color: '#315545',
      },
    }]);
    expect(result.categoryId).toBe('groceries-a1b2c3d4');
    expect(calls.filter((call) => call.table === 'budget_categories')).toHaveLength(1);
  });

  it('persists exact cover metadata through the owner-scoped RPC and returns a receipt', async () => {
    const cover = {
      source: 'unsplash' as const, photoId: 'housing-photo',
      imageUrl: 'https://images.unsplash.com/photo-housing', photographerName: 'Maya Rivera',
      photographerUrl: 'https://unsplash.com/@maya', sourceUrl: 'https://unsplash.com/photos/housing-photo',
      color: '#315545',
    };
    const { client, rpcCalls } = createClient({
      rpcResult: { category_id: 'category-1', cover, updated_at: '2026-07-27T18:00:00.000Z' },
    });

    await expect(createMoneyRepository(client).updateCategoryCover('category-1', cover)).resolves.toEqual({
      confirmedAt: '2026-07-27T18:00:00.000Z', categoryId: 'category-1', changes: { coverImage: cover },
    });
    expect(rpcCalls).toEqual([{ name: 'set_budget_category_cover', args: { p_category_id: 'category-1', p_cover: cover } }]);
  });

  it('rejects invalid cover metadata before any RPC call', async () => {
    const { client, rpcCalls } = createClient();

    await expect(createMoneyRepository(client).updateCategoryCover('category-1', {
      source: 'unsplash', photoId: 'bad', imageUrl: 'https://example.com/photo',
      photographerName: 'Maya', photographerUrl: 'https://unsplash.com/@maya',
      sourceUrl: 'https://unsplash.com/photos/bad', color: null,
    })).rejects.toThrow('Unsplash image');
    expect(rpcCalls).toEqual([]);
  });

  it('updates category identity and plan settings as separate authoritative writes', async () => {
    const first = createClient();
    await createMoneyRepository(first.client).renameCategory('category-1', '  Food at home ');
    expect(first.calls.find((call) => call.update)).toMatchObject({
      table: 'budget_categories',
      filters: [['id', 'category-1']],
      update: { name: 'Food at home' },
    });

    const second = createClient();
    await createMoneyRepository(second.client).updateCategoryPlan('category-1', { budgetCents: 72500 });
    expect(second.calls.find((call) => call.update)).toMatchObject({
      table: 'budget_plans',
      filters: [['category_id', 'category-1']],
      update: { base_budget_cents: 72500 },
    });

    const third = createClient();
    await createMoneyRepository(third.client).updateCategoryPlan('category-1', { rolloverEnabled: true });
    expect(third.calls.find((call) => call.update)).toMatchObject({
      table: 'budget_plans',
      filters: [['category_id', 'category-1']],
      update: { rollover_enabled: true },
    });

    const fourth = createClient();
    await createMoneyRepository(fourth.client).updateCategoryPlan('category-1', {
      forecastMode: 'scheduled',
      manualProjectedSpendCents: null,
      scheduledAmountCents: 18000,
      scheduledDueDay: 24,
    });
    expect(fourth.calls.find((call) => call.update)).toMatchObject({
      table: 'budget_plans',
      filters: [['category_id', 'category-1']],
      update: {
        forecast_mode: 'scheduled',
        manual_projected_spend_cents: null,
        scheduled_amount_cents: 18000,
        scheduled_due_day: 24,
      },
    });

    const fifth = createClient();
    await createMoneyRepository(fifth.client).updateCategoryPlan('category-1', {
      fundingRhythm: 'reserve',
      expectedNeedCents: 80000,
      expectedNeedDueMonth: '2026-12',
    });
    expect(fifth.calls.find((call) => call.update)).toMatchObject({
      table: 'budget_plans',
      filters: [['category_id', 'category-1']],
      update: {
        funding_rhythm: 'reserve',
        funding_policy_version: 'category-funding-v1',
        rollover_enabled: false,
        expected_need_cents: 80000,
        expected_need_due_month: '2026-12',
      },
    });
  });

  it('does not report category writes as confirmed when no row was updated', async () => {
    const first = createClient({ updatedRowCount: 0 });
    await expect(createMoneyRepository(first.client).renameCategory('missing-category', 'Food'))
      .rejects.toThrow('could not confirm the category name');

    const second = createClient({ updatedRowCount: 0 });
    await expect(createMoneyRepository(second.client).updateCategoryPlan('missing-category', { rolloverEnabled: true }))
      .rejects.toThrow('could not confirm the category plan');
  });
});

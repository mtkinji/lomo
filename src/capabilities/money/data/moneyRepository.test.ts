import type { SupabaseClient } from '@supabase/supabase-js';
import { createMoneyRepository } from './moneyRepository';

type RecordedCall = {
  table: string;
  update?: Record<string, unknown>;
  upsert?: Record<string, unknown>;
  onConflict?: string;
  filters: Array<[string, unknown]>;
};

function createClient() {
  const calls: RecordedCall[] = [];
  const client = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
    from(table: string) {
      const call: RecordedCall = { table, filters: [] };
      calls.push(call);
      const query = {
        select: () => query,
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
        order: () => query,
        limit: () => query,
        then: (
          resolve: (value: { data: unknown[]; error: null }) => unknown,
          reject?: (reason: unknown) => unknown,
        ) => Promise.resolve({ data: [], error: null }).then(resolve, reject),
      };
      return query;
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

describe('createMoneyRepository transaction review', () => {
  it('updates one transaction and reloads the authoritative snapshot', async () => {
    const { client, calls } = createClient();
    const repository = createMoneyRepository(client);

    const snapshot = await repository.assignTransactionCategory('transaction-1', 'category-1');

    const mutation = calls.find((call) => call.update);
    expect(mutation).toMatchObject({
      table: 'budget_transactions',
      filters: [['id', 'transaction-1']],
      update: {
        budget_id: 'category-1',
        budget_match_source: 'corrected',
        budget_match_confidence: 1,
      },
    });
    expect(calls.filter((call) => call.table === 'budget_categories')).toHaveLength(1);
    expect(snapshot).toMatchObject({ categories: [], transactions: [], accounts: [] });
    expect(client.auth.getUser).toHaveBeenCalledTimes(2);
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

  it('upserts one exact merchant rule before reloading the snapshot', async () => {
    const { client, calls } = createClient();
    const repository = createMoneyRepository(client);

    await repository.saveMerchantRule({
      transactionId: 'transaction-1',
      merchantName: 'COSTCO #01234',
      categoryId: 'category-1',
      categoryName: 'Groceries',
    });

    expect(calls.find((call) => call.upsert)).toMatchObject({
      table: 'budget_transaction_match_rules',
      onConflict: 'user_id,merchant_contains,merchant_match_mode',
      upsert: {
        user_id: 'user-1',
        budget_id: 'category-1',
        merchant_contains: 'costco 01234',
        merchant_match_mode: 'exact',
        created_from_transaction_id: 'transaction-1',
      },
    });
    expect(calls.filter((call) => call.table === 'budget_transaction_match_rules')).toHaveLength(2);
  });
});

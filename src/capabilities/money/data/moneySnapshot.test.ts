import { projectMoneySnapshot } from './moneySnapshot';

const categories = [
  {
    id: 'category-grocery-uuid',
    slug: 'groceries',
    legacy_budget_id: 'groceries',
    name: 'Groceries',
    description: 'Food at home',
    accent_color: '#315545',
    sort_order: 1,
  },
  {
    id: 'category-fun-uuid',
    slug: 'fun',
    legacy_budget_id: null,
    name: 'Fun',
    description: null,
    accent_color: null,
    sort_order: 2,
  },
];

const plans = [
  { category_id: 'category-grocery-uuid', base_budget_cents: 60000, rollover_enabled: false },
  { category_id: 'category-fun-uuid', base_budget_cents: 20000, rollover_enabled: true },
];

const accounts = [
  {
    id: 'account-checking',
    name: 'Checking',
    official_name: 'Household Checking',
    mask: '1042',
    type: 'depository',
    subtype: 'checking',
    connection_id: 'connection-1',
    budget_financial_connections: {
      institution_name: 'Local Bank',
      status: 'healthy' as const,
      last_synced_at: '2026-07-23T16:00:00.000Z',
    },
  },
  {
    id: 'account-savings',
    name: 'Savings',
    official_name: null,
    mask: '2001',
    type: 'depository',
    subtype: 'savings',
    connection_id: 'connection-1',
    budget_financial_connections: {
      institution_name: 'Local Bank',
      status: 'healthy' as const,
      last_synced_at: '2026-07-23T16:00:00.000Z',
    },
  },
];

describe('projectMoneySnapshot', () => {
  it('projects current-month plan, spend, credits, aliases, and accounts without fixture values', () => {
    const snapshot = projectMoneySnapshot(
      {
        categories,
        plans,
        accounts,
        connections: [
          {
            id: 'connection-1',
            institution_name: 'Local Bank',
            status: 'healthy',
            last_synced_at: '2026-07-23T16:00:00.000Z',
          },
        ],
        transactions: [
          {
            id: 'transaction-1',
            financial_account_id: 'account-checking',
            name: 'Neighborhood Market',
            merchant_name: 'Neighborhood Market',
            amount_cents: 12500,
            direction: 'outflow',
            date: '2026-07-20',
            pending: false,
            iso_currency_code: 'USD',
            budget_id: 'groceries',
            money_meaning: null,
          },
          {
            id: 'transaction-credit',
            financial_account_id: 'account-checking',
            name: 'Market refund',
            merchant_name: null,
            amount_cents: 2500,
            direction: 'inflow',
            date: '2026-07-21',
            pending: false,
            iso_currency_code: 'USD',
            budget_id: 'category-grocery-uuid',
            money_meaning: 'category_credit',
          },
          {
            id: 'transaction-old',
            financial_account_id: 'account-checking',
            name: 'Old purchase',
            merchant_name: null,
            amount_cents: 99999,
            direction: 'outflow',
            date: '2026-06-20',
            pending: false,
            iso_currency_code: 'USD',
            budget_id: 'groceries',
            money_meaning: null,
          },
        ],
      },
      new Date('2026-07-23T18:00:00.000Z'),
    );

    expect(snapshot.totals).toEqual({
      plannedCents: 80000,
      spentCents: 10000,
      remainingCents: 70000,
      needsReviewCount: 0,
    });
    expect(snapshot.categories[0]).toMatchObject({
      id: 'groceries',
      spentCents: 10000,
      plannedCents: 60000,
      transactionCount: 2,
    });
    expect(snapshot.accounts).toEqual([
      expect.objectContaining({ id: 'account-checking', transactionCount: 3 }),
      expect.objectContaining({ id: 'account-savings', transactionCount: 0 }),
    ]);
    expect(snapshot.lastSyncedAt).toBe('2026-07-23T16:00:00.000Z');
  });

  it('counts unmatched current-month outflows as needing review', () => {
    const snapshot = projectMoneySnapshot(
      {
        categories,
        plans,
        accounts: [],
        connections: [],
        transactions: [
          {
            id: 'unmatched',
            financial_account_id: null,
            name: 'Unknown',
            merchant_name: null,
            amount_cents: 1000,
            direction: 'outflow',
            date: '2026-07-02',
            pending: false,
            iso_currency_code: 'USD',
            budget_id: null,
            money_meaning: null,
          },
        ],
      },
      new Date('2026-07-23T18:00:00.000Z'),
    );

    expect(snapshot.totals.needsReviewCount).toBe(1);
    expect(snapshot.transactions[0]?.categoryName).toBe('Needs review');
    expect(snapshot.transactions[0]?.reviewState).toBe('needs_review');
  });

  it('keeps an explicitly excluded transaction outside the review queue', () => {
    const snapshot = projectMoneySnapshot(
      {
        categories,
        plans,
        accounts: [],
        connections: [],
        transactions: [
          {
            id: 'excluded',
            financial_account_id: null,
            name: 'Transfer-like purchase',
            merchant_name: null,
            amount_cents: 1000,
            direction: 'outflow',
            date: '2026-07-02',
            pending: false,
            iso_currency_code: 'USD',
            budget_id: null,
            budget_match_source: 'excluded',
            money_meaning: 'not_counted',
          },
        ],
      },
      new Date('2026-07-23T18:00:00.000Z'),
    );

    expect(snapshot.totals.needsReviewCount).toBe(0);
    expect(snapshot.transactions[0]).toMatchObject({
      categoryName: 'Not counted',
      reviewState: 'not_counted',
    });
  });
});

import { projectMoneySnapshot } from './moneySnapshot';

const categories = [
  {
    id: 'category-grocery-uuid',
    slug: 'groceries',
    legacy_budget_id: 'groceries',
    name: 'Groceries',
    description: 'Food at home',
    accent_color: '#315545',
    cover_image: {
      source: 'unsplash', photoId: 'grocery-photo',
      imageUrl: 'https://images.unsplash.com/photo-grocery', photographerName: 'Maya Rivera',
      photographerUrl: 'https://unsplash.com/@maya', sourceUrl: 'https://unsplash.com/photos/grocery-photo',
      color: '#315545',
    },
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
  {
    category_id: 'category-grocery-uuid', base_budget_cents: 60000, rollover_enabled: false,
    forecast_mode: 'manual' as const, manual_projected_spend_cents: 70000,
  },
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
  it('projects a stored category role as both the effective and explicit role', () => {
    const snapshot = projectMoneySnapshot({
      categories,
      plans: [{ ...plans[0], plan_role: 'protected' }],
      accounts: [],
      connections: [],
      transactions: [],
    }, new Date(2026, 6, 24));

    expect(snapshot.categories[0]).toMatchObject({
      id: 'groceries',
      planRole: 'protected',
      planRoleOverride: 'protected',
    });
  });

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
            original_description: 'NEIGHBORHOOD MARKET 0042',
            authorized_date: '2026-07-19',
            amount_cents: 12500,
            direction: 'outflow',
            date: '2026-07-20',
            pending: false,
            iso_currency_code: 'USD',
            budget_id: 'groceries',
            budget_assignment_source: 'provider_policy',
            budget_assignment_policy_version: 'governed-category-v1',
            budget_assignment_governed: true,
            money_meaning: null,
            plan_role_override: 'protected',
            plan_role_override_reviewed_at: '2026-08-04T18:00:00.000Z',
            personal_finance_category_primary: 'FOOD_AND_DRINK',
            personal_finance_category_detailed: 'FOOD_AND_DRINK_GROCERIES',
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
      coverImage: expect.objectContaining({ photoId: 'grocery-photo' }),
      forecastSettings: {
        mode: 'manual',
        manualProjectedSpendCents: 70000,
        scheduledAmountCents: null,
        scheduledDueDay: null,
      },
    });
    expect(snapshot.accounts).toEqual([
      expect.objectContaining({ id: 'account-checking', transactionCount: 3 }),
      expect.objectContaining({ id: 'account-savings', transactionCount: 0 }),
    ]);
    expect(snapshot.transactions.find((transaction) => transaction.id === 'transaction-1')).toMatchObject({
      originalDescription: 'NEIGHBORHOOD MARKET 0042',
      authorizedDate: '2026-07-19',
      accountMask: '1042',
      accountType: 'depository',
      accountSubtype: 'checking',
      providerCategoryPrimary: 'FOOD_AND_DRINK',
      providerCategoryDetailed: 'FOOD_AND_DRINK_GROCERIES',
      assignmentSource: 'provider_policy',
      assignmentPolicyVersion: 'governed-category-v1',
      assignmentGoverned: true,
      planRoleOverride: 'protected',
    });
    expect(snapshot.lastSyncedAt).toBe('2026-07-23T16:00:00.000Z');
    expect(snapshot.forecast).toMatchObject({
      projectedSpendCents: 70000,
      projectedRemainingCents: 10000,
      projectedOverageCents: 0,
      confidence: 'medium',
    });
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
    expect(snapshot.outsidePlan).toEqual({ spentCents: 1000, transactionCount: 1 });
    expect(snapshot.transactions[0]?.categoryName).toBe('Needs review');
    expect(snapshot.transactions[0]?.reviewState).toBe('needs_review');
  });

  it('counts pending purchases immediately without trusting pending inflows', () => {
    const snapshot = projectMoneySnapshot({
      categories,
      plans,
      accounts: [],
      connections: [],
      transactions: [
        {
          id: 'pending-amazon', financial_account_id: null, name: 'Amazon', merchant_name: 'Amazon',
          amount_cents: 2685, direction: 'outflow', date: '2026-07-22', pending: true,
          iso_currency_code: 'USD', budget_id: 'category-grocery-uuid', money_meaning: null,
        },
        {
          id: 'pending-unknown', financial_account_id: null, name: 'Unknown', merchant_name: null,
          amount_cents: 500, direction: 'outflow', date: '2026-07-22', pending: true,
          iso_currency_code: 'USD', budget_id: null, money_meaning: null,
        },
        {
          id: 'pending-credit', financial_account_id: null, name: 'Refund', merchant_name: null,
          amount_cents: 1000, direction: 'inflow', date: '2026-07-22', pending: true,
          iso_currency_code: 'USD', budget_id: 'groceries', money_meaning: 'category_credit',
        },
        {
          id: 'pending-transfer', financial_account_id: null, name: 'Transfer', merchant_name: null,
          amount_cents: 2000, direction: 'outflow', date: '2026-07-22', pending: true,
          iso_currency_code: 'USD', budget_id: null, money_meaning: 'transfer',
        },
        {
          id: 'pending-excluded', financial_account_id: null, name: 'Outside', merchant_name: null,
          amount_cents: 3000, direction: 'outflow', date: '2026-07-22', pending: true,
          iso_currency_code: 'USD', budget_id: null, budget_match_source: 'excluded', money_meaning: 'not_counted',
        },
      ],
    }, new Date('2026-07-23T18:00:00.000Z'));

    expect(snapshot.categories[0]).toMatchObject({ spentCents: 2685, remainingCents: 57315 });
    expect(snapshot.totals).toMatchObject({ spentCents: 2685, remainingCents: 77315, needsReviewCount: 1 });
    expect(snapshot.outsidePlan).toEqual({ spentCents: 500, transactionCount: 1 });
    expect(snapshot.transactions.find((row) => row.id === 'pending-amazon')).toMatchObject({
      categoryName: 'Groceries',
      reviewState: 'assigned',
    });
    expect(snapshot.transactions.find((row) => row.id === 'pending-unknown')).toMatchObject({
      categoryName: 'Needs review',
      reviewState: 'needs_review',
    });
    expect(snapshot.transactions.find((row) => row.id === 'pending-transfer')).toMatchObject({
      reviewState: 'not_counted',
    });
  });

  it('does not count saved-money coverage against current category plan usage', () => {
    const snapshot = projectMoneySnapshot({
      categories: [categories[0]],
      plans: [{ ...plans[0], base_budget_cents: 19362 }],
      accounts: [],
      connections: [],
      transactions: [{
        id: 'orthodontics', financial_account_id: null, name: 'Jeremy B Matthews Dmd', merchant_name: 'Jeremy B Matthews Dmd',
        amount_cents: 311600, direction: 'outflow', date: '2026-07-22', pending: false,
        iso_currency_code: 'USD', budget_id: 'groceries', money_meaning: null,
        saved_resource_cents: 311600,
      }],
    }, new Date('2026-07-23T18:00:00.000Z'));

    expect(snapshot.categories[0]).toMatchObject({
      spentCents: 0,
      remainingCents: 19362,
      percentUsed: 0,
    });
    expect(snapshot.totals).toMatchObject({ spentCents: 0, remainingCents: 19362 });
    expect(snapshot.transactions[0]).toMatchObject({
      amountCents: 311600,
      savedResourceCents: 311600,
    });
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
    expect(snapshot.outsidePlan).toEqual({ spentCents: 0, transactionCount: 0 });
    expect(snapshot.transactions[0]).toMatchObject({
      categoryName: 'Not counted',
      reviewState: 'not_counted',
    });
  });

  it('projects the active merchant rule category onto matching transactions', () => {
    const snapshot = projectMoneySnapshot(
      {
        categories,
        plans,
        accounts: [],
        connections: [],
        rules: [{
          id: 'rule-1', budget_id: 'category-grocery-uuid', merchant_contains: 'costco 01234',
          merchant_match_mode: 'exact', label: 'Groceries merchant rule', created_from_transaction_id: 'transaction-1',
        }],
        transactions: [{
          id: 'transaction-1', financial_account_id: null, name: 'COSTCO #01234', merchant_name: 'COSTCO #01234',
          amount_cents: 1000, direction: 'outflow', date: '2026-07-02', pending: false,
          iso_currency_code: 'USD', budget_id: 'groceries', money_meaning: null,
        }],
      },
      new Date('2026-07-23T18:00:00.000Z'),
    );

    expect(snapshot.transactions[0]?.merchantRuleCategoryId).toBe('groceries');
  });

  it('preserves an explicit category correction so the detail screen can restore its rule offer', () => {
    const snapshot = projectMoneySnapshot(
      {
        categories,
        plans,
        accounts: [],
        connections: [],
        rules: [],
        transactions: [{
          id: 'transaction-1', financial_account_id: null, name: 'MAVERIK #00635', merchant_name: 'Maverik',
          amount_cents: 5270, direction: 'outflow', date: '2026-08-18', pending: false,
          iso_currency_code: 'USD', budget_id: 'category-grocery-uuid', budget_match_source: 'corrected', money_meaning: null,
        }],
      },
      new Date('2026-08-21T18:00:00.000Z'),
    );

    expect(snapshot.transactions[0]?.matchSource).toBe('corrected');
  });

  it('keeps one mixed-purchase row while allocating exact cents to each category meter', () => {
    const snapshot = projectMoneySnapshot(
      {
        categories,
        plans,
        accounts: [],
        connections: [],
        allocations: [
          { transaction_id: 'mixed-purchase', budget_id: 'category-grocery-uuid', amount_cents: 14000 },
          { transaction_id: 'mixed-purchase', budget_id: 'category-fun-uuid', amount_cents: 4496 },
        ],
        transactions: [{
          id: 'mixed-purchase', financial_account_id: null, name: 'Costco', merchant_name: 'Costco',
          amount_cents: 18496, direction: 'outflow', date: '2026-07-20', pending: false,
          iso_currency_code: 'USD', budget_id: null, budget_match_source: 'corrected', money_meaning: null,
        }],
      },
      new Date('2026-07-23T18:00:00.000Z'),
    );

    expect(snapshot.totals).toMatchObject({ spentCents: 18496, needsReviewCount: 0 });
    expect(snapshot.outsidePlan).toEqual({ spentCents: 0, transactionCount: 0 });
    expect(snapshot.categories.find((category) => category.id === 'groceries')).toMatchObject({
      spentCents: 14000,
      transactionCount: 1,
    });
    expect(snapshot.categories.find((category) => category.id === 'fun')).toMatchObject({
      spentCents: 4496,
      transactionCount: 1,
    });
    expect(snapshot.transactions).toHaveLength(1);
    expect(snapshot.transactions[0]).toMatchObject({
      id: 'mixed-purchase',
      categoryId: null,
      categoryName: 'Split across categories',
      reviewState: 'assigned',
      allocations: [
        {
          categoryId: 'groceries', sourceCategoryId: 'category-grocery-uuid',
          categoryName: 'Groceries', amountCents: 14000,
        },
        {
          categoryId: 'fun', sourceCategoryId: 'category-fun-uuid',
          categoryName: 'Fun', amountCents: 4496,
        },
      ],
    });
  });

  it('projects reserve availability and expected-need coverage without adding the reserve balance to the monthly target', () => {
    const snapshot = projectMoneySnapshot({
      categories: [categories[1]],
      plans: [{
        category_id: 'category-fun-uuid',
        base_budget_cents: 10000,
        rollover_enabled: false,
        funding_rhythm: 'reserve',
        funding_policy_version: 'category-funding-v1',
        starter_weight: 0.05,
        reserve_balance_cents: 30000,
        reserve_balance_period_id: '2026-08',
        expected_need_cents: 80000,
        expected_need_due_month: '2026-12',
      }],
      accounts: [],
      connections: [],
      transactions: [{
        id: 'gift', financial_account_id: null, name: 'Gift', merchant_name: 'Gift shop',
        amount_cents: 5000, direction: 'outflow', date: '2026-08-10', pending: false,
        iso_currency_code: 'USD', budget_id: 'fun', money_meaning: null,
      }],
    }, new Date('2026-08-15T18:00:00.000Z'));

    expect(snapshot.totals).toMatchObject({ plannedCents: 10000, spentCents: 5000 });
    expect(snapshot.categories[0]).toMatchObject({
      fundingRhythm: 'reserve',
      monthlyContributionCents: 10000,
      reserveAvailableCents: 35000,
      remainingCents: 35000,
      expectedNeed: { amountCents: 80000, dueMonth: '2026-12' },
      fundingCoverage: {
        status: 'shortfall',
        projectedAvailableCents: 75000,
        catchUpContributionCents: 1000,
      },
    });
  });
});

import type { MoneyTransaction } from '../data/moneySnapshot';
import type { LivingPlanAllocation } from './living-plan';
import { reconcileMoneyEconomicRoles } from './moneyEconomicRole';

function transaction(
  id: string,
  amountCents: number,
  overrides: Partial<MoneyTransaction> = {},
): MoneyTransaction {
  return {
    id,
    accountId: null,
    accountName: 'Checking',
    institutionName: 'Bank',
    merchantName: id,
    amountCents,
    direction: 'outflow',
    date: '2026-07-20',
    pending: false,
    currencyCode: 'USD',
    categoryId: null,
    categoryName: 'Needs review',
    reviewState: 'needs_review',
    moneyMeaning: null,
    ...overrides,
  };
}

function allocation(
  categoryId: string,
  amountCents: number,
  overrides: Partial<LivingPlanAllocation> = {},
): LivingPlanAllocation {
  return {
    categoryId,
    amountCents,
    fixedCents: 0,
    overrideCents: 0,
    flexibleCents: amountCents,
    exposureCents: 0,
    source: 'recent_spending',
    fundingRhythm: 'monthly',
    priorReserveCents: 0,
    expectedNeed: null,
    ...overrides,
  };
}

describe('reconcileMoneyEconomicRoles', () => {
  it('accounts for every transaction once while preserving exact split contributions', () => {
    const transactions = [
      transaction('rent', 80000, { categoryId: 'home', categoryName: 'Home', reviewState: 'assigned' }),
      transaction('market', 20000, { categoryId: 'groceries', categoryName: 'Groceries', reviewState: 'assigned' }),
      transaction('costco', 18496, {
        categoryName: 'Split across categories',
        reviewState: 'assigned',
        allocations: [
          { categoryId: 'home', sourceCategoryId: 'home-uuid', categoryName: 'Home', amountCents: 14000 },
          { categoryId: 'groceries', sourceCategoryId: 'grocery-uuid', categoryName: 'Groceries', amountCents: 4496 },
        ],
      }),
      transaction('refund', 3000, {
        direction: 'inflow',
        categoryId: 'groceries',
        categoryName: 'Groceries',
        reviewState: 'assigned',
        moneyMeaning: 'category_credit',
      }),
      transaction('pending-refund', 2000, {
        pending: true,
        direction: 'inflow',
        categoryId: 'groceries',
        categoryName: 'Groceries',
        reviewState: 'assigned',
        moneyMeaning: 'category_credit',
      }),
      transaction('gift', 5000, { reviewState: 'not_counted', moneyMeaning: 'not_counted' }),
      transaction('transfer', 7000, { moneyMeaning: 'transfer' }),
      transaction('pending-groceries', 5000, {
        pending: true,
        categoryId: 'groceries',
        categoryName: 'Groceries',
        reviewState: 'assigned',
      }),
      transaction('pending-unknown', 1500, { pending: true }),
      transaction('unknown', 1000),
    ];

    const result = reconcileMoneyEconomicRoles({
      transactions,
      allocations: [
        allocation('home', 80000, { fixedCents: 80000, flexibleCents: 0, source: 'fixed' }),
        allocation('groceries', 32000),
      ],
    });

    expect(result.rows).toHaveLength(transactions.length);
    expect(new Set(result.rows.map((row) => row.transactionId)).size).toBe(transactions.length);
    expect(result.totals).toEqual({
      protectedSpendingCents: 94000,
      flexibleSpendingCents: 26496,
      outsidePlanCents: 5000,
      neutralCents: 9000,
      unresolvedInScopeCents: 2500,
      savedResourceSpendingCents: 0,
    });
    expect(result.rows.find((row) => row.transactionId === 'costco')).toMatchObject({
      disposition: 'flexible_spending',
      contributions: [
        { role: 'protected_spending', amountCents: 14000, spendDeltaCents: 14000 },
        { role: 'flexible_spending', amountCents: 4496, spendDeltaCents: 4496 },
      ],
    });
    expect(result.rows.find((row) => row.transactionId === 'refund')).toMatchObject({
      disposition: 'not_spending',
      contributions: [{ role: 'flexible_spending', amountCents: 3000, spendDeltaCents: -3000 }],
    });
    expect(result.rows.find((row) => row.transactionId === 'pending-refund')).toMatchObject({
      disposition: 'not_spending',
      contributions: [],
    });
    expect(result.rows.find((row) => row.transactionId === 'pending-groceries')).toMatchObject({
      disposition: 'flexible_spending',
      contributions: [{ role: 'flexible_spending', amountCents: 5000, spendDeltaCents: 5000 }],
    });
    expect(result.rows.find((row) => row.transactionId === 'pending-unknown')).toMatchObject({
      disposition: 'unresolved',
    });
  });

  it('keeps an invalid or ungoverned assignment unresolved instead of silently dropping it', () => {
    const result = reconcileMoneyEconomicRoles({
      transactions: [
        transaction('unknown-category', 2000, {
          categoryId: 'mystery',
          categoryName: 'Mystery',
          reviewState: 'assigned',
        }),
        transaction('bad-split', 3000, {
          reviewState: 'assigned',
          allocations: [
            { categoryId: 'home', sourceCategoryId: 'home-uuid', categoryName: 'Home', amountCents: 1000 },
            { categoryId: 'groceries', sourceCategoryId: 'grocery-uuid', categoryName: 'Groceries', amountCents: 1000 },
          ],
        }),
      ],
      allocations: [
        allocation('home', 5000, { fixedCents: 5000, flexibleCents: 0, source: 'fixed' }),
        allocation('groceries', 5000),
      ],
    });

    expect(result.rows.map((row) => row.disposition)).toEqual(['unresolved', 'unresolved']);
    expect(result.totals.unresolvedInScopeCents).toBe(5000);
    expect(result.invariant).toEqual({
      valid: true,
      transactionCount: 2,
      accountedTransactionCount: 2,
    });
  });

  it('applies a reviewed transaction override without changing the category default', () => {
    const result = reconcileMoneyEconomicRoles({
      transactions: [transaction('groceries-for-party', 20000, {
        categoryId: 'groceries',
        categoryName: 'Groceries',
        reviewState: 'assigned',
        planRoleOverride: 'protected',
      })],
      allocations: [allocation('groceries', 50000)],
    });

    expect(result.rows[0]).toMatchObject({
      disposition: 'protected_spending',
      contributions: [{ role: 'protected_spending', amountCents: 20000, spendDeltaCents: 20000 }],
    });
    expect(result.totals.flexibleSpendingCents).toBe(0);
  });

  it('keeps actual spending intact while only monthly-plan coverage contributes to flexible use', () => {
    const result = reconcileMoneyEconomicRoles({
      transactions: [
        transaction('orthodontics', 311600, {
          categoryId: 'health',
          categoryName: 'Health & Activities',
          reviewState: 'assigned',
          savedResourceCents: 200000,
        }),
      ],
      allocations: [allocation('health', 19362)],
    });

    expect(result.rows[0]).toMatchObject({
      amountCents: 311600,
      savedResourceCents: 200000,
      monthlyPlanCents: 111600,
      contributions: [{ role: 'flexible_spending', amountCents: 311600, spendDeltaCents: 111600 }],
    });
    expect(result.totals.flexibleSpendingCents).toBe(111600);
    expect(result.totals.savedResourceSpendingCents).toBe(200000);
  });

  it('apportions monthly-plan coverage across a split without double-counting saved money', () => {
    const result = reconcileMoneyEconomicRoles({
      transactions: [transaction('split-purchase', 10000, {
        categoryName: 'Split across categories',
        reviewState: 'assigned',
        savedResourceCents: 3000,
        allocations: [
          { categoryId: 'home', sourceCategoryId: 'home-uuid', categoryName: 'Home', amountCents: 6000 },
          { categoryId: 'groceries', sourceCategoryId: 'grocery-uuid', categoryName: 'Groceries', amountCents: 4000 },
        ],
      })],
      allocations: [
        allocation('home', 6000, { fixedCents: 6000, flexibleCents: 0, source: 'fixed' }),
        allocation('groceries', 4000),
      ],
    });

    expect(result.rows[0]).toMatchObject({
      amountCents: 10000,
      savedResourceCents: 3000,
      monthlyPlanCents: 7000,
      contributions: [
        { role: 'protected_spending', amountCents: 6000, spendDeltaCents: 4200 },
        { role: 'flexible_spending', amountCents: 4000, spendDeltaCents: 2800 },
      ],
    });
    expect(result.totals.protectedSpendingCents).toBe(4200);
    expect(result.totals.flexibleSpendingCents).toBe(2800);
    expect(result.totals.savedResourceSpendingCents).toBe(3000);
    expect(
      result.totals.protectedSpendingCents
        + result.totals.flexibleSpendingCents
        + result.totals.savedResourceSpendingCents,
    ).toBe(10000);
  });

  it('requires a category credit to reference a governed spending role', () => {
    const result = reconcileMoneyEconomicRoles({
      transactions: [transaction('orphan-refund', 2500, {
        direction: 'inflow',
        moneyMeaning: 'category_credit',
        reviewState: 'assigned',
      })],
      allocations: [allocation('groceries', 5000)],
    });

    expect(result.rows[0]?.disposition).toBe('unresolved');
    expect(result.totals.unresolvedInScopeCents).toBe(2500);
  });

  it('keeps supported account transfers and credit-card payments out of spending', () => {
    const result = reconcileMoneyEconomicRoles({
      transactions: [
        transaction('account-transfer', 283100, {
          providerCategoryPrimary: 'TRANSFER_OUT',
          providerCategoryDetailed: 'TRANSFER_OUT_ACCOUNT_TRANSFER',
          providerCategoryConfidence: 'LOW',
        }),
        transaction('card-payment', 4297, {
          providerCategoryPrimary: 'LOAN_PAYMENTS',
          providerCategoryDetailed: 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT',
          providerCategoryConfidence: 'HIGH',
        }),
      ],
      allocations: [],
    });

    expect(result.rows.map((row) => row.disposition)).toEqual(['not_spending', 'not_spending']);
    expect(result.totals.neutralCents).toBe(287397);
    expect(result.totals.unresolvedInScopeCents).toBe(0);
  });

  it('keeps an assigned credit-card payment neutral despite its category or split', () => {
    const result = reconcileMoneyEconomicRoles({
      transactions: [
        transaction('assigned-card-payment', 4297, {
          categoryId: 'debt',
          categoryName: 'Debt & fees',
          reviewState: 'assigned',
          providerCategoryPrimary: 'LOAN_PAYMENTS',
          providerCategoryDetailed: 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT',
          providerCategoryConfidence: 'HIGH',
        }),
        transaction('split-card-payment', 10000, {
          categoryName: 'Split across categories',
          reviewState: 'assigned',
          providerCategoryPrimary: 'LOAN_PAYMENTS',
          providerCategoryDetailed: 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT',
          providerCategoryConfidence: 'HIGH',
          allocations: [
            { categoryId: 'debt', sourceCategoryId: 'debt-uuid', categoryName: 'Debt & fees', amountCents: 6000 },
            { categoryId: 'groceries', sourceCategoryId: 'grocery-uuid', categoryName: 'Groceries', amountCents: 4000 },
          ],
        }),
      ],
      allocations: [allocation('debt', 6000), allocation('groceries', 4000)],
    });

    expect(result.rows.map((row) => row.disposition)).toEqual(['not_spending', 'not_spending']);
    expect(result.totals.neutralCents).toBe(14297);
    expect(result.totals.protectedSpendingCents).toBe(0);
    expect(result.totals.flexibleSpendingCents).toBe(0);
  });

  it('does not assume payment-app transfers are neutral spending', () => {
    const result = reconcileMoneyEconomicRoles({
      transactions: [transaction('payment-app', 14000, {
        providerCategoryPrimary: 'TRANSFER_OUT',
        providerCategoryDetailed: 'TRANSFER_OUT_TRANSFER_OUT_FROM_APPS',
        providerCategoryConfidence: 'HIGH',
      })],
      allocations: [],
    });

    expect(result.rows[0]?.disposition).toBe('unresolved');
    expect(result.totals.unresolvedInScopeCents).toBe(14000);
  });

  it('uses supported provider evidence to keep an uncategorized commitment out of flexible spending', () => {
    const result = reconcileMoneyEconomicRoles({
      transactions: [transaction('rent', 180000, {
        providerCategoryPrimary: 'RENT_AND_UTILITIES',
        providerCategoryDetailed: 'RENT_AND_UTILITIES_RENT',
        providerCategoryConfidence: 'HIGH',
      })],
      allocations: [],
    });

    expect(result.rows[0]).toMatchObject({
      disposition: 'protected_spending',
      contributions: [{ role: 'protected_spending', amountCents: 180000, spendDeltaCents: 180000 }],
    });
    expect(result.totals.flexibleSpendingCents).toBe(0);
    expect(result.totals.unresolvedInScopeCents).toBe(0);
  });
});

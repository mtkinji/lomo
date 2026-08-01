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
      transaction('gift', 5000, { reviewState: 'not_counted', moneyMeaning: 'not_counted' }),
      transaction('transfer', 7000, { moneyMeaning: 'transfer' }),
      transaction('pending', 5000, { pending: true }),
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
      flexibleSpendingCents: 21496,
      outsidePlanCents: 5000,
      neutralCents: 12000,
      unresolvedInScopeCents: 1000,
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
});

import type { MoneyCategory, MoneyTransaction } from '../data/moneySnapshot';
import { projectMoneyPlanAudit } from './moneyPlanAudit';

describe('projectMoneyPlanAudit', () => {
  it('reconciles actual spending without treating unclear activity as flexible', () => {
    const audit = projectMoneyPlanAudit({
      periodId: '2026-07',
      categories: [
        category('housing', 'Housing', 'protected', 200000),
        category('flex', 'Shopping', 'flexible', 50000),
      ],
      transactions: [
        transaction('rent', 8000, { categoryId: 'housing', categoryName: 'Housing' }),
        transaction('purchase', 1200, { categoryId: 'flex', categoryName: 'Shopping' }),
        transaction('refund', 200, {
          direction: 'inflow',
          categoryId: 'flex',
          categoryName: 'Shopping',
          moneyMeaning: 'category_credit',
        }),
        transaction('uncertain', 800),
        transaction('outside', 500, { reviewState: 'not_counted', moneyMeaning: 'not_counted' }),
        transaction('transfer', 30000, { providerCategoryDetailed: 'TRANSFER_OUT_ACCOUNT_TRANSFER' }),
        transaction('old', 9999, { date: '2026-06-30', categoryId: 'flex', categoryName: 'Shopping' }),
      ],
    });

    expect(audit.committedTransactionIds).toEqual(['rent']);
    expect(audit.committedSpendingCents).toBe(8000);
    expect(audit.flexibleTransactionIds).toEqual(['purchase']);
    expect(audit.flexibleSpendingCents).toBe(1000);
    expect(audit.unclearTransactionIds).toEqual(['uncertain']);
    expect(audit.unclearSpendingCents).toBe(800);
    expect(audit.outsidePlanTransactionIds).toEqual(['outside']);
    expect(audit.outsidePlanSpendingCents).toBe(500);
    expect(audit.nonSpendingTransactionIds).toEqual(['refund', 'transfer']);
    expect(audit.nonSpendingCents).toBe(30000);
    expect(audit.incomeReceivedCents).toBe(0);
    expect(audit.totalSpendingCents).toBe(10300);
    expect(audit.countedFlexibleSpendCents).toBe(1800);
    expect(audit.protectedCategories).toEqual([
      { categoryId: 'housing', name: 'Housing', plannedCents: 200000 },
    ]);
    expect(audit.isComplete).toBe(true);
  });

  it('separates posted income and full actual spending from month-plan coverage', () => {
    const audit = projectMoneyPlanAudit({
      periodId: '2026-07',
      categories: [category('flex', 'Shopping', 'flexible', 50000)],
      transactions: [
        transaction('paycheck', 50000, { direction: 'inflow', moneyMeaning: 'income' }),
        transaction('provider-paycheck', 25000, {
          direction: 'inflow', moneyMeaning: null, providerCategoryPrimary: 'INCOME',
        }),
        transaction('pending-paycheck', 10000, { direction: 'inflow', moneyMeaning: 'income', pending: true }),
        transaction('account-transfer', 20000, { direction: 'inflow', moneyMeaning: 'transfer' }),
        transaction('provider-transfer', 30000, {
          direction: 'inflow', moneyMeaning: null, providerCategoryPrimary: 'TRANSFER_IN',
        }),
        transaction('purchase', 10000, {
          categoryId: 'flex', categoryName: 'Shopping', savedResourceCents: 4000,
        }),
        transaction('refund', 500, {
          direction: 'inflow', categoryId: 'flex', categoryName: 'Shopping', moneyMeaning: 'category_credit',
        }),
      ],
    });

    expect(audit.incomeReceivedCents).toBe(75000);
    expect(audit.flexibleSpendingCents).toBe(5500);
    expect(audit.savedResourceSpendingCents).toBe(4000);
    expect(audit.totalSpendingCents).toBe(9500);
  });

  it('exposes the protected category amounts that create flexible capacity', () => {
    const audit = projectMoneyPlanAudit({
      periodId: '2026-07',
      categories: [
        category('housing', 'Housing & Utilities', 'protected', 400000),
        category('groceries', 'Groceries', 'flexible', 90000),
      ],
      transactions: [],
    });

    expect(audit.protectedCategories).toEqual([
      { categoryId: 'housing', name: 'Housing & Utilities', plannedCents: 400000 },
    ]);
  });
});

function category(
  id: string,
  name: string,
  planRole: NonNullable<MoneyCategory['planRole']>,
  plannedCents: number,
): MoneyCategory {
  return { id, sourceId: id, name, planRole, plannedCents } as MoneyCategory;
}

function transaction(
  id: string,
  amountCents: number,
  overrides: Partial<MoneyTransaction> = {},
): MoneyTransaction {
  return {
    id,
    accountId: 'checking',
    accountName: 'Checking',
    institutionName: 'Bank',
    merchantName: id,
    amountCents,
    direction: 'outflow',
    date: '2026-07-15',
    pending: false,
    currencyCode: 'USD',
    categoryId: null,
    categoryName: 'Needs review',
    reviewState: 'needs_review',
    moneyMeaning: null,
    ...overrides,
  };
}

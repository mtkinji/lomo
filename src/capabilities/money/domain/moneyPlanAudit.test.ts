import type { MoneyCategory, MoneyTransaction } from '../data/moneySnapshot';
import { projectMoneyPlanAudit } from './moneyPlanAudit';

describe('projectMoneyPlanAudit', () => {
  it('separates flexible evidence from activity that does not count', () => {
    const audit = projectMoneyPlanAudit({
      periodId: '2026-07',
      categories: [category('flex', 'Shopping', 'flexible', 50000)],
      transactions: [
        transaction('purchase', 1200, { categoryId: 'flex', categoryName: 'Shopping' }),
        transaction('uncertain', 800),
        transaction('transfer', 30000, { providerCategoryDetailed: 'TRANSFER_OUT_ACCOUNT_TRANSFER' }),
        transaction('payment', 4500, { providerCategoryDetailed: 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT' }),
        transaction('old', 9999, { date: '2026-06-30', categoryId: 'flex', categoryName: 'Shopping' }),
      ],
    });

    expect(audit.flexibleTransactionIds).toEqual(['purchase', 'uncertain']);
    expect(audit.countedFlexibleSpendCents).toBe(2000);
    expect(audit.notCountedTransactionIds).toEqual(['transfer', 'payment']);
    expect(audit.notCountedCents).toBe(34500);
    expect(audit.protectedCategories).toEqual([]);
    expect(audit.isComplete).toBe(true);
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

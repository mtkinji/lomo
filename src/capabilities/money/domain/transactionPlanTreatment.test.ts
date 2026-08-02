import type { MoneyCategory, MoneyTransaction } from '../data/moneySnapshot';
import { getTransactionPlanTreatment } from './transactionPlanTreatment';

const protectedCategory = { id: 'housing', sourceId: 'housing-source', name: 'Housing', planRole: 'protected' } as MoneyCategory;
const flexibleCategory = { id: 'food', sourceId: 'food-source', name: 'Food', planRole: 'flexible' } as MoneyCategory;

function transaction(overrides: Partial<MoneyTransaction> = {}): MoneyTransaction {
  return {
    id: 'transaction-1', accountId: 'checking', accountName: 'Checking', institutionName: 'Bank',
    merchantName: 'Merchant', amountCents: 10000, direction: 'outflow', date: '2026-07-15',
    pending: false, currencyCode: 'USD', categoryId: 'housing', categoryName: 'Housing',
    reviewState: 'assigned', moneyMeaning: 'unknown', ...overrides,
  };
}

describe('getTransactionPlanTreatment', () => {
  it('explains that an ordinary outflow inherits its category role', () => {
    expect(getTransactionPlanTreatment(transaction(), [protectedCategory, flexibleCategory])).toEqual({
      kind: 'protected',
      label: 'Protected via Housing',
    });
  });

  it('names an outside-plan transaction without consulting its old category', () => {
    expect(getTransactionPlanTreatment(transaction({ moneyMeaning: 'not_counted', reviewState: 'not_counted' }), [protectedCategory])).toEqual({
      kind: 'outside',
      label: 'Outside the plan',
    });
  });

  it('discloses when a split spans both category roles', () => {
    expect(getTransactionPlanTreatment(transaction({
      categoryId: null,
      allocations: [
        { categoryId: 'housing', sourceCategoryId: 'housing-source', categoryName: 'Housing', amountCents: 6000 },
        { categoryId: 'food', sourceCategoryId: 'food-source', categoryName: 'Food', amountCents: 4000 },
      ],
    }), [protectedCategory, flexibleCategory])).toEqual({
      kind: 'mixed',
      label: 'Split across protected and flexible',
    });
  });
});


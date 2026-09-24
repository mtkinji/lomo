import type { MoneyTransaction } from '../data/moneySnapshot';
import { buildMoneyFirstLook } from './moneyFirstLook';

const transaction = (overrides: Partial<MoneyTransaction> = {}): MoneyTransaction => ({
  id: 'one', accountId: 'account', accountName: 'Checking', institutionName: 'Bank',
  merchantName: 'Shop', amountCents: 2300, direction: 'outflow', date: '2026-09-01', pending: false,
  currencyCode: 'USD', categoryId: 'shopping', categoryName: 'Shopping', reviewState: 'assigned', moneyMeaning: null,
  ...overrides,
});

describe('buildMoneyFirstLook', () => {
  it('reports only loaded, linked, posted outflows, not a monthly extrapolation', () => {
    expect(buildMoneyFirstLook([
      transaction(), transaction({ id: 'two', amountCents: 500, date: '2026-09-07' }),
      transaction({ id: 'pending', pending: true }), transaction({ id: 'income', direction: 'inflow', moneyMeaning: 'income' }),
      transaction({ id: 'transfer', moneyMeaning: 'transfer' }), transaction({ id: 'excluded', moneyMeaning: 'not_counted' }),
      transaction({ id: 'card', providerCategoryDetailed: 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT' }),
      transaction({ id: 'other', accountId: 'another-user-account' }),
    ], ['account'])).toEqual({ amountCents: 2800, currencyCode: 'USD', transactionIds: ['one', 'two'], startDate: '2026-09-01', endDate: '2026-09-07' });
  });
  it('deduplicates IDs and omits invalid amounts and dates', () => {
    const result = buildMoneyFirstLook([transaction(), transaction(), transaction({ id: 'bad', amountCents: NaN }), transaction({ id: 'date', date: 'no-date' })], ['account']);
    expect(result?.transactionIds).toEqual(['one']);
    expect(result?.amountCents).toBe(2300);
  });
  it('does not add unlike currencies', () => {
    expect(buildMoneyFirstLook([transaction(), transaction({ id: 'eur', currencyCode: 'EUR' })], ['account'])).toBeNull();
  });
  it('does not invent zero-spending success for empty or unlinked data', () => {
    expect(buildMoneyFirstLook([], ['account'])).toBeNull();
    expect(buildMoneyFirstLook([transaction()], [])).toBeNull();
  });
  it('does not subtract refunds while describing gross outgoing transactions', () => {
    expect(buildMoneyFirstLook([transaction(), transaction({ id: 'refund', direction: 'inflow', moneyMeaning: 'category_credit' })], ['account'])?.amountCents).toBe(2300);
  });
});

import type { MoneyTransaction } from '../data/moneySnapshot';
import {
  buildCumulativeSpendSeries,
  getSimilarMerchantTransactions,
  groupMoneyTransactionsByDate,
} from './moneyDetailView';

function transaction(overrides: Partial<MoneyTransaction>): MoneyTransaction {
  return {
    id: 'transaction', accountId: 'account', accountName: 'Checking', institutionName: 'Bank',
    merchantName: 'Market', originalDescription: 'MARKET', authorizedDate: null, accountMask: '1234',
    accountType: 'depository', accountSubtype: 'checking', providerCategoryPrimary: null,
    providerCategoryDetailed: null, providerCategoryConfidence: null, amountCents: 1000,
    direction: 'outflow', date: '2026-07-02', pending: false, currencyCode: 'USD', categoryId: 'groceries',
    categoryName: 'Groceries', reviewState: 'assigned', moneyMeaning: null, ...overrides,
  };
}

describe('money detail view projection', () => {
  it('builds cumulative posted category spend without credits or excluded rows', () => {
    expect(buildCumulativeSpendSeries([
      transaction({ id: 'one', date: '2026-07-02', amountCents: 1000 }),
      transaction({ id: 'two', date: '2026-07-04', amountCents: 2500 }),
      transaction({ id: 'credit', date: '2026-07-05', direction: 'inflow', moneyMeaning: 'category_credit', amountCents: 500 }),
      transaction({ id: 'pending', date: '2026-07-06', pending: true, amountCents: 9999 }),
    ], '2026-07-01', '2026-07-31')).toEqual([
      { xPercent: 3.33, valueCents: 1000 },
      { xPercent: 10, valueCents: 3500 },
      { xPercent: 13.33, valueCents: 3000 },
    ]);
  });

  it('groups newest transactions by readable date', () => {
    const groups = groupMoneyTransactionsByDate([
      transaction({ id: 'new', date: '2026-07-04' }),
      transaction({ id: 'old', date: '2026-07-02' }),
    ]);
    expect(groups.map((group) => group.transactions.map((row) => row.id))).toEqual([['new'], ['old']]);
  });

  it('finds stable partial-merchant candidates without returning the selected row', () => {
    const selected = transaction({ id: 'selected', merchantName: "Trader Joe's #123" });
    const rows = [
      selected,
      transaction({ id: 'same', merchantName: "TRADER JOE'S #456" }),
      transaction({ id: 'other', merchantName: 'Whole Foods' }),
    ];
    expect(getSimilarMerchantTransactions(rows, selected, 'partial').map((row) => row.id)).toEqual(['same']);
  });
});

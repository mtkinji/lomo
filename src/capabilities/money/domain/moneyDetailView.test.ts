import type { MoneyTransaction } from '../data/moneySnapshot';
import {
  buildHistoricalAverageSpendSeries,
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

  it('charts only the portion of a purchase covered by the monthly plan', () => {
    expect(buildCumulativeSpendSeries([
      transaction({
        id: 'saved-money-purchase',
        date: '2026-08-18',
        amountCents: 33_202,
        savedResourceCents: 33_202,
      }),
      transaction({ id: 'mortgage', date: '2026-08-19', amountCents: 388_051 }),
    ], '2026-08-01', '2026-08-31')).toEqual([
      { xPercent: 60, valueCents: 388_051 },
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

  it('previews candidates using the edited partial merchant value', () => {
    const selected = transaction({ id: 'selected', merchantName: 'Amazon Marketplace Purchase' });
    const rows = [
      selected,
      transaction({ id: 'amazon', merchantName: 'Amazon Prime' }),
      transaction({ id: 'purchase', merchantName: 'Local Purchase' }),
    ];

    expect(getSimilarMerchantTransactions(rows, selected, 'partial', 'Amazon').map((row) => row.id)).toEqual(['amazon']);
  });
});

describe('buildHistoricalAverageSpendSeries', () => {
  it('averages front-loaded and continuous completed months on a normalized calendar', () => {
    const result = buildHistoricalAverageSpendSeries({
      transactions: [
        transaction({ id: 'january-rent', date: '2026-01-01', amountCents: 10000 }),
        transaction({ id: 'february-midmonth', date: '2026-02-14', amountCents: 10000 }),
      ],
      periodStartIso: '2026-03-01',
      periodEndIso: '2026-03-31',
    });

    expect(result.monthsUsed).toBe(2);
    expect(result.series).toHaveLength(31);
    expect(result.series[0]).toEqual({ xPercent: 0, valueCents: 5000 });
    expect(result.series.at(-1)).toEqual({ xPercent: 100, valueCents: 10000 });
  });

  it('subtracts category credits and excludes pending, transfer, and outside-plan activity', () => {
    const result = buildHistoricalAverageSpendSeries({
      transactions: [
        transaction({ id: 'spend', date: '2026-01-10', amountCents: 10000 }),
        transaction({ id: 'credit', date: '2026-01-20', direction: 'inflow', moneyMeaning: 'category_credit', amountCents: 2500 }),
        transaction({ id: 'pending', date: '2026-01-21', pending: true, amountCents: 50000 }),
        transaction({ id: 'transfer', date: '2026-01-22', moneyMeaning: 'transfer', amountCents: 50000 }),
        transaction({ id: 'outside', date: '2026-01-23', moneyMeaning: 'not_counted', amountCents: 50000 }),
      ],
      periodStartIso: '2026-02-01',
      periodEndIso: '2026-02-28',
    });

    expect(result.monthsUsed).toBe(1);
    expect(result.series.at(-1)?.valueCents).toBe(7500);
  });

  it('normalizes 28, 29, 30, and 31-day months and rejects the displayed month', () => {
    const result = buildHistoricalAverageSpendSeries({
      transactions: [
        transaction({ id: 'feb-28', date: '2023-02-14', amountCents: 10000 }),
        transaction({ id: 'feb-29', date: '2024-02-15', amountCents: 10000 }),
        transaction({ id: 'apr-30', date: '2024-04-15', amountCents: 10000 }),
        transaction({ id: 'may-31', date: '2024-05-16', amountCents: 10000 }),
        transaction({ id: 'displayed', date: '2024-06-01', amountCents: 90000 }),
      ],
      periodStartIso: '2024-06-01',
      periodEndIso: '2024-06-30',
      maxMonths: 18,
    });

    expect(result.monthsUsed).toBe(4);
    expect(result.series[15].valueCents).toBe(10000);
    expect(result.series.at(-1)?.valueCents).toBe(10000);
  });

  it('uses at most the requested completed months and returns no line without eligible history', () => {
    const limited = buildHistoricalAverageSpendSeries({
      transactions: [
        transaction({ id: 'old', date: '2025-12-10', amountCents: 5000 }),
        transaction({ id: 'recent', date: '2026-01-10', amountCents: 10000 }),
      ],
      periodStartIso: '2026-02-01',
      periodEndIso: '2026-02-28',
      maxMonths: 1,
    });
    const empty = buildHistoricalAverageSpendSeries({
      transactions: [transaction({ date: '2026-02-10' })],
      periodStartIso: '2026-02-01',
      periodEndIso: '2026-02-28',
    });

    expect(limited).toMatchObject({ monthsUsed: 1 });
    expect(limited.series.at(-1)?.valueCents).toBe(10000);
    expect(empty).toEqual({ monthsUsed: 0, series: [] });
  });
});

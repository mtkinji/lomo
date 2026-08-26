import { getTransactionMeaningOptions } from './transactionMeaningOptions';

describe('getTransactionMeaningOptions', () => {
  it('offers transfer and outside-plan meanings for outflows', () => {
    expect(getTransactionMeaningOptions('outflow')).toEqual([
      { meaning: 'transfer', label: 'Internal transfer', detail: 'Money moved between your own accounts—not spending' },
      { meaning: 'not_counted', label: 'Outside the plan', detail: 'Spending you don’t want included in this monthly plan' },
    ]);
  });

  it('also offers income for inflows', () => {
    expect(getTransactionMeaningOptions('inflow')).toEqual([
      { meaning: 'income', label: 'Income', detail: 'Income evidence—not a direct addition to the plan' },
      { meaning: 'transfer', label: 'Internal transfer', detail: 'Money moved between your own accounts—not spending' },
      { meaning: 'not_counted', label: 'Outside the plan', detail: 'Money you don’t want included in income or this monthly plan' },
    ]);
  });
});

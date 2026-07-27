import { getTransactionMeaningOptions } from './transactionMeaningOptions';

describe('getTransactionMeaningOptions', () => {
  it('offers transfer and outside-plan meanings for outflows', () => {
    expect(getTransactionMeaningOptions('outflow')).toEqual([
      { meaning: 'transfer', label: 'Internal transfer', detail: 'Money moved between your accounts' },
      { meaning: 'not_counted', label: 'Outside the plan', detail: 'Do not count this as spending or income' },
    ]);
  });

  it('also offers income for inflows', () => {
    expect(getTransactionMeaningOptions('inflow')).toEqual([
      { meaning: 'income', label: 'Income', detail: 'Available to fund the plan' },
      { meaning: 'transfer', label: 'Internal transfer', detail: 'Money moved between your accounts' },
      { meaning: 'not_counted', label: 'Outside the plan', detail: 'Do not count this as spending or income' },
    ]);
  });
});

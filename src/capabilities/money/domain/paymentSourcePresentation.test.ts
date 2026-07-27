import { getPaymentSourcePresentation } from './paymentSourcePresentation';

const base = {
  direction: 'outflow' as const,
  accountType: 'depository',
  accountSubtype: 'checking',
  institutionName: 'Unknown Bank',
  accountName: 'Checking',
  merchantName: 'Merchant',
  originalDescription: 'Merchant purchase',
  providerCategoryPrimary: null,
  providerCategoryDetailed: null,
  paymentChannel: null,
  transactionCode: null,
};

describe('getPaymentSourcePresentation', () => {
  it('uses bank-account grammar for checking transfers', () => {
    expect(getPaymentSourcePresentation({
      ...base,
      providerCategoryDetailed: 'TRANSFER_OUT_ACCOUNT_TRANSFER',
    })).toMatchObject({ kind: 'bank_account', railLabel: 'Account transfer' });
  });

  it('does not infer a card from ordinary checking activity', () => {
    expect(getPaymentSourcePresentation(base)).toMatchObject({ kind: 'bank_account' });
  });

  it('uses card grammar for a credit account', () => {
    expect(getPaymentSourcePresentation({
      ...base,
      accountType: 'credit',
      accountSubtype: 'credit card',
    })).toMatchObject({ kind: 'credit_card' });
  });

  it('uses debit-card grammar only when explicit imported evidence exists', () => {
    expect(getPaymentSourcePresentation({
      ...base,
      paymentChannel: 'in store',
      transactionCode: 'debit',
    })).toMatchObject({ kind: 'debit_card' });
  });

  it('uses deposit grammar for inflows', () => {
    expect(getPaymentSourcePresentation({ ...base, direction: 'inflow' })).toMatchObject({
      kind: 'deposit',
    });
  });

  it.each(['Chase', 'CHASE BANK', 'JPMorgan Chase'])('uses Chase blue for %s', (institutionName) => {
    expect(getPaymentSourcePresentation({ ...base, institutionName }).palette).toEqual({
      primary: '#0A5DBB',
      soft: '#EAF3FF',
      foreground: '#FFFFFF',
    });
  });

  it('uses the neutral pine palette for an unknown institution', () => {
    expect(getPaymentSourcePresentation(base).palette).toEqual({
      primary: '#315545',
      soft: '#EEF5F1',
      foreground: '#FFFFFF',
    });
  });
});

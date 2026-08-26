import type { MoneyTransaction } from '../data/moneySnapshot';
import {
  collapseLinkedCreditCardPaymentTransfers,
  linkCreditCardPaymentTransfers,
} from './creditCardPaymentTransfers';

describe('credit-card payment transfers', () => {
  it('links the unique equal-and-opposite card credit and makes both sides neutral', () => {
    const rows = linkCreditCardPaymentTransfers([
      transaction('checking-payment', {
        accountName: 'Total Checking',
        accountType: 'depository',
        accountSubtype: 'checking',
        accountMask: '6860',
        amountCents: 350_065,
        date: '2026-08-14',
        direction: 'outflow',
        originalDescription: 'Payment to Chase card ending in 5824 08/14',
        providerCategoryDetailed: 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT',
      }),
      transaction('card-credit', {
        accountName: 'Credit Card',
        accountType: 'credit',
        accountSubtype: 'credit card',
        accountMask: '5824',
        amountCents: 350_065,
        date: '2026-08-14',
        direction: 'inflow',
        originalDescription: 'Payment Thank You-Mobile',
      }),
    ]);

    expect(rows).toEqual([
      expect.objectContaining({
        id: 'checking-payment',
        categoryName: 'Internal transfer',
        moneyMeaning: 'transfer',
        reviewState: 'not_counted',
        transferPair: {
          counterpartTransactionId: 'card-credit',
          destinationAccountName: 'Credit Card',
          sourceAccountName: 'Total Checking',
        },
      }),
      expect.objectContaining({
        id: 'card-credit',
        categoryName: 'Internal transfer',
        moneyMeaning: 'transfer',
        reviewState: 'not_counted',
        transferPair: {
          counterpartTransactionId: 'checking-payment',
          destinationAccountName: 'Credit Card',
          sourceAccountName: 'Total Checking',
        },
      }),
    ]);
    expect(collapseLinkedCreditCardPaymentTransfers(rows).map((row) => row.id))
      .toEqual(['checking-payment']);
  });

  it('uses a referenced card mask to disambiguate multiple same-amount card credits', () => {
    const rows = linkCreditCardPaymentTransfers([
      transaction('checking-payment', {
        amountCents: 10_000,
        direction: 'outflow',
        originalDescription: 'Payment to card ending in 5824',
        providerCategoryDetailed: 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT',
      }),
      transaction('card-5824', {
        accountName: 'Credit Card 5824', accountMask: '5824', accountType: 'credit', accountSubtype: 'credit card',
        amountCents: 10_000, direction: 'inflow',
      }),
      transaction('card-1806', {
        accountName: 'Credit Card 1806', accountMask: '1806', accountType: 'credit', accountSubtype: 'credit card',
        amountCents: 10_000, direction: 'inflow',
      }),
    ]);

    expect(rows.find((row) => row.id === 'checking-payment')?.transferPair?.counterpartTransactionId)
      .toBe('card-5824');
    expect(rows.find((row) => row.id === 'card-1806')?.transferPair).toBeUndefined();
  });

  it('does not pair ambiguous amount-only candidates or override explicit household meaning', () => {
    const rows = linkCreditCardPaymentTransfers([
      transaction('checking-payment', {
        amountCents: 964,
        direction: 'outflow',
        providerCategoryDetailed: 'LOAN_PAYMENTS_CREDIT_CARD_PAYMENT',
      }),
      transaction('card-one', {
        accountName: 'Card One', accountMask: '1111', accountType: 'credit', accountSubtype: 'credit card',
        amountCents: 964, direction: 'inflow',
      }),
      transaction('card-two', {
        accountName: 'Card Two', accountMask: '2222', accountType: 'credit', accountSubtype: 'credit card',
        amountCents: 964, direction: 'inflow', moneyMeaning: 'category_credit', reviewState: 'assigned',
      }),
      transaction('card-three', {
        accountName: 'Card Three', accountMask: '3333', accountType: 'credit', accountSubtype: 'credit card',
        amountCents: 964, direction: 'inflow',
      }),
    ]);

    expect(rows.find((row) => row.id === 'checking-payment')).toMatchObject({
      moneyMeaning: 'transfer',
      reviewState: 'not_counted',
    });
    expect(rows.every((row) => row.transferPair == null)).toBe(true);
    expect(rows.find((row) => row.id === 'card-two')).toMatchObject({
      moneyMeaning: 'category_credit',
      reviewState: 'assigned',
    });
  });
});

function transaction(id: string, overrides: Partial<MoneyTransaction> = {}): MoneyTransaction {
  return {
    id,
    accountId: `${id}-account`,
    accountName: 'Checking',
    institutionName: 'Chase',
    originalDescription: id,
    accountMask: null,
    accountType: 'depository',
    accountSubtype: 'checking',
    providerCategoryPrimary: null,
    providerCategoryDetailed: null,
    providerCategoryConfidence: null,
    merchantName: id,
    amountCents: 1_000,
    direction: 'outflow',
    date: '2026-08-14',
    pending: false,
    currencyCode: 'USD',
    categoryId: null,
    categoryName: 'Needs review',
    reviewState: 'needs_review',
    moneyMeaning: null,
    ...overrides,
  };
}

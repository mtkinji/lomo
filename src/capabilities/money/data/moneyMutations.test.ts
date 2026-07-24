import {
  buildMerchantRuleUpsert,
  buildTransactionMeaningReviewUpdate,
  buildTransactionReviewUpdate,
} from './moneyMutations';

describe('buildTransactionReviewUpdate', () => {
  it('builds one corrected category assignment', () => {
    expect(buildTransactionReviewUpdate(
      { type: 'category', categoryId: 'groceries' },
      '2026-07-23T19:00:00.000Z',
    )).toEqual({
      budget_id: 'groceries',
      budget_match_source: 'corrected',
      budget_match_confidence: 1,
      budget_match_reason: 'Assigned to category.',
      budget_match_reviewed_at: '2026-07-23T19:00:00.000Z',
    });
  });

  it('marks a transaction explicitly outside the plan in one update', () => {
    expect(buildTransactionReviewUpdate(
      { type: 'not_counted' },
      '2026-07-23T19:00:00.000Z',
    )).toEqual({
      budget_id: null,
      budget_match_source: 'excluded',
      budget_match_confidence: 1,
      budget_match_reason: 'Marked as not part of any budget.',
      budget_match_reviewed_at: '2026-07-23T19:00:00.000Z',
      money_meaning: 'not_counted',
      money_meaning_source: 'confirmed',
      money_meaning_category_budget_id: null,
      money_meaning_reason: 'Marked as outside the budget.',
      money_meaning_reviewed_at: '2026-07-23T19:00:00.000Z',
    });
  });

  it('rejects an empty category id', () => {
    expect(() => buildTransactionReviewUpdate({ type: 'category', categoryId: '  ' })).toThrow('Choose a category.');
  });
});

describe('buildTransactionMeaningReviewUpdate', () => {
  it.each([
    ['income', 'Treated as household income.'],
    ['transfer', 'Treated as an internal transfer.'],
    ['not_counted', 'Marked as outside the budget.'],
  ] as const)('builds one confirmed %s review', (meaning, reason) => {
    expect(buildTransactionMeaningReviewUpdate(
      { meaning },
      '2026-07-23T19:00:00.000Z',
    )).toEqual({
      money_meaning: meaning,
      money_meaning_source: 'confirmed',
      money_meaning_category_budget_id: null,
      money_meaning_reason: reason,
      money_meaning_reviewed_at: '2026-07-23T19:00:00.000Z',
      budget_id: null,
      budget_match_source: 'excluded',
      budget_match_confidence: 1,
      budget_match_reason: reason,
      budget_match_reviewed_at: '2026-07-23T19:00:00.000Z',
    });
  });

  it('builds a category-credit review against the source category id', () => {
    expect(buildTransactionMeaningReviewUpdate(
      { meaning: 'category_credit', categoryId: 'category-uuid' },
      '2026-07-23T19:00:00.000Z',
    )).toMatchObject({
      money_meaning: 'category_credit',
      money_meaning_category_budget_id: 'category-uuid',
      budget_id: 'category-uuid',
      budget_match_source: 'corrected',
      budget_match_reason: 'Treated as a category credit.',
    });
  });

  it('rejects a category credit without a category', () => {
    expect(() => buildTransactionMeaningReviewUpdate({ meaning: 'category_credit', categoryId: ' ' }))
      .toThrow('Choose a category for this credit.');
  });
});

describe('buildMerchantRuleUpsert', () => {
  it('normalizes an exact merchant rule owned by the signed-in user', () => {
    expect(buildMerchantRuleUpsert({
      userId: 'user-1',
      transactionId: 'transaction-1',
      merchantName: '  COSTCO #01234  ',
      categoryId: 'category-1',
      categoryName: 'Groceries',
    })).toEqual({
      user_id: 'user-1',
      budget_id: 'category-1',
      merchant_contains: 'costco 01234',
      merchant_match_mode: 'exact',
      label: 'Groceries merchant rule',
      created_from_transaction_id: 'transaction-1',
    });
  });

  it('rejects a rule without a usable merchant or category', () => {
    expect(() => buildMerchantRuleUpsert({
      userId: 'user-1', transactionId: 'transaction-1', merchantName: '---', categoryId: 'category-1', categoryName: 'Groceries',
    })).toThrow('This transaction does not have a usable merchant name.');
    expect(() => buildMerchantRuleUpsert({
      userId: 'user-1', transactionId: 'transaction-1', merchantName: 'Costco', categoryId: ' ', categoryName: 'Groceries',
    })).toThrow('Choose a category before saving a merchant rule.');
  });
});

import { buildTransactionReviewUpdate } from './moneyMutations';

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

export type TransactionReviewInput =
  | { type: 'category'; categoryId: string }
  | { type: 'not_counted' };

export type TransactionReviewUpdate = {
  budget_id: string | null;
  budget_match_source: 'corrected' | 'excluded';
  budget_match_confidence: 1;
  budget_match_reason: string;
  budget_match_reviewed_at: string;
  money_meaning?: 'not_counted';
  money_meaning_source?: 'confirmed';
  money_meaning_category_budget_id?: null;
  money_meaning_reason?: string;
  money_meaning_reviewed_at?: string;
};

export function buildTransactionReviewUpdate(
  input: TransactionReviewInput,
  reviewedAt = new Date().toISOString(),
): TransactionReviewUpdate {
  if (input.type === 'category') {
    const categoryId = input.categoryId.trim();
    if (!categoryId) throw new Error('Choose a category.');
    return {
      budget_id: categoryId,
      budget_match_source: 'corrected',
      budget_match_confidence: 1,
      budget_match_reason: 'Assigned to category.',
      budget_match_reviewed_at: reviewedAt,
    };
  }

  return {
    budget_id: null,
    budget_match_source: 'excluded',
    budget_match_confidence: 1,
    budget_match_reason: 'Marked as not part of any budget.',
    budget_match_reviewed_at: reviewedAt,
    money_meaning: 'not_counted',
    money_meaning_source: 'confirmed',
    money_meaning_category_budget_id: null,
    money_meaning_reason: 'Marked as outside the budget.',
    money_meaning_reviewed_at: reviewedAt,
  };
}

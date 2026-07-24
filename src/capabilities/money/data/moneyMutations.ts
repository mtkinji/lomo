export type TransactionReviewInput =
  | { type: 'category'; categoryId: string }
  | { type: 'not_counted' };

export type TransactionMeaningReviewInput =
  | { meaning: 'income' | 'transfer' | 'not_counted' }
  | { meaning: 'category_credit'; categoryId: string };

export type TransactionReviewUpdate = {
  budget_id: string | null;
  budget_match_source: 'corrected' | 'excluded';
  budget_match_confidence: 1;
  budget_match_reason: string;
  budget_match_reviewed_at: string;
  money_meaning?: TransactionMeaningReviewInput['meaning'];
  money_meaning_source?: 'confirmed';
  money_meaning_category_budget_id?: string | null;
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

export function buildTransactionMeaningReviewUpdate(
  input: TransactionMeaningReviewInput,
  reviewedAt = new Date().toISOString(),
): TransactionReviewUpdate {
  const reason = getMeaningReason(input.meaning);
  const categoryId = input.meaning === 'category_credit' ? input.categoryId.trim() : null;
  if (input.meaning === 'category_credit' && !categoryId) {
    throw new Error('Choose a category for this credit.');
  }

  return {
    money_meaning: input.meaning,
    money_meaning_source: 'confirmed',
    money_meaning_category_budget_id: categoryId,
    money_meaning_reason: reason,
    money_meaning_reviewed_at: reviewedAt,
    budget_id: categoryId,
    budget_match_source: categoryId ? 'corrected' : 'excluded',
    budget_match_confidence: 1,
    budget_match_reason: reason,
    budget_match_reviewed_at: reviewedAt,
  };
}

function getMeaningReason(meaning: TransactionMeaningReviewInput['meaning']): string {
  if (meaning === 'income') return 'Treated as household income.';
  if (meaning === 'category_credit') return 'Treated as a category credit.';
  if (meaning === 'transfer') return 'Treated as an internal transfer.';
  return 'Marked as outside the budget.';
}

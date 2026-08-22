import type { MoneyTransaction } from '../data/moneySnapshot';

type CoverageTransaction = Pick<MoneyTransaction, 'amountCents' | 'direction' | 'pending' | 'moneyMeaning' | 'reviewState'>;

export function buildTransactionPlanCoverage(input: CoverageTransaction & { savedResourceCents: number }): {
  monthlyPlanCents: number;
  savedResourceCents: number;
} {
  const amountCents = cents(input.amountCents);
  const savedResourceCents = cents(input.savedResourceCents);
  if (input.direction !== 'outflow' || input.pending || input.moneyMeaning === 'transfer'
    || input.moneyMeaning === 'not_counted' || input.reviewState === 'not_counted') {
    throw new Error('Only posted household spending can be covered by saved money.');
  }
  if (savedResourceCents > amountCents) throw new Error('Saved money cannot exceed the purchase amount.');
  return { monthlyPlanCents: amountCents - savedResourceCents, savedResourceCents };
}

export function canEditTransactionPlanCoverage(transaction: CoverageTransaction): boolean {
  try {
    buildTransactionPlanCoverage({ ...transaction, savedResourceCents: 0 });
    return true;
  } catch {
    return false;
  }
}

export function projectTransactionCoverageImpact(input: {
  flexibleRoomCents: number;
  currentSavedResourceCents: number;
  nextSavedResourceCents: number;
  transactionAmountCents: number;
}) {
  const currentSavedResourceCents = cents(input.currentSavedResourceCents);
  const nextSavedResourceCents = cents(input.nextSavedResourceCents);
  return {
    currentFlexibleRoomCents: Math.round(input.flexibleRoomCents),
    nextFlexibleRoomCents: Math.round(input.flexibleRoomCents) + nextSavedResourceCents - currentSavedResourceCents,
    transactionAmountCents: cents(input.transactionAmountCents),
    savedResourceDeltaCents: nextSavedResourceCents - currentSavedResourceCents,
  };
}

function cents(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

export type TransactionAllocationInput = {
  categoryId: string;
  amountCents: number;
};

export type TransactionAllocationPlan = {
  valid: boolean;
  allocations: TransactionAllocationInput[];
  allocatedCents: number;
  remainingCents: number;
  error?: string;
};

export const MAX_TRANSACTION_ALLOCATION_COUNT = 8;

export function parseAllocationAmountCents(value: string): number | null {
  const normalized = value.trim().replace(/^\$/, '').replace(/,/g, '');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
}

export function formatAllocationAmountInput(amountCents: number): string {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0) return '';
  return (amountCents / 100).toFixed(2);
}

export function buildTransactionAllocationPlan({
  transactionAmountCents,
  direction,
  pending,
  allocations,
}: {
  transactionAmountCents: number;
  direction: 'inflow' | 'outflow';
  pending: boolean;
  allocations: TransactionAllocationInput[];
}): TransactionAllocationPlan {
  const normalized = allocations
    .map((allocation) => ({
      categoryId: allocation.categoryId.trim(),
      amountCents: allocation.amountCents,
    }))
    .sort((left, right) => left.categoryId.localeCompare(right.categoryId));
  const allocatedCents = normalized.reduce(
    (sum, allocation) => sum + (Number.isSafeInteger(allocation.amountCents) ? allocation.amountCents : 0),
    0,
  );
  const remainingCents = Number.isSafeInteger(transactionAmountCents)
    ? transactionAmountCents - allocatedCents
    : 0;
  const result = (error?: string): TransactionAllocationPlan => ({
    valid: error == null,
    allocations: normalized,
    allocatedCents,
    remainingCents,
    ...(error ? { error } : {}),
  });

  if (direction !== 'outflow') return result('Only spending transactions can be split.');
  if (pending) return result('Wait until this transaction finishes pending before splitting it.');
  if (!Number.isSafeInteger(transactionAmountCents) || transactionAmountCents <= 0) {
    return result('The transaction amount must be a positive number of cents.');
  }
  if (normalized.length < 2) return result('Choose at least two categories.');
  if (normalized.length > MAX_TRANSACTION_ALLOCATION_COUNT) {
    return result(`Choose no more than ${MAX_TRANSACTION_ALLOCATION_COUNT} categories.`);
  }
  if (normalized.some((allocation) => !allocation.categoryId)) return result('Every allocation needs a category.');
  if (new Set(normalized.map((allocation) => allocation.categoryId)).size !== normalized.length) {
    return result('Each category can appear only once.');
  }
  if (normalized.some((allocation) => !Number.isSafeInteger(allocation.amountCents) || allocation.amountCents <= 0)) {
    return result('Every allocation must be a positive number of cents.');
  }
  if (allocatedCents !== transactionAmountCents) {
    return result(remainingCents > 0
      ? 'The full transaction amount has not been allocated.'
      : 'The allocations exceed the transaction amount.');
  }

  return result();
}

import { MAX_TRANSACTION_ALLOCATION_COUNT } from './transactionAllocation';

export type TransactionSplitMode = 'create' | 'replace';
export type TransactionSplitDurationBucket =
  | 'under_15_seconds'
  | '15_to_59_seconds'
  | '1_to_2_minutes'
  | '3_minutes_or_more';

export type TransactionSplitStartedProps = {
  mode: TransactionSplitMode;
  existing_allocation_count: number;
};

export type TransactionSplitOutcomeProps = {
  mode: TransactionSplitMode;
  allocation_count: number;
  duration_bucket: TransactionSplitDurationBucket;
};

export function buildTransactionSplitStartedProps({
  existingAllocationCount,
  mode,
}: {
  existingAllocationCount: number;
  mode: TransactionSplitMode;
}): TransactionSplitStartedProps {
  return {
    mode,
    existing_allocation_count: normalizeAllocationCount(existingAllocationCount),
  };
}

export function buildTransactionSplitOutcomeProps({
  allocationCount,
  durationMs,
  mode,
}: {
  allocationCount: number;
  durationMs: number;
  mode: TransactionSplitMode;
}): TransactionSplitOutcomeProps {
  return {
    mode,
    allocation_count: normalizeAllocationCount(allocationCount),
    duration_bucket: getTransactionSplitDurationBucket(durationMs),
  };
}

function getTransactionSplitDurationBucket(durationMs: number): TransactionSplitDurationBucket {
  const boundedDurationMs = Number.isFinite(durationMs) ? Math.max(0, durationMs) : 0;
  if (boundedDurationMs < 15_000) return 'under_15_seconds';
  if (boundedDurationMs < 60_000) return '15_to_59_seconds';
  if (boundedDurationMs < 180_000) return '1_to_2_minutes';
  return '3_minutes_or_more';
}

function normalizeAllocationCount(count: number): number {
  if (!Number.isFinite(count)) return 0;
  return Math.min(MAX_TRANSACTION_ALLOCATION_COUNT, Math.max(0, Math.trunc(count)));
}

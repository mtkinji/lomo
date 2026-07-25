import {
  buildTransactionSplitOutcomeProps,
  buildTransactionSplitStartedProps,
} from './transactionTruthTelemetry';

describe('transaction truth telemetry', () => {
  it('allows only bounded non-financial metadata when a split editor opens', () => {
    expect(buildTransactionSplitStartedProps({
      mode: 'replace',
      existingAllocationCount: 2,
    })).toEqual({
      mode: 'replace',
      existing_allocation_count: 2,
    });
  });

  it('allows only mode, bounded counts, and a coarse duration on outcomes', () => {
    const props = buildTransactionSplitOutcomeProps({
      mode: 'create',
      allocationCount: 3,
      durationMs: 61_000,
    });

    expect(props).toEqual({
      mode: 'create',
      allocation_count: 3,
      duration_bucket: '1_to_2_minutes',
    });
    expect(Object.keys(props).sort()).toEqual([
      'allocation_count',
      'duration_bucket',
      'mode',
    ]);
  });

  it.each([
    [-1, 'under_15_seconds'],
    [14_999, 'under_15_seconds'],
    [15_000, '15_to_59_seconds'],
    [59_999, '15_to_59_seconds'],
    [60_000, '1_to_2_minutes'],
    [179_999, '1_to_2_minutes'],
    [180_000, '3_minutes_or_more'],
  ] as const)('buckets %i milliseconds without sending a raw timestamp', (durationMs, expected) => {
    expect(buildTransactionSplitOutcomeProps({
      mode: 'create',
      allocationCount: 2,
      durationMs,
    }).duration_bucket).toBe(expected);
  });

  it('clamps allocation counts to the supported split range', () => {
    expect(buildTransactionSplitStartedProps({
      mode: 'create',
      existingAllocationCount: -2,
    }).existing_allocation_count).toBe(0);
    expect(buildTransactionSplitOutcomeProps({
      mode: 'replace',
      allocationCount: 99,
      durationMs: 0,
    }).allocation_count).toBe(8);
  });
});

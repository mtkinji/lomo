import { buildMoneyMutationProps, captureMoneyMutation, getMoneyMutationDurationBucket } from './moneyMutationTelemetry';

describe('money mutation telemetry', () => {
  it.each([
    [0, 'under_250ms'],
    [249, 'under_250ms'],
    [250, '250_to_749ms'],
    [749, '250_to_749ms'],
    [750, '750ms_to_1999ms'],
    [1_999, '750ms_to_1999ms'],
    [2_000, '2s_or_more'],
  ] as const)('buckets %i milliseconds', (durationMs, expected) => {
    expect(getMoneyMutationDurationBucket(durationMs)).toBe(expected);
  });

  it('emits only a bounded operation, outcome, and coarse duration', () => {
    const props = buildMoneyMutationProps({
      operation: 'transaction_category',
      outcome: 'succeeded',
      durationMs: 813,
    });

    expect(props).toEqual({
      operation: 'transaction_category',
      outcome: 'succeeded',
      duration_bucket: '750ms_to_1999ms',
    });
    expect(Object.keys(props).sort()).toEqual(['duration_bucket', 'operation', 'outcome']);
  });
  it('does not report an unknown save as a trusted completed decision', () => {
    const capture = jest.fn();
    captureMoneyMutation(capture, { operation: 'category_settings', outcome: 'unknown', durationMs: 2200 });
    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture).toHaveBeenCalledWith('money_mutation_completed', {
      operation: 'category_settings', outcome: 'unknown', duration_bucket: '2s_or_more',
    });
  });

});

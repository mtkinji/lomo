import { AnalyticsEvent } from '../../../services/analytics/events';
import {
  captureTransactionSplitOutcome,
  captureTransactionSplitStarted,
  type TransactionTruthCapture,
} from './transactionTruthAnalytics';

describe('transaction truth analytics adapter', () => {
  const capture = jest.fn() as jest.MockedFunction<TransactionTruthCapture>;

  beforeEach(() => {
    capture.mockReset();
  });

  it('emits only the allowlisted start metadata', () => {
    captureTransactionSplitStarted(capture, {
      mode: 'replace',
      existingAllocationCount: 2,
    });

    expect(capture).toHaveBeenCalledWith(AnalyticsEvent.MoneyTransactionSplitStarted, {
      mode: 'replace',
      existing_allocation_count: 2,
    });
  });

  it.each([
    ['saved', AnalyticsEvent.MoneyTransactionSplitSaved],
    ['save_failed', AnalyticsEvent.MoneyTransactionSplitSaveFailed],
    ['abandoned', AnalyticsEvent.MoneyTransactionSplitAbandoned],
  ] as const)('maps %s to its event with only coarse outcome metadata', (outcome, event) => {
    captureTransactionSplitOutcome(capture, outcome, {
      mode: 'create',
      allocationCount: 2,
      durationMs: 16_000,
    });

    expect(capture).toHaveBeenCalledWith(event, {
      mode: 'create',
      allocation_count: 2,
      duration_bucket: '15_to_59_seconds',
    });
  });
});

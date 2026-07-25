import type { AnalyticsProps } from '../../../services/analytics/analytics';
import { AnalyticsEvent, type AnalyticsEventName } from '../../../services/analytics/events';
import {
  buildTransactionSplitOutcomeProps,
  buildTransactionSplitStartedProps,
  type TransactionSplitMode,
} from '../domain/transactionTruthTelemetry';

export type TransactionTruthCapture = (
  event: AnalyticsEventName,
  props?: AnalyticsProps,
) => void;

export type TransactionSplitOutcome = 'saved' | 'save_failed' | 'abandoned';

export function captureTransactionSplitStarted(
  capture: TransactionTruthCapture,
  input: {
    mode: TransactionSplitMode;
    existingAllocationCount: number;
  },
): void {
  capture(AnalyticsEvent.MoneyTransactionSplitStarted, buildTransactionSplitStartedProps(input));
}

export function captureTransactionSplitOutcome(
  capture: TransactionTruthCapture,
  outcome: TransactionSplitOutcome,
  input: {
    mode: TransactionSplitMode;
    allocationCount: number;
    durationMs: number;
  },
): void {
  const event = {
    saved: AnalyticsEvent.MoneyTransactionSplitSaved,
    save_failed: AnalyticsEvent.MoneyTransactionSplitSaveFailed,
    abandoned: AnalyticsEvent.MoneyTransactionSplitAbandoned,
  }[outcome];
  capture(event, buildTransactionSplitOutcomeProps(input));
}

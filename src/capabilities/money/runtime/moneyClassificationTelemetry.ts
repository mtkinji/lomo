import type { AnalyticsProps } from '../../../services/analytics/analytics';
import { AnalyticsEvent, type AnalyticsEventName } from '../../../services/analytics/events';
import type { MoneyClassificationReceipt } from '../data/moneyRepository';
import type { ConnectedMoneyActivityTrigger } from './reconcileConnectedMoneyActivity';

type ClassificationCapture = (event: AnalyticsEventName, props?: AnalyticsProps) => void;

type MoneyClassificationTelemetryInput = {
  trigger: ConnectedMoneyActivityTrigger;
  outcome: 'succeeded' | 'failed';
  receipt?: MoneyClassificationReceipt;
};

export function buildMoneyClassificationProps(input: MoneyClassificationTelemetryInput): AnalyticsProps {
  if (input.outcome === 'failed' || !input.receipt) {
    return { trigger: input.trigger, outcome: 'failed' };
  }
  return {
    trigger: input.trigger,
    outcome: input.outcome,
    policy_version: input.receipt.policyVersion,
    considered_count: input.receipt.consideredCount,
    assigned_count: input.receipt.assignedCount,
    deterministic_assigned_count: input.receipt.deterministicAssignedCount,
    ai_assigned_count: input.receipt.aiAssignedCount,
    unresolved_count: input.receipt.unresolvedCount,
    retryable_count: input.receipt.retryableCount,
  };
}

export function captureMoneyClassification(
  capture: ClassificationCapture,
  input: MoneyClassificationTelemetryInput,
): void {
  capture(AnalyticsEvent.MoneyTransactionClassificationCompleted, buildMoneyClassificationProps(input));
}

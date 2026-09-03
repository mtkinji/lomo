import type { AnalyticsProps } from '../../../services/analytics/analytics';
import { AnalyticsEvent, type AnalyticsEventName } from '../../../services/analytics/events';

export type MoneyMutationOperation = 'transaction_category' | 'transaction_meaning' | 'transaction_plan_role' | 'category_settings';
export type MoneyMutationOutcome = 'succeeded' | 'failed';
export type MoneyMutationDurationBucket = 'under_250ms' | '250_to_749ms' | '750ms_to_1999ms' | '2s_or_more';

type MoneyMutationCapture = (event: AnalyticsEventName, props?: AnalyticsProps) => void;

export function getMoneyMutationDurationBucket(durationMs: number): MoneyMutationDurationBucket {
  if (durationMs < 250) return 'under_250ms';
  if (durationMs < 750) return '250_to_749ms';
  if (durationMs < 2_000) return '750ms_to_1999ms';
  return '2s_or_more';
}

export function buildMoneyMutationProps(input: {
  operation: MoneyMutationOperation;
  outcome: MoneyMutationOutcome;
  durationMs: number;
}): AnalyticsProps {
  return {
    operation: input.operation,
    outcome: input.outcome,
    duration_bucket: getMoneyMutationDurationBucket(Math.max(0, input.durationMs)),
  };
}

export function captureMoneyMutation(
  capture: MoneyMutationCapture,
  input: { operation: MoneyMutationOperation; outcome: MoneyMutationOutcome; durationMs: number },
): void {
  const props = buildMoneyMutationProps(input);
  capture(AnalyticsEvent.MoneyMutationCompleted, props);
  if (input.outcome === 'succeeded') {
    // "First" is calculated as the person's first occurrence in PostHog. The
    // client emits every authoritative successful decision so no local ledger
    // can drift across devices or reinstalls.
    capture(AnalyticsEvent.MoneyTrustedDecisionCompleted, {
      operation: input.operation,
      outcome: 'completed',
    });
  }
  if (__DEV__) console.info('[money mutation]', props);
}

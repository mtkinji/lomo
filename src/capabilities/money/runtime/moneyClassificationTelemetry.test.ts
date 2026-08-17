import { AnalyticsEvent } from '../../../services/analytics/events';
import { buildMoneyClassificationProps, captureMoneyClassification } from './moneyClassificationTelemetry';

const receipt = {
  policyVersion: 'money-category-v2',
  consideredCount: 4,
  assignedCount: 2,
  deterministicAssignedCount: 1,
  aiAssignedCount: 1,
  unresolvedCount: 1,
  retryableCount: 1,
};

describe('money classification telemetry', () => {
  it('emits only trigger, outcome, policy, and aggregate counts', () => {
    expect(buildMoneyClassificationProps({ trigger: 'manual_sync', outcome: 'succeeded', receipt })).toEqual({
      trigger: 'manual_sync',
      outcome: 'succeeded',
      policy_version: 'money-category-v2',
      considered_count: 4,
      assigned_count: 2,
      deterministic_assigned_count: 1,
      ai_assigned_count: 1,
      unresolved_count: 1,
      retryable_count: 1,
    });
  });

  it('does not attach error or transaction details to a failed run', () => {
    const capture = jest.fn();
    captureMoneyClassification(capture, { trigger: 'account_connected', outcome: 'failed' });
    expect(capture).toHaveBeenCalledWith(AnalyticsEvent.MoneyTransactionClassificationCompleted, {
      trigger: 'account_connected',
      outcome: 'failed',
    });
  });
});

import { decideLivingPlanActivation } from './living-plan-promotion';

describe('decideLivingPlanActivation', () => {
  it('activates the first supported plan immediately', () => {
    expect(decideLivingPlanActivation({
      trigger: 'initial_sync',
      candidatePeriodId: '2026-07',
      activePeriodId: null,
    })).toEqual({ action: 'promote_now', reason: 'initial_supported_plan' });
  });

  it.each(['target_changed', 'planning_basis_changed', 'override_changed', 'category_changed'] as const)(
    'activates explicit %s changes immediately',
    (trigger) => {
      expect(decideLivingPlanActivation({
        trigger,
        candidatePeriodId: '2026-07',
        activePeriodId: '2026-07',
      })).toEqual({ action: 'promote_now', reason: 'explicit_user_save' });
    },
  );

  it('holds ordinary sync and account-scope evidence for the next month', () => {
    expect(decideLivingPlanActivation({
      trigger: 'account_scope_changed',
      candidatePeriodId: '2026-07',
      activePeriodId: '2026-07',
    })).toEqual({ action: 'hold_for_period', activationPeriodId: '2026-08', reason: 'automatic_monthly_maintenance' });
    expect(decideLivingPlanActivation({
      trigger: 'sync_evidence_changed',
      candidatePeriodId: '2026-07',
      activePeriodId: '2026-07',
    })).toEqual({ action: 'hold_for_period', activationPeriodId: '2026-08', reason: 'automatic_monthly_maintenance' });
  });

  it('promotes an explicit transaction review immediately', () => {
    expect(decideLivingPlanActivation({
      trigger: 'transaction_review_changed',
      candidatePeriodId: '2026-08',
      activePeriodId: '2026-08',
    })).toEqual({ action: 'promote_now', reason: 'explicit_user_save' });
  });

  it('promotes automatic maintenance at the period boundary', () => {
    expect(decideLivingPlanActivation({
      trigger: 'period_rollover',
      candidatePeriodId: '2026-08',
      activePeriodId: '2026-07',
    })).toEqual({ action: 'promote_now', reason: 'period_boundary' });
  });

  it('replaces an active plan that is ahead of the customer local month', () => {
    expect(decideLivingPlanActivation({
      trigger: 'sync_evidence_changed',
      candidatePeriodId: '2026-07',
      activePeriodId: '2026-08',
    })).toEqual({ action: 'promote_now', reason: 'future_period_recovery' });
  });
});

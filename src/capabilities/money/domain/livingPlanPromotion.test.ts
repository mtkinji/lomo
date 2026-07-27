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

  it('promotes automatic maintenance at the period boundary', () => {
    expect(decideLivingPlanActivation({
      trigger: 'period_rollover',
      candidatePeriodId: '2026-08',
      activePeriodId: '2026-07',
    })).toEqual({ action: 'promote_now', reason: 'period_boundary' });
  });
});

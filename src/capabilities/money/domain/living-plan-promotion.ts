import type { LivingPlanTrigger } from './living-plan-changes';

export type LivingPlanActivationDecision =
  | { action: 'promote_now'; reason: 'initial_supported_plan' | 'explicit_user_save' | 'period_boundary' }
  | { action: 'hold_for_period'; activationPeriodId: string; reason: 'automatic_monthly_maintenance' };

export function decideLivingPlanActivation(input: {
  trigger: LivingPlanTrigger;
  candidatePeriodId: string;
  activePeriodId: string | null;
}): LivingPlanActivationDecision {
  if (!input.activePeriodId) return { action: 'promote_now', reason: 'initial_supported_plan' };
  if (
    input.trigger === 'target_changed'
    || input.trigger === 'planning_basis_changed'
    || input.trigger === 'override_changed'
    || input.trigger === 'category_changed'
  ) {
    return { action: 'promote_now', reason: 'explicit_user_save' };
  }
  if (input.trigger === 'period_rollover' || input.candidatePeriodId > input.activePeriodId) {
    return { action: 'promote_now', reason: 'period_boundary' };
  }
  return {
    action: 'hold_for_period',
    activationPeriodId: nextPeriodId(input.candidatePeriodId),
    reason: 'automatic_monthly_maintenance',
  };
}

function nextPeriodId(periodId: string): string {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(periodId);
  if (!match) throw new Error('A valid candidate period is required.');
  const year = Number(match[1]);
  const month = Number(match[2]);
  return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;
}

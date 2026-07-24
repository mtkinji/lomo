import type { LivingTargetIntent } from './living-target';

export type MoneyOnboardingEvidence = {
  localCompletedAt: string | null;
  hasLivingTarget: boolean;
  hasActiveLivingPlan: boolean;
  hasLinkedAccount: boolean;
};

export type MoneyOnboardingReconciliationResult = {
  outcome: 'promoted' | 'no_op' | 'blocked' | 'disabled' | 'not_ready';
  reason?: string;
  hasUsablePlan?: boolean;
};

export function shouldOfferMoneyOnboarding(evidence: MoneyOnboardingEvidence): boolean {
  if (evidence.localCompletedAt) return false;
  if (evidence.hasActiveLivingPlan) return false;
  if (evidence.hasLivingTarget && evidence.hasLinkedAccount) return false;
  return true;
}

export function buildMoneyOnboardingTarget(value: number, updatedAtIso: string): LivingTargetIntent {
  const finiteValue = Number.isFinite(value) ? value : 70;
  return {
    livingPercent: Math.max(50, Math.min(100, Math.round(finiteValue / 5) * 5)),
    provenance: 'onboarding',
    updatedAtIso,
  };
}

export function getMoneyOnboardingCompletionDecision(
  result: MoneyOnboardingReconciliationResult,
  skippedAccountConnection: boolean,
): { complete: boolean; message?: string } {
  if (result.outcome === 'promoted' || result.outcome === 'no_op') return { complete: true };
  if (skippedAccountConnection && result.hasUsablePlan) return { complete: true };
  if (result.outcome === 'disabled') {
    return { complete: false, message: 'Automatic plan setup is temporarily unavailable. Try again.' };
  }
  if (result.reason === 'blocked' || result.reason === 'sync_stale') {
    return { complete: false, message: 'Refresh your connected account, then build your plan again.' };
  }
  return {
    complete: false,
    message: skippedAccountConnection
      ? 'Connect an account before finishing so Kwilt can build a plan from real income and spending.'
      : 'Finish connecting and syncing an account, then build your plan again.',
  };
}

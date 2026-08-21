import type { LivingTargetIntent } from './living-target';

export type MoneyPlaceRouteName = 'MoneySummary' | 'MoneyTransactions' | 'MoneyAccounts';
export type MoneyEntryMode = 'automatic' | 'setup';
export type MoneyEntrySource = 'capability-onboarding' | 'capability-menu' | 'empty-state' | 'direct';
export type MoneyTransactionsAvailability = 'unknown' | 'pristine' | 'available';
export type MoneyOnboardingCheckpoint = 'account' | 'coverage' | 'analyze' | 'intent' | 'target' | 'assessment';
export type MoneyOnboardingStep = 'welcome' | MoneyOnboardingCheckpoint | 'complete';

export type MoneyOnboardingEvidence = {
  localCompletedAt: string | null;
  hasLivingTarget: boolean;
  hasActiveLivingPlan: boolean;
  hasLinkedAccount: boolean;
};

export type MoneyOnboardingReconciliationResult = {
  outcome: 'promoted' | 'no_op' | 'held' | 'blocked' | 'disabled' | 'not_ready';
  reason?: string;
  hasUsablePlan?: boolean;
};

export function shouldOfferMoneyOnboarding(evidence: MoneyOnboardingEvidence): boolean {
  if (evidence.localCompletedAt) return false;
  if (evidence.hasActiveLivingPlan) return false;
  if (evidence.hasLivingTarget && evidence.hasLinkedAccount) return false;
  return true;
}

export function getMoneyEntryDecision(input: {
  evidence: MoneyOnboardingEvidence;
  introductionSeenAt: string | null;
  checkpoint?: MoneyOnboardingCheckpoint | null;
  requestedPlace: MoneyPlaceRouteName;
  mode: MoneyEntryMode;
}): {
  kind: 'introduce' | 'destination';
  requestedPlace: MoneyPlaceRouteName;
} {
  const shouldIntroduce = input.mode === 'setup' || (
    shouldOfferMoneyOnboarding(input.evidence)
      && (!input.introductionSeenAt || Boolean(input.checkpoint))
  );
  return {
    kind: shouldIntroduce ? 'introduce' : 'destination',
    requestedPlace: input.requestedPlace,
  };
}

export function getMoneyOnboardingInitialStep(
  source: MoneyEntrySource,
  checkpoint: MoneyOnboardingCheckpoint | null | undefined,
): Exclude<MoneyOnboardingStep, 'complete'> {
  if (checkpoint) return checkpoint;
  return source === 'capability-onboarding' || source === 'empty-state' ? 'account' : 'welcome';
}

export function getMoneyTransactionsAvailability(
  evidence: { accountCount: number; transactionCount: number } | null,
): MoneyTransactionsAvailability {
  if (!evidence) return 'unknown';
  return evidence.accountCount > 0 || evidence.transactionCount > 0 ? 'available' : 'pristine';
}

export function mergeMoneyTransactionsAvailability(
  current: MoneyTransactionsAvailability,
  next: MoneyTransactionsAvailability,
): MoneyTransactionsAvailability {
  if (current === 'available') return 'available';
  if (next === 'available') return 'available';
  if (next === 'pristine') return 'pristine';
  return current;
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
    return { complete: false, message: 'Money plan setup is temporarily unavailable. Try again.' };
  }
  if (result.reason === 'blocked' || result.reason === 'sync_stale') {
    return { complete: false, message: 'Refresh your connected account, then build your plan again.' };
  }
  if (result.outcome === 'held') {
    return { complete: false, message: 'Review and save the first Money plan before finishing setup.' };
  }
  return {
    complete: false,
    message: skippedAccountConnection
      ? 'Connect an account before finishing so Kwilt can build a plan from real income and spending.'
      : 'Finish connecting and syncing an account, then build your plan again.',
  };
}

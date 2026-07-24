import type { PlanningIncomeReceipt } from './planning-income';

export type LivingPlanCategoryInput = {
  categoryId: string;
  fixedCents?: number;
  overrideCents?: number;
  supportedFlexibleCents?: number;
  exposureCents?: number;
};

export type LivingPlanAllocation = {
  categoryId: string;
  amountCents: number;
  fixedCents: number;
  overrideCents: number;
  flexibleCents: number;
  exposureCents: number;
  source: 'fixed' | 'user_override' | 'recent_spending' | 'current_exposure';
};

export type LivingPlanCandidateInput = {
  periodId: string;
  livingPercent: number;
  allocatorVersion: string;
  evidenceHash: string;
  syncFresh: boolean;
  resourceReceipts: PlanningIncomeReceipt[];
  categories: LivingPlanCategoryInput[];
  priorResourceBasisCents?: number;
};

export type LivingPlanCandidate = {
  periodId: string;
  livingPercent: number;
  allocatorVersion: string;
  evidenceHash: string;
  candidateHash: string;
  status: 'ready' | 'over_target' | 'blocked' | 'missing_resource';
  resourceBasisCents: number;
  targetCents: number;
  plannedCents: number;
  unassignedCents: number;
  overTargetCents: number;
  allocations: LivingPlanAllocation[];
};

export type OnboardingReconciliationResult = {
  outcome: 'promoted' | 'no_op' | 'blocked' | 'disabled' | 'not_ready';
  reason?: string;
  hasUsablePlan?: boolean;
};

export type OnboardingCompletionDecision = {
  complete: boolean;
  message?: string;
};

export function getOnboardingCompletionDecision(
  result: OnboardingReconciliationResult,
  skippedAccountConnection: boolean,
): OnboardingCompletionDecision {
  if (result.outcome === 'promoted' || result.outcome === 'no_op') return { complete: true };
  if (skippedAccountConnection && result.hasUsablePlan) return { complete: true };
  if (result.outcome === 'disabled') {
    return { complete: false, message: 'Budget setup is temporarily unavailable. Try again.' };
  }
  if (result.reason === 'blocked' || result.reason === 'sync_stale') {
    return { complete: false, message: 'Refresh your connected account, then build your budgets again.' };
  }
  return {
    complete: false,
    message: skippedAccountConnection
      ? 'Connect an account before finishing so Kwilt can build budgets from real income and spending.'
      : 'Finish connecting and syncing an account, then build your budgets again.',
  };
}

export function projectLivingPlanCandidate(input: LivingPlanCandidateInput): LivingPlanCandidate {
  const eligibleResource = input.resourceReceipts
    .filter((receipt) => receipt.eligibleForPlanning && receipt.confidence === 'high')
    .reduce((sum, receipt) => sum + nonnegative(receipt.expectedMonthlyCents), 0);
  const resourceBasisCents = input.syncFresh ? eligibleResource : nonnegative(input.priorResourceBasisCents ?? eligibleResource);
  const targetCents = Math.round(resourceBasisCents * clamp(input.livingPercent, 0, 100) / 100);
  let remainingCents = targetCents;
  const allocations: LivingPlanAllocation[] = [];

  for (const category of stableCategories(input.categories)) {
    const fixedCents = nonnegative(category.fixedCents ?? 0);
    const overrideCents = nonnegative(category.overrideCents ?? 0);
    const hardCents = Math.max(fixedCents, overrideCents);
    remainingCents -= hardCents;
    allocations.push({
      categoryId: category.categoryId,
      amountCents: hardCents,
      fixedCents,
      overrideCents,
      flexibleCents: 0,
      exposureCents: nonnegative(category.exposureCents ?? 0),
      source: overrideCents > 0 ? 'user_override' : fixedCents > 0 ? 'fixed' : 'recent_spending',
    });
  }

  for (const allocation of allocations) {
    const category = input.categories.find((row) => row.categoryId === allocation.categoryId);
    if (!category || allocation.fixedCents > 0 || allocation.overrideCents > 0) continue;
    const flexibleCents = Math.min(nonnegative(category.supportedFlexibleCents ?? 0), Math.max(0, remainingCents));
    allocation.flexibleCents = flexibleCents;
    allocation.amountCents = flexibleCents;
    allocation.source = flexibleCents > 0 ? 'recent_spending' : 'current_exposure';
    remainingCents -= flexibleCents;
  }

  const plannedCents = allocations.reduce((sum, row) => sum + row.amountCents, 0);
  const overTargetCents = Math.max(0, plannedCents - targetCents);
  const unassignedCents = Math.max(0, targetCents - plannedCents);
  const status: LivingPlanCandidate['status'] = !input.syncFresh
    ? 'blocked'
    : resourceBasisCents <= 0
      ? 'missing_resource'
      : overTargetCents > 0
        ? 'over_target'
        : 'ready';
  const facts = { periodId: input.periodId, livingPercent: input.livingPercent, allocatorVersion: input.allocatorVersion, evidenceHash: input.evidenceHash, status, resourceBasisCents, targetCents, plannedCents, unassignedCents, overTargetCents, allocations };
  return { ...facts, candidateHash: stableHash(facts) };
}

function stableCategories(categories: LivingPlanCategoryInput[]): LivingPlanCategoryInput[] {
  return [...categories].sort((a, b) => a.categoryId.localeCompare(b.categoryId));
}

function nonnegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function stableHash(value: unknown): string {
  const source = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `lp-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

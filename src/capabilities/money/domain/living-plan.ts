import type { PlanningIncomeReceipt } from './planning-income';
import type { CategoryExpectedNeed, CategoryFundingRhythm } from './categoryFunding';

export type LivingPlanCategoryInput = {
  categoryId: string;
  fixedCents?: number;
  overrideCents?: number;
  supportedFlexibleCents?: number;
  exposureCents?: number;
  starterWeight?: number;
  fundingRhythm?: CategoryFundingRhythm;
  priorReserveCents?: number;
  expectedNeed?: CategoryExpectedNeed | null;
};

export type LivingPlanAllocation = {
  categoryId: string;
  amountCents: number;
  fixedCents: number;
  overrideCents: number;
  flexibleCents: number;
  exposureCents: number;
  source: 'fixed' | 'user_override' | 'starter_weight' | 'recent_spending' | 'blended_evidence' | 'current_exposure';
  fundingRhythm: CategoryFundingRhythm;
  priorReserveCents: number;
  expectedNeed: CategoryExpectedNeed | null;
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
  evidenceConfidence?: number;
  userResourceBasisCents?: number;
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
  const governedResource = input.userResourceBasisCents == null
    ? eligibleResource
    : nonnegative(input.userResourceBasisCents);
  const resourceBasisCents = input.syncFresh
    ? governedResource
    : nonnegative(input.priorResourceBasisCents ?? governedResource);
  const targetCents = Math.round(resourceBasisCents * clamp(input.livingPercent, 0, 100) / 100);
  let remainingCents = targetCents;
  const allocations: LivingPlanAllocation[] = [];
  const categories = stableCategories(input.categories);

  for (const category of categories) {
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
      fundingRhythm: category.fundingRhythm ?? 'monthly',
      priorReserveCents: nonnegative(category.priorReserveCents ?? 0),
      expectedNeed: category.expectedNeed ?? null,
    });
  }

  const eligibleCategories = categories.filter((category) => (
    nonnegative(category.fixedCents ?? 0) === 0
    && nonnegative(category.overrideCents ?? 0) === 0
  ));
  const flexibleAllocations = allocateFlexibleCapacity(
    eligibleCategories,
    Math.max(0, remainingCents),
    clamp(input.evidenceConfidence ?? 1, 0, 1),
  );
  for (const allocation of allocations) {
    if (allocation.fixedCents > 0 || allocation.overrideCents > 0) continue;
    const flexibleCents = flexibleAllocations.get(allocation.categoryId) ?? 0;
    allocation.flexibleCents = flexibleCents;
    allocation.amountCents = flexibleCents;
    allocation.source = flexibleAllocationSource(
      categories.find((category) => category.categoryId === allocation.categoryId)!,
      clamp(input.evidenceConfidence ?? 1, 0, 1),
      flexibleCents,
    );
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

function flexibleAllocationSource(
  category: LivingPlanCategoryInput,
  evidenceConfidence: number,
  amountCents: number,
): LivingPlanAllocation['source'] {
  if (amountCents <= 0) return 'current_exposure';
  const hasSpendingEvidence = nonnegative(category.supportedFlexibleCents ?? 0) > 0;
  const hasStarterWeight = nonnegativeWeight(category.starterWeight ?? 0) > 0;
  if (hasSpendingEvidence && hasStarterWeight && evidenceConfidence > 0 && evidenceConfidence < 1) {
    return 'blended_evidence';
  }
  if (hasSpendingEvidence && (evidenceConfidence > 0 || !hasStarterWeight)) return 'recent_spending';
  if (hasStarterWeight) return 'starter_weight';
  return 'current_exposure';
}

function allocateFlexibleCapacity(
  categories: LivingPlanCategoryInput[],
  capacityCents: number,
  evidenceConfidence: number,
): Map<string, number> {
  const result = new Map<string, number>();
  if (categories.length === 0 || capacityCents <= 0) {
    categories.forEach((category) => result.set(category.categoryId, 0));
    return result;
  }
  const observedTotal = categories.reduce(
    (sum, category) => sum + nonnegative(category.supportedFlexibleCents ?? 0),
    0,
  );
  const starterTotal = categories.reduce(
    (sum, category) => sum + nonnegativeWeight(category.starterWeight ?? 0),
    0,
  );
  const rawWeights = categories.map((category) => {
    const observedShare = observedTotal > 0
      ? nonnegative(category.supportedFlexibleCents ?? 0) / observedTotal
      : 0;
    const starterShare = starterTotal > 0
      ? nonnegativeWeight(category.starterWeight ?? 0) / starterTotal
      : 0;
    return evidenceConfidence * observedShare + (1 - evidenceConfidence) * starterShare;
  });
  const rawTotal = rawWeights.reduce((sum, weight) => sum + weight, 0);
  const normalizedWeights = rawTotal > 0
    ? rawWeights.map((weight) => weight / rawTotal)
    : categories.map(() => 1 / categories.length);
  const shares = categories.map((category, index) => {
    const exact = capacityCents * normalizedWeights[index];
    return { categoryId: category.categoryId, amountCents: Math.floor(exact), fraction: exact - Math.floor(exact) };
  });
  let remainder = capacityCents - shares.reduce((sum, share) => sum + share.amountCents, 0);
  [...shares]
    .sort((left, right) => right.fraction - left.fraction || left.categoryId.localeCompare(right.categoryId))
    .forEach((share) => {
      if (remainder <= 0) return;
      share.amountCents += 1;
      remainder -= 1;
    });
  shares.forEach((share) => result.set(share.categoryId, share.amountCents));
  return result;
}

function stableCategories(categories: LivingPlanCategoryInput[]): LivingPlanCategoryInput[] {
  return [...categories].sort((a, b) => a.categoryId.localeCompare(b.categoryId));
}

function nonnegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function nonnegativeWeight(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
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

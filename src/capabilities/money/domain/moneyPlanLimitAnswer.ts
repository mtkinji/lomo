import type { MoneyPlanLimitEvidence } from '../data/moneyPlanLimitEvidence';
import type { ActiveLivingPlan } from '../data/livingPlanRepository';
import type { MoneyEconomicRoleReconciliation } from './moneyEconomicRole';

export const MONEY_PLAN_LIMIT_POLICY_VERSION = 'money-plan-limit-v1';

export type MoneyPlanLimitAnswerState =
  | 'supported'
  | 'estimated'
  | 'no_flexible_room'
  | 'over_limit'
  | 'over_flexible_room'
  | 'unassigned'
  | 'stale'
  | 'needs_one_answer'
  | 'insufficient_meaning'
  | 'missing_income_basis';

export type MoneyPlanLimitFacts = {
  periodId: string;
  planVersionId: string;
  policyVersion: typeof MONEY_PLAN_LIMIT_POLICY_VERSION;
  resourceBasisCents: number | null;
  resourceBasisKind: MoneyPlanLimitEvidence['resourceBasisKind'];
  resourceBasisUpdatedAtIso: string | null;
  livingPercent: number;
  livingLimitCents: number | null;
  protectedPlanCents: number | null;
  flexibleCapacityCents: number | null;
  countedFlexibleSpendCents: number | null;
  flexibleRoomCents: number | null;
  flexibleRoomLowCents: number | null;
  flexibleRoomHighCents: number | null;
  unresolvedInScopeCents: number;
  plannedCents: number;
  unassignedCents: number;
  overLimitCents: number;
  freshness: 'fresh' | 'stale';
  confidence: 'supported' | 'qualified';
  qualificationReason: 'unresolved_spending' | 'missing_provenance' | 'stale_evidence' | 'invalid_reconciliation' | null;
};

export type MoneyPlanLimitAnswer = {
  state: MoneyPlanLimitAnswerState;
  facts: MoneyPlanLimitFacts;
  headlineAmountCents: number | null;
  limitLine: { livingPercent: number; livingLimitCents: number } | null;
  qualification: MoneyPlanLimitFacts['qualificationReason'];
  recoveryAction: 'refresh' | 'review_income' | 'review_meaning' | null;
  reviewTransactionIds: string[];
};

export function projectMoneyPlanCapacity(input: {
  livingLimitCents: number;
  allocations: Array<{ amountCents: number; fixedCents: number; overrideCents: number }>;
}): { protectedPlanCents: number; flexibleCapacityCents: number } {
  const protectedPlanCents = input.allocations
    .filter((allocation) => allocation.fixedCents > 0 || allocation.overrideCents > 0)
    .reduce((sum, allocation) => sum + validCents(allocation.amountCents), 0);
  return {
    protectedPlanCents,
    flexibleCapacityCents: Math.max(0, validCents(input.livingLimitCents) - protectedPlanCents),
  };
}

export function projectMoneyPlanLimitAnswer(input: {
  active: ActiveLivingPlan;
  evidence: MoneyPlanLimitEvidence;
  reconciliation: MoneyEconomicRoleReconciliation;
  freshness: 'fresh' | 'stale';
}): MoneyPlanLimitAnswer {
  const { active, evidence, reconciliation, freshness } = input;
  const hasIncomeBasis = active.resourceBasisCents > 0 && evidence.resourceBasisKind !== 'unknown';
  const livingLimitCents = hasIncomeBasis ? active.targetCents : null;
  const capacity = livingLimitCents == null
    ? null
    : projectMoneyPlanCapacity({ livingLimitCents, allocations: active.allocations });
  const protectedPlanCents = capacity?.protectedPlanCents ?? null;
  const flexibleCapacityCents = capacity?.flexibleCapacityCents ?? null;
  const countedFlexibleSpendCents = hasIncomeBasis
    ? reconciliation.totals.flexibleSpendingCents
    : null;
  const flexibleRoomHighCents = flexibleCapacityCents == null || countedFlexibleSpendCents == null
    ? null
    : flexibleCapacityCents - countedFlexibleSpendCents;
  const flexibleRoomLowCents = flexibleRoomHighCents == null
    ? null
    : flexibleRoomHighCents - reconciliation.totals.unresolvedInScopeCents;
  const exact = reconciliation.totals.unresolvedInScopeCents === 0;
  const confidence: MoneyPlanLimitFacts['confidence'] = exact && reconciliation.invariant.valid
    ? 'supported'
    : 'qualified';
  const qualificationReason: MoneyPlanLimitFacts['qualificationReason'] = !reconciliation.invariant.valid
    ? 'invalid_reconciliation'
    : !hasIncomeBasis
      ? 'missing_provenance'
      : freshness === 'stale'
        ? 'stale_evidence'
        : exact
          ? null
          : 'unresolved_spending';
  const facts: MoneyPlanLimitFacts = {
    periodId: active.periodId,
    planVersionId: active.versionId,
    policyVersion: MONEY_PLAN_LIMIT_POLICY_VERSION,
    resourceBasisCents: hasIncomeBasis ? active.resourceBasisCents : null,
    resourceBasisKind: evidence.resourceBasisKind,
    resourceBasisUpdatedAtIso: evidence.resourceBasisUpdatedAtIso,
    livingPercent: active.livingPercent,
    livingLimitCents,
    protectedPlanCents,
    flexibleCapacityCents,
    countedFlexibleSpendCents,
    flexibleRoomCents: exact ? flexibleRoomHighCents : null,
    flexibleRoomLowCents,
    flexibleRoomHighCents,
    unresolvedInScopeCents: reconciliation.totals.unresolvedInScopeCents,
    plannedCents: active.plannedCents,
    unassignedCents: active.unassignedCents,
    overLimitCents: active.overTargetCents,
    freshness,
    confidence,
    qualificationReason,
  };
  const limitLine = livingLimitCents == null
    ? null
    : { livingPercent: active.livingPercent, livingLimitCents };

  if (!hasIncomeBasis) return answer('missing_income_basis', facts, null, null, 'review_income');
  if (freshness === 'stale') return answer('stale', facts, flexibleRoomLowCents, limitLine, 'refresh');
  if (active.overTargetCents > 0) return answer('over_limit', facts, active.overTargetCents, limitLine, null);
  if (active.unassignedCents > 0) return answer('unassigned', facts, active.unassignedCents, limitLine, null);
  if (flexibleCapacityCents === 0) return answer('no_flexible_room', facts, 0, limitLine, null);
  if (!reconciliation.invariant.valid) return answer('insufficient_meaning', facts, null, limitLine, 'review_meaning');
  if (flexibleCapacityCents == null || flexibleRoomLowCents == null || flexibleRoomHighCents == null) {
    return answer('insufficient_meaning', facts, null, limitLine, 'review_meaning');
  }
  if (flexibleRoomLowCents < 0 && flexibleRoomHighCents >= 0) {
    return {
      ...answer('needs_one_answer', facts, null, limitLine, 'review_meaning'),
      reviewTransactionIds: reviewIdsForZeroCrossing(reconciliation, flexibleRoomHighCents),
    };
  }
  const uncertaintyCents = flexibleRoomHighCents - flexibleRoomLowCents;
  const materialityCents = Math.max(2500, Math.round(flexibleCapacityCents * 0.05));
  if (uncertaintyCents > materialityCents) {
    return answer('insufficient_meaning', facts, null, limitLine, 'review_meaning');
  }
  if (flexibleRoomHighCents < 0) {
    return answer('over_flexible_room', facts, Math.abs(flexibleRoomHighCents), limitLine, null);
  }
  if (!exact) return answer('estimated', facts, flexibleRoomLowCents, limitLine, null);
  return answer('supported', facts, flexibleRoomHighCents, limitLine, null);
}

function answer(
  state: MoneyPlanLimitAnswerState,
  facts: MoneyPlanLimitFacts,
  headlineAmountCents: number | null,
  limitLine: MoneyPlanLimitAnswer['limitLine'],
  recoveryAction: MoneyPlanLimitAnswer['recoveryAction'],
): MoneyPlanLimitAnswer {
  return {
    state,
    facts,
    headlineAmountCents,
    limitLine,
    qualification: facts.qualificationReason,
    recoveryAction,
    reviewTransactionIds: [],
  };
}

function reviewIdsForZeroCrossing(
  reconciliation: MoneyEconomicRoleReconciliation,
  flexibleRoomHighCents: number,
): string[] {
  const sorted = reconciliation.rows
    .filter((row) => row.disposition === 'unresolved')
    .sort((left, right) => right.amountCents - left.amountCents || left.transactionId.localeCompare(right.transactionId));
  const result: string[] = [];
  let reviewedCents = 0;
  for (const row of sorted) {
    result.push(row.transactionId);
    reviewedCents += row.amountCents;
    if (reviewedCents > flexibleRoomHighCents) break;
  }
  return result;
}

function validCents(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

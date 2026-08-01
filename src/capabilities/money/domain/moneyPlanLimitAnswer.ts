import type { MoneyPlanLimitEvidence } from '../data/moneyPlanLimitEvidence';
import type { ActiveLivingPlan } from '../data/livingPlanRepository';
import type { MoneyEconomicRoleReconciliation } from './moneyEconomicRole';
import { formatMoney } from '../data/moneySnapshot';

export const MONEY_PLAN_LIMIT_POLICY_VERSION = 'money-plan-limit-v2';

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
  protectedOverageCents: number;
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

export type FormattedMoneyPlanLimitAnswer = {
  headline: string;
  support: string;
};

export function formatMoneyPlanLimitAnswer(answer: MoneyPlanLimitAnswer, _freshnessLabel?: string): FormattedMoneyPlanLimitAnswer {
  const percent = answer.facts.livingPercent;
  const usage = flexibleUsageLine(answer.facts);
  const limit = answer.limitLine
    ? `Within your ${percent}% living limit of ${formatMoney(answer.limitLine.livingLimitCents)}.`
    : 'Your dollar living limit is not available yet.';
  switch (answer.state) {
    case 'supported':
      return { headline: `${formatMoney(answer.headlineAmountCents ?? 0)} left for flexible spending this month`, support: usage };
    case 'estimated':
      return { headline: `${formatMoney(answer.headlineAmountCents ?? 0)} left for flexible spending this month`, support: usage };
    case 'no_flexible_room':
      return { headline: `Your protected plan uses the full ${percent}% living limit`, support: limit };
    case 'over_limit':
      return { headline: `Your plan is ${formatMoney(answer.headlineAmountCents ?? 0)} over its ${percent}% living limit`, support: limit };
    case 'over_flexible_room':
      return { headline: `Flexible spending is ${formatMoney(answer.headlineAmountCents ?? 0)} beyond the room in your living limit`, support: usage };
    case 'unassigned':
      return { headline: `${formatMoney(answer.headlineAmountCents ?? 0)} left for flexible spending this month`, support: usage };
    case 'stale':
      return answer.headlineAmountCents != null && answer.headlineAmountCents < 0
        ? { headline: `${formatMoney(Math.abs(answer.headlineAmountCents))} beyond flexible spending this month`, support: usage }
        : { headline: `${formatMoney(answer.headlineAmountCents ?? 0)} left for flexible spending this month`, support: usage };
    case 'needs_one_answer':
      return { headline: 'Your monthly plan could not be updated', support: 'Your last supported plan remains available.' };
    case 'insufficient_meaning':
      return { headline: 'Your monthly plan could not be updated', support: 'Your last supported plan remains available.' };
    case 'missing_income_basis':
      return {
        headline: 'Finish your monthly plan',
        support: 'Add your monthly income so Kwilt can calculate flexible money.',
      };
  }
}

export function projectMoneyPlanCapacity(input: {
  livingLimitCents: number;
  allocations: Array<{ amountCents: number; fixedCents: number; overrideCents: number }>;
}): { protectedPlanCents: number; flexibleCapacityCents: number } {
  const protectedPlanCents = input.allocations
    .reduce((sum, allocation) => sum + validCents(allocation.fixedCents), 0);
  return {
    protectedPlanCents,
    flexibleCapacityCents: Math.max(0, validCents(input.livingLimitCents) - protectedPlanCents),
  };
}

export function projectProtectedRequirement(input: {
  categories: Array<{
    fundingRhythm: 'monthly' | 'reserve';
    plannedCents: number;
    priorReserveCents: number;
    spentCents: number;
  }>;
}): { protectedPlanCents: number; protectedOverageCents: number; effectiveProtectedCents: number } {
  return input.categories.reduce((result, category) => {
    const plannedCents = validCents(category.plannedCents);
    const spentCents = validCents(category.spentCents);
    const priorReserveCents = category.fundingRhythm === 'reserve'
      ? validCents(category.priorReserveCents)
      : 0;
    const currentMonthRequirementCents = Math.max(0, spentCents - priorReserveCents);
    const effectiveCents = Math.max(plannedCents, currentMonthRequirementCents);
    result.protectedPlanCents += plannedCents;
    result.protectedOverageCents += Math.max(0, effectiveCents - plannedCents);
    result.effectiveProtectedCents += effectiveCents;
    return result;
  }, { protectedPlanCents: 0, protectedOverageCents: 0, effectiveProtectedCents: 0 });
}

export function projectMoneyPlanLimitAnswer(input: {
  active: ActiveLivingPlan;
  evidence: MoneyPlanLimitEvidence;
  reconciliation: MoneyEconomicRoleReconciliation;
  freshness: 'fresh' | 'stale';
  protectedPlanCents?: number;
  protectedOverageCents?: number;
}): MoneyPlanLimitAnswer {
  const { active, evidence, reconciliation, freshness } = input;
  const hasIncomeBasis = active.resourceBasisCents > 0 && evidence.resourceBasisKind !== 'unknown';
  const livingLimitCents = hasIncomeBasis ? active.targetCents : null;
  const capacity = livingLimitCents == null
    ? null
    : input.protectedPlanCents == null
      ? projectMoneyPlanCapacity({ livingLimitCents, allocations: active.allocations })
      : {
          protectedPlanCents: validCents(input.protectedPlanCents),
          flexibleCapacityCents: Math.max(0, livingLimitCents - validCents(input.protectedPlanCents)),
        };
  const protectedPlanCents = capacity?.protectedPlanCents ?? null;
  const protectedOverageCents = validCents(input.protectedOverageCents ?? 0);
  const flexibleCapacityCents = capacity == null
    ? null
    : Math.max(0, capacity.flexibleCapacityCents - protectedOverageCents);
  const countedFlexibleSpendCents = hasIncomeBasis
    ? reconciliation.totals.flexibleSpendingCents + reconciliation.totals.unresolvedInScopeCents
    : null;
  const flexibleRoomCents = flexibleCapacityCents == null || countedFlexibleSpendCents == null
    ? null
    : flexibleCapacityCents - countedFlexibleSpendCents;
  const confidence: MoneyPlanLimitFacts['confidence'] = reconciliation.invariant.valid
    ? 'supported'
    : 'qualified';
  const qualificationReason: MoneyPlanLimitFacts['qualificationReason'] = !reconciliation.invariant.valid
    ? 'invalid_reconciliation'
    : !hasIncomeBasis
      ? 'missing_provenance'
      : freshness === 'stale'
        ? 'stale_evidence'
        : null;
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
    protectedOverageCents,
    flexibleCapacityCents,
    countedFlexibleSpendCents,
    flexibleRoomCents,
    flexibleRoomLowCents: flexibleRoomCents,
    flexibleRoomHighCents: flexibleRoomCents,
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
  if (freshness === 'stale') return answer('stale', facts, flexibleRoomCents, limitLine, 'refresh');
  if (active.overTargetCents > 0) return answer('over_limit', facts, active.overTargetCents, limitLine, null);
  if (flexibleCapacityCents === 0) return answer('no_flexible_room', facts, 0, limitLine, null);
  if (!reconciliation.invariant.valid) return answer('insufficient_meaning', facts, null, limitLine, 'review_meaning');
  if (flexibleCapacityCents == null || flexibleRoomCents == null) {
    return answer('insufficient_meaning', facts, null, limitLine, 'review_meaning');
  }
  if (flexibleRoomCents < 0) {
    return answer('over_flexible_room', facts, Math.abs(flexibleRoomCents), limitLine, null);
  }
  return answer('supported', facts, flexibleRoomCents, limitLine, null);
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

function validCents(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}

function flexibleUsageLine(facts: MoneyPlanLimitFacts): string {
  if (facts.countedFlexibleSpendCents == null || facts.flexibleCapacityCents == null) return '';
  return `${formatMoney(facts.countedFlexibleSpendCents)} of ${formatMoney(facts.flexibleCapacityCents)} used`;
}

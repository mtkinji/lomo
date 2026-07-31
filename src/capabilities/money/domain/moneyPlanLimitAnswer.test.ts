import type { ActiveLivingPlan } from '../data/livingPlanRepository';
import type { MoneyPlanLimitEvidence } from '../data/moneyPlanLimitEvidence';
import type { MoneyEconomicRoleReconciliation } from './moneyEconomicRole';
import { formatMoneyPlanLimitAnswer, projectMoneyPlanLimitAnswer } from './moneyPlanLimitAnswer';

const evidence: MoneyPlanLimitEvidence = {
  resourceBasisKind: 'detected_income',
  resourceBasisUpdatedAtIso: '2026-07-24T12:00:00.000Z',
};

function active(overrides: Partial<ActiveLivingPlan> = {}): ActiveLivingPlan {
  return {
    versionId: 'version-1', predecessorVersionId: null, periodId: '2026-07', livingPercent: 70,
    allocatorVersion: 'living-plan-v2', evidenceHash: 'evidence-1', candidateHash: 'candidate-1', status: 'ready',
    resourceBasisCents: 500000, targetCents: 350000, plannedCents: 350000,
    unassignedCents: 0, overTargetCents: 0,
    allocations: [
      { categoryId: 'home', amountCents: 200000, fixedCents: 200000, overrideCents: 0, flexibleCents: 0, exposureCents: 0, source: 'fixed', fundingRhythm: 'monthly', priorReserveCents: 0, expectedNeed: null },
      { categoryId: 'food', amountCents: 150000, fixedCents: 0, overrideCents: 0, flexibleCents: 150000, exposureCents: 0, source: 'recent_spending', fundingRhythm: 'monthly', priorReserveCents: 0, expectedNeed: null },
    ],
    receipt: null,
    ...overrides,
  };
}

function reconciliation(overrides: Partial<MoneyEconomicRoleReconciliation['totals']> = {}): MoneyEconomicRoleReconciliation {
  return {
    rows: [],
    totals: {
      protectedSpendingCents: 0,
      flexibleSpendingCents: 115704,
      outsidePlanCents: 0,
      neutralCents: 0,
      unresolvedInScopeCents: 0,
      ...overrides,
    },
    invariant: { valid: true, transactionCount: 0, accountedTransactionCount: 0 },
  };
}

describe('projectMoneyPlanLimitAnswer', () => {
  it('projects the exact supported flexible room inside the selected living limit', () => {
    const answer = projectMoneyPlanLimitAnswer({ active: active(), evidence, reconciliation: reconciliation(), freshness: 'fresh' });

    expect(answer.facts).toMatchObject({
      livingLimitCents: 350000,
      protectedPlanCents: 200000,
      flexibleCapacityCents: 150000,
      countedFlexibleSpendCents: 115704,
      flexibleRoomCents: 34296,
      flexibleRoomLowCents: 34296,
      flexibleRoomHighCents: 34296,
    });
    expect(answer.state).toBe('supported');
    expect(answer.headlineAmountCents).toBe(34296);
  });

  it('formats the same direct, non-advisory answer for every surface', () => {
    const answer = projectMoneyPlanLimitAnswer({ active: active(), evidence, reconciliation: reconciliation(), freshness: 'fresh' });

    expect(formatMoneyPlanLimitAnswer(answer)).toEqual({
      headline: '$343 left for flexible spending',
      support: 'Within your 70% living limit of $3,500.',
    });
  });

  it('formats an honest refusal without inventing a zero-dollar basis', () => {
    const answer = projectMoneyPlanLimitAnswer({
      active: active(),
      evidence: { ...evidence, resourceBasisKind: 'unknown' },
      reconciliation: reconciliation(),
      freshness: 'fresh',
    });

    expect(formatMoneyPlanLimitAnswer(answer)).toEqual({
      headline: 'Kwilt needs your monthly income',
      support: 'Your dollar living limit is not available yet.',
    });
  });

  it.each([
    ['missing_income_basis', active(), { ...evidence, resourceBasisKind: 'unknown' as const }, reconciliation(), 'fresh' as const],
    ['stale', active(), evidence, reconciliation(), 'stale' as const],
    ['over_limit', active({ plannedCents: 358400, overTargetCents: 8400 }), evidence, reconciliation(), 'fresh' as const],
    ['unassigned', active({ plannedCents: 338000, unassignedCents: 12000 }), evidence, reconciliation(), 'fresh' as const],
  ])('uses state priority for %s', (state, plan, planEvidence, rows, freshness) => {
    expect(projectMoneyPlanLimitAnswer({ active: plan, evidence: planEvidence, reconciliation: rows, freshness }).state).toBe(state);
  });

  it('distinguishes no flexible capacity from actual flexible overspending', () => {
    const noRoom = active({
      allocations: [
        { categoryId: 'home', amountCents: 350000, fixedCents: 350000, overrideCents: 0, flexibleCents: 0, exposureCents: 0, source: 'fixed', fundingRhythm: 'monthly', priorReserveCents: 0, expectedNeed: null },
      ],
    });
    expect(projectMoneyPlanLimitAnswer({ active: noRoom, evidence, reconciliation: reconciliation(), freshness: 'fresh' }).state)
      .toBe('no_flexible_room');

    const overspent = projectMoneyPlanLimitAnswer({
      active: active(), evidence, reconciliation: reconciliation({ flexibleSpendingCents: 158400 }), freshness: 'fresh',
    });
    expect(overspent.state).toBe('over_flexible_room');
    expect(overspent.headlineAmountCents).toBe(8400);
  });

  it('asks about only enough largest unresolved transactions to resolve a branching answer', () => {
    const rows = reconciliation({ flexibleSpendingCents: 145000, unresolvedInScopeCents: 9000 });
    rows.rows = [
      { transactionId: 'small', disposition: 'unresolved', amountCents: 1000, contributions: [] },
      { transactionId: 'large', disposition: 'unresolved', amountCents: 6000, contributions: [] },
      { transactionId: 'medium', disposition: 'unresolved', amountCents: 2000, contributions: [] },
    ];

    const answer = projectMoneyPlanLimitAnswer({ active: active(), evidence, reconciliation: rows, freshness: 'fresh' });

    expect(answer.state).toBe('needs_one_answer');
    expect(answer.facts.flexibleRoomLowCents).toBeLessThan(0);
    expect(answer.facts.flexibleRoomHighCents).toBeGreaterThanOrEqual(0);
    expect(answer.reviewTransactionIds).toEqual(['large']);
  });

  it('returns a conservative estimate only for bounded, non-branching uncertainty', () => {
    const estimated = projectMoneyPlanLimitAnswer({
      active: active(), evidence,
      reconciliation: reconciliation({ flexibleSpendingCents: 115704, unresolvedInScopeCents: 2000 }),
      freshness: 'fresh',
    });
    expect(estimated.state).toBe('estimated');
    expect(estimated.headlineAmountCents).toBe(32296);

    const unsupported = projectMoneyPlanLimitAnswer({
      active: active(), evidence,
      reconciliation: reconciliation({ flexibleSpendingCents: 80000, unresolvedInScopeCents: 20000 }),
      freshness: 'fresh',
    });
    expect(unsupported.state).toBe('insufficient_meaning');
  });
});

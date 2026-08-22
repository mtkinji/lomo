import type { ActiveLivingPlan } from '../data/livingPlanRepository';
import type { MoneyPlanLimitEvidence } from '../data/moneyPlanLimitEvidence';
import type { MoneyEconomicRoleReconciliation } from './moneyEconomicRole';
import { formatMoneyPlanLimitAnswer, projectMoneyPlanCapacity, projectMoneyPlanLimitAnswer } from './moneyPlanLimitAnswer';

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
      savedResourceSpendingCents: 0,
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
      headline: '$342.96 left for flexible spending this month',
      support: '$1,157.04 of $1,500 used',
    });
  });

  it('protects fixed costs without turning a flexible user override into a fixed cost', () => {
    expect(projectMoneyPlanCapacity({
      livingLimitCents: 350000,
      allocations: [
        { amountCents: 200000, fixedCents: 200000, overrideCents: 0 },
        { amountCents: 50000, fixedCents: 0, overrideCents: 50000 },
      ],
    })).toEqual({ protectedPlanCents: 200000, flexibleCapacityCents: 150000 });
  });

  it('formats an honest refusal without inventing a zero-dollar basis', () => {
    const answer = projectMoneyPlanLimitAnswer({
      active: active(),
      evidence: { ...evidence, resourceBasisKind: 'unknown' },
      reconciliation: reconciliation(),
      freshness: 'fresh',
    });

    expect(formatMoneyPlanLimitAnswer(answer)).toEqual({
      headline: 'Finish your monthly plan',
      support: 'Add your monthly income so Kwilt can calculate flexible money.',
    });
  });

  it('keeps the last useful answer when transaction evidence is stale', () => {
    const stale = projectMoneyPlanLimitAnswer({
      active: active(),
      evidence,
      reconciliation: reconciliation(),
      freshness: 'stale',
    });

    expect(formatMoneyPlanLimitAnswer(stale, 'Updated 4 days ago')).toEqual({
      headline: '$342.96 left for flexible spending this month',
      support: '$1,157.04 of $1,500 used',
    });
  });

  it.each([
    ['missing_income_basis', active(), { ...evidence, resourceBasisKind: 'unknown' as const }, reconciliation(), 'fresh' as const],
    ['stale', active(), evidence, reconciliation(), 'stale' as const],
    ['over_limit', active({ plannedCents: 358400, overTargetCents: 8400 }), evidence, reconciliation(), 'fresh' as const],
  ])('uses state priority for %s', (state, plan, planEvidence, rows, freshness) => {
    expect(projectMoneyPlanLimitAnswer({ active: plan, evidence: planEvidence, reconciliation: rows, freshness }).state).toBe(state);
  });

  it('keeps unassigned category capacity as a supporting fact instead of replacing the flexible answer', () => {
    const projected = projectMoneyPlanLimitAnswer({
      active: active({ plannedCents: 338000, unassignedCents: 12000 }),
      evidence,
      reconciliation: reconciliation(),
      freshness: 'fresh',
    });
    expect(projected.state).toBe('supported');
    expect(projected.headlineAmountCents).toBe(34296);
    expect(projected.facts.unassignedCents).toBe(12000);
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
    expect(formatMoneyPlanLimitAnswer(overspent)).toEqual({
      headline: 'Flexible spending is $84 beyond the room in your living limit',
      support: '$1,584 of $1,500 used',
    });
  });

  it('keeps committed overspending separate from the fixed flexible plan', () => {
    const projected = projectMoneyPlanLimitAnswer({
      active: active(),
      evidence,
      reconciliation: reconciliation({ flexibleSpendingCents: 158_400 }),
      freshness: 'fresh',
      protectedPlanCents: 200_000,
      protectedOverageCents: 5_000,
    });

    expect(projected.facts).toMatchObject({
      policyVersion: 'money-plan-limit-v3',
      protectedPlanCents: 200_000,
      protectedOverageCents: 5_000,
      flexibleCapacityCents: 150_000,
      countedFlexibleSpendCents: 158_400,
      flexibleRoomCents: -8_400,
    });
    expect(projected.state).toBe('over_flexible_room');
    expect(projected.headlineAmountCents).toBe(8_400);
  });

  it('counts unresolved ordinary outflows conservatively instead of asking the customer to classify them', () => {
    const rows = reconciliation({ flexibleSpendingCents: 145000, unresolvedInScopeCents: 9000 });
    rows.rows = [
      { transactionId: 'small', disposition: 'unresolved', amountCents: 1000, monthlyPlanCents: 1000, savedResourceCents: 0, contributions: [] },
      { transactionId: 'large', disposition: 'unresolved', amountCents: 6000, monthlyPlanCents: 6000, savedResourceCents: 0, contributions: [] },
      { transactionId: 'medium', disposition: 'unresolved', amountCents: 2000, monthlyPlanCents: 2000, savedResourceCents: 0, contributions: [] },
    ];

    const answer = projectMoneyPlanLimitAnswer({ active: active(), evidence, reconciliation: rows, freshness: 'fresh' });

    expect(answer.state).toBe('over_flexible_room');
    expect(answer.headlineAmountCents).toBe(4000);
    expect(answer.facts.countedFlexibleSpendCents).toBe(154000);
    expect(answer.facts.flexibleRoomCents).toBe(-4000);
    expect(answer.reviewTransactionIds).toEqual([]);
  });

  it('returns one exact conservative answer when unresolved category placement remains', () => {
    const projected = projectMoneyPlanLimitAnswer({
      active: active(), evidence,
      reconciliation: reconciliation({ flexibleSpendingCents: 115704, unresolvedInScopeCents: 2000 }),
      freshness: 'fresh',
    });
    expect(projected.state).toBe('supported');
    expect(projected.headlineAmountCents).toBe(32296);
    expect(projected.facts.flexibleRoomLowCents).toBe(32296);
    expect(projected.facts.flexibleRoomHighCents).toBe(32296);
  });
});

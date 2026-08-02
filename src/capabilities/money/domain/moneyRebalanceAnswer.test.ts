import type { ReadyLivingPlanOverridePreview } from '../runtime/livingPlanReconciliation';
import { projectMoneyRebalanceAnswer } from './moneyRebalanceAnswer';

function preview(overrides: Partial<ReadyLivingPlanOverridePreview> = {}): ReadyLivingPlanOverridePreview {
  return {
    outcome: 'ready', expectedActiveVersionId: 'version-1', candidateHash: 'candidate-1',
    candidate: { periodId: '2026-07', livingPercent: 70, allocatorVersion: 'v2', evidenceHash: 'e1', candidateHash: 'candidate-1', status: 'ready', resourceBasisCents: 500000, targetCents: 350000, plannedCents: 350000, unassignedCents: 0, overTargetCents: 0, allocations: [] },
    comparison: { outcome: 'material', materialReasons: ['allocation_changed'], changedCategoryIds: [], reversible: true },
    changes: [],
    before: { livingPercent: 70, resourceBasisCents: 500000, targetCents: 350000, plannedCents: 290000, unassignedCents: 6000, overTargetCents: 0 },
    after: { livingPercent: 70, resourceBasisCents: 500000, targetCents: 350000, plannedCents: 350000, unassignedCents: 0, overTargetCents: 0 },
    recentSpending: null, currentSource: 'recent_spending', protectedAmountsUnchanged: true,
    ...overrides,
  };
}

describe('projectMoneyRebalanceAnswer', () => {
  it('recognizes an increase funded entirely from unassigned capacity', () => {
    const answer = projectMoneyRebalanceAnswer(preview({
      changes: [{ categoryId: 'food', beforeCents: 5000, afterCents: 11000 }],
      before: { livingPercent: 70, resourceBasisCents: 500000, targetCents: 350000, plannedCents: 344000, unassignedCents: 6000, overTargetCents: 0 },
    }), 'food');
    expect(answer).toMatchObject({ state: 'within_unassigned', headlineAmountCents: 6000, movedCents: 0, protectedAmountsUnchanged: true });
  });

  it('reports only actual changes when other flexible categories fund the increase', () => {
    const answer = projectMoneyRebalanceAnswer(preview({
      changes: [
        { categoryId: 'food', beforeCents: 5000, afterCents: 11000 },
        { categoryId: 'dining', beforeCents: 8000, afterCents: 5000 },
        { categoryId: 'shopping', beforeCents: 7000, afterCents: 4000 },
        { categoryId: 'unchanged', beforeCents: 2000, afterCents: 2000 },
      ],
      before: { livingPercent: 70, resourceBasisCents: 500000, targetCents: 350000, plannedCents: 350000, unassignedCents: 0, overTargetCents: 0 },
    }), 'food');
    expect(answer.state).toBe('within_reallocated');
    expect(answer.movedCents).toBe(6000);
    expect(answer.changedCategories.map((row) => row.categoryId)).toEqual(['food', 'dining', 'shopping']);
  });

  it('reports the plan overage without claiming protected money moved', () => {
    const answer = projectMoneyRebalanceAnswer(preview({
      changes: [{ categoryId: 'food', beforeCents: 5000, afterCents: 13400 }],
      after: { livingPercent: 70, resourceBasisCents: 500000, targetCents: 350000, plannedCents: 358400, unassignedCents: 0, overTargetCents: 8400 },
      protectedAmountsUnchanged: true,
    }), 'food');
    expect(answer).toMatchObject({ state: 'over_limit', headlineAmountCents: 8400, protectedAmountsUnchanged: true });
  });
});

import type { SupabaseClient } from '@supabase/supabase-js';
import type { LivingPlanCandidate } from '../domain/living-plan';
import { applyGovernedCategoryPlanChange, getActiveLivingPlan } from '../data/livingPlanRepository';
import { commitLivingPlanCategoryChange, type ReadyLivingPlanOverridePreview } from './livingPlanReconciliation';

jest.mock('../data/livingPlanRepository', () => ({
  ...jest.requireActual('../data/livingPlanRepository'),
  applyGovernedCategoryPlanChange: jest.fn(),
  getActiveLivingPlan: jest.fn(),
}));

const candidate = {
  periodId: '2026-07', livingPercent: 70, allocatorVersion: 'living-plan-v2', evidenceHash: 'evidence-1',
  candidateHash: 'candidate-1', status: 'ready', resourceBasisCents: 500000, targetCents: 350000,
  plannedCents: 350000, unassignedCents: 0, overTargetCents: 0,
  allocations: [{
    categoryId: 'food', amountCents: 75000, fixedCents: 0, overrideCents: 75000, flexibleCents: 0,
    exposureCents: 20000, source: 'user_override', fundingRhythm: 'monthly', priorReserveCents: 0, expectedNeed: null,
  }],
} satisfies LivingPlanCandidate;

function preview(): ReadyLivingPlanOverridePreview {
  return {
    outcome: 'ready', expectedActiveVersionId: 'version-1', candidateHash: candidate.candidateHash, candidate,
    comparison: { outcome: 'material', materialReasons: ['allocation_changed'], changedCategoryIds: ['food'], reversible: true },
    changes: [{ categoryId: 'food', beforeCents: 50000, afterCents: 75000 }],
    before: { livingPercent: 70, resourceBasisCents: 500000, targetCents: 350000, plannedCents: 350000, unassignedCents: 0, overTargetCents: 0 },
    after: { livingPercent: 70, resourceBasisCents: 500000, targetCents: 350000, plannedCents: 350000, unassignedCents: 0, overTargetCents: 0 },
    recentSpending: null, currentSource: 'recent_spending', protectedAmountsUnchanged: true,
  };
}

describe('commitLivingPlanCategoryChange', () => {
  beforeEach(() => jest.clearAllMocks());

  it('commits the reviewed candidate against its original active version without recomputing', async () => {
    const client = {} as SupabaseClient;
    jest.mocked(applyGovernedCategoryPlanChange).mockResolvedValue('version-2');
    const reviewed = preview();

    await expect(commitLivingPlanCategoryChange(client, {
      planCategoryId: 'food-uuid', allocationCategoryId: 'food', amountCents: 75000,
      fundingRhythm: 'monthly', expectedNeedCents: null, expectedNeedDueMonth: null, preview: reviewed,
    })).resolves.toEqual({ outcome: 'promoted', versionId: 'version-2' });

    expect(applyGovernedCategoryPlanChange).toHaveBeenCalledWith(client, expect.objectContaining({
      expectedActiveVersionId: 'version-1', candidate: reviewed.candidate, comparison: reviewed.comparison,
    }));
    expect(getActiveLivingPlan).not.toHaveBeenCalled();
  });

  it('rejects a changed or stale reviewed candidate instead of silently rebuilding it', async () => {
    const client = {} as SupabaseClient;
    const changed = preview();
    changed.candidateHash = 'different';
    await expect(commitLivingPlanCategoryChange(client, {
      planCategoryId: 'food-uuid', allocationCategoryId: 'food', amountCents: 75000,
      fundingRhythm: 'monthly', expectedNeedCents: null, expectedNeedDueMonth: null, preview: changed,
    })).rejects.toThrow('no longer valid');
    expect(applyGovernedCategoryPlanChange).not.toHaveBeenCalled();

    jest.mocked(applyGovernedCategoryPlanChange).mockRejectedValue(new Error('The Money plan changed since you reviewed it. Review the change again.'));
    await expect(commitLivingPlanCategoryChange(client, {
      planCategoryId: 'food-uuid', allocationCategoryId: 'food', amountCents: 75000,
      fundingRhythm: 'monthly', expectedNeedCents: null, expectedNeedDueMonth: null, preview: preview(),
    })).rejects.toThrow('changed since you reviewed');
    expect(getActiveLivingPlan).not.toHaveBeenCalled();
  });
});

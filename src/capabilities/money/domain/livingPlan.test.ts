import { projectLivingPlanCandidate } from './living-plan';
import { compareLivingPlanVersions, type LivingPlanVersion } from './living-plan-changes';
import { classifyPlanningIncomeSource } from './planning-income';

describe('living plan projection', () => {
  const incomeReceipt = classifyPlanningIncomeSource({
    sourceKey: 'payroll',
    description: 'Employer payroll',
    providerCategory: 'INCOME_WAGES',
    samples: [500_000, 500_000, 500_000],
    activePeriodCount: 3,
  });

  it('preserves fixed and user-set amounts before allocating flexible spending', () => {
    const candidate = projectLivingPlanCandidate({
      periodId: '2026-07',
      livingPercent: 80,
      allocatorVersion: 'living-plan-v1',
      evidenceHash: 'evidence-1',
      syncFresh: true,
      resourceReceipts: [incomeReceipt],
      categories: [
        { categoryId: 'fixed', fixedCents: 200_000 },
        { categoryId: 'override', overrideCents: 100_000 },
        { categoryId: 'flex', supportedFlexibleCents: 150_000 },
      ],
    });

    expect(candidate).toMatchObject({
      resourceBasisCents: 500_000,
      targetCents: 400_000,
      plannedCents: 400_000,
      unassignedCents: 0,
      overTargetCents: 0,
      status: 'ready',
    });
    expect(candidate.allocations.map((row) => [row.categoryId, row.amountCents, row.source])).toEqual([
      ['fixed', 200_000, 'fixed'],
      ['flex', 100_000, 'recent_spending'],
      ['override', 100_000, 'user_override'],
    ]);
  });

  it('blocks promotion when account evidence is stale', () => {
    expect(projectLivingPlanCandidate({
      periodId: '2026-07',
      livingPercent: 80,
      allocatorVersion: 'living-plan-v1',
      evidenceHash: 'evidence-1',
      syncFresh: false,
      resourceReceipts: [incomeReceipt],
      categories: [],
    }).status).toBe('blocked');
  });

  it('marks a meaningful category movement as material and reversible', () => {
    const before = projectLivingPlanCandidate({
      periodId: '2026-07', livingPercent: 80, allocatorVersion: 'living-plan-v1', evidenceHash: 'one', syncFresh: true,
      resourceReceipts: [incomeReceipt], categories: [{ categoryId: 'flex', supportedFlexibleCents: 100_000 }],
    }) as LivingPlanVersion;
    before.versionId = 'version-1';
    const after = projectLivingPlanCandidate({
      periodId: '2026-07', livingPercent: 80, allocatorVersion: 'living-plan-v1', evidenceHash: 'two', syncFresh: true,
      resourceReceipts: [incomeReceipt], categories: [{ categoryId: 'flex', supportedFlexibleCents: 130_000 }],
    });

    expect(compareLivingPlanVersions({ prior: before, candidate: after, trigger: 'sync_evidence_changed' })).toMatchObject({
      outcome: 'material',
      changedCategoryIds: ['flex'],
      reversible: true,
    });
  });
});

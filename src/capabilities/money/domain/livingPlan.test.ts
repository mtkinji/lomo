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

  it('keeps a user-set planning basis stable regardless of observed receipts', () => {
    const candidate = projectLivingPlanCandidate({
      periodId: '2026-07',
      livingPercent: 80,
      allocatorVersion: 'living-plan-v2',
      evidenceHash: 'user-basis',
      syncFresh: true,
      userResourceBasisCents: 400_000,
      resourceReceipts: [incomeReceipt],
      categories: [{ categoryId: 'food', starterWeight: 1 }],
    });

    expect(candidate).toMatchObject({ resourceBasisCents: 400_000, targetCents: 320_000 });
  });

  it('allocates flexible capacity independently of category order', () => {
    const project = (categories: Array<{ categoryId: string; supportedFlexibleCents: number }>) =>
      projectLivingPlanCandidate({
        periodId: '2026-07',
        livingPercent: 20,
        allocatorVersion: 'living-plan-v2',
        evidenceHash: 'order-independent',
        syncFresh: true,
        resourceReceipts: [incomeReceipt],
        categories,
      }).allocations.map(({ categoryId, amountCents }) => ({ categoryId, amountCents }));

    expect(project([
      { categoryId: 'z-last', supportedFlexibleCents: 150_000 },
      { categoryId: 'a-first', supportedFlexibleCents: 150_000 },
    ])).toEqual([
      { categoryId: 'a-first', amountCents: 50_000 },
      { categoryId: 'z-last', amountCents: 50_000 },
    ]);
    expect(project([
      { categoryId: 'a-first', supportedFlexibleCents: 150_000 },
      { categoryId: 'z-last', supportedFlexibleCents: 150_000 },
    ])).toEqual([
      { categoryId: 'a-first', amountCents: 50_000 },
      { categoryId: 'z-last', amountCents: 50_000 },
    ]);
  });

  it('fully allocates the living target from blended starter and household weights', () => {
    const candidate = projectLivingPlanCandidate({
      periodId: '2026-07',
      livingPercent: 80,
      allocatorVersion: 'living-plan-v2',
      evidenceHash: 'blended',
      syncFresh: true,
      evidenceConfidence: 0.5,
      resourceReceipts: [incomeReceipt],
      categories: [
        { categoryId: 'groceries', supportedFlexibleCents: 300_000, starterWeight: 0.25 },
        { categoryId: 'gifts', supportedFlexibleCents: 100_000, starterWeight: 0.75, fundingRhythm: 'reserve', priorReserveCents: 900_000 },
      ],
    });

    expect(candidate).toMatchObject({
      targetCents: 400_000,
      plannedCents: 400_000,
      unassignedCents: 0,
    });
    expect(candidate.allocations.map(({ categoryId, amountCents }) => [categoryId, amountCents])).toEqual([
      ['gifts', 200_000],
      ['groceries', 200_000],
    ]);
    expect(candidate.allocations.map(({ categoryId, source }) => [categoryId, source])).toEqual([
      ['gifts', 'blended_evidence'],
      ['groceries', 'blended_evidence'],
    ]);
  });

  it('labels a starter-only allocation as starter policy rather than recent spending', () => {
    const candidate = projectLivingPlanCandidate({
      periodId: '2026-07', livingPercent: 20, allocatorVersion: 'living-plan-v2', evidenceHash: 'starter-only',
      syncFresh: true, evidenceConfidence: 0, resourceReceipts: [incomeReceipt],
      categories: [{ categoryId: 'food', starterWeight: 1 }],
    });

    expect(candidate.allocations[0]).toMatchObject({
      categoryId: 'food',
      amountCents: 100_000,
      source: 'starter_weight',
    });
  });

  it('preserves protected amounts and reports the exact over-target amount', () => {
    const candidate = projectLivingPlanCandidate({
      periodId: '2026-07',
      livingPercent: 80,
      allocatorVersion: 'living-plan-v2',
      evidenceHash: 'protected',
      syncFresh: true,
      resourceReceipts: [incomeReceipt],
      categories: [
        { categoryId: 'housing', fixedCents: 300_000 },
        { categoryId: 'childcare', overrideCents: 150_000 },
        { categoryId: 'food', supportedFlexibleCents: 100_000 },
      ],
    });

    expect(candidate).toMatchObject({
      targetCents: 400_000,
      plannedCents: 450_000,
      overTargetCents: 50_000,
      status: 'over_target',
    });
    expect(candidate.allocations.find((row) => row.categoryId === 'food')?.amountCents).toBe(0);
  });

  it('marks a meaningful category movement as material and reversible', () => {
    const before = projectLivingPlanCandidate({
      periodId: '2026-07', livingPercent: 80, allocatorVersion: 'living-plan-v1', evidenceHash: 'one', syncFresh: true,
      resourceReceipts: [incomeReceipt], categories: [
        { categoryId: 'flex-a', supportedFlexibleCents: 100_000 },
        { categoryId: 'flex-b', supportedFlexibleCents: 300_000 },
      ],
    }) as LivingPlanVersion;
    before.versionId = 'version-1';
    const after = projectLivingPlanCandidate({
      periodId: '2026-07', livingPercent: 80, allocatorVersion: 'living-plan-v1', evidenceHash: 'two', syncFresh: true,
      resourceReceipts: [incomeReceipt], categories: [
        { categoryId: 'flex-a', supportedFlexibleCents: 200_000 },
        { categoryId: 'flex-b', supportedFlexibleCents: 200_000 },
      ],
    });

    expect(compareLivingPlanVersions({ prior: before, candidate: after, trigger: 'sync_evidence_changed' })).toMatchObject({
      outcome: 'material',
      changedCategoryIds: ['flex-a', 'flex-b'],
      reversible: true,
    });
  });

  it('treats a user-governed funding rhythm change as a material category change', () => {
    const before = projectLivingPlanCandidate({
      periodId: '2026-07', livingPercent: 80, allocatorVersion: 'living-plan-v2', evidenceHash: 'one', syncFresh: true,
      resourceReceipts: [incomeReceipt], categories: [{ categoryId: 'gifts', starterWeight: 1, fundingRhythm: 'monthly' }],
    }) as LivingPlanVersion;
    before.versionId = 'version-1';
    const after = projectLivingPlanCandidate({
      periodId: '2026-07', livingPercent: 80, allocatorVersion: 'living-plan-v2', evidenceHash: 'two', syncFresh: true,
      resourceReceipts: [incomeReceipt], categories: [{
        categoryId: 'gifts', starterWeight: 1, fundingRhythm: 'reserve', priorReserveCents: 30_000,
        expectedNeed: { amountCents: 80_000, dueMonth: '2026-12' },
      }],
    });

    expect(compareLivingPlanVersions({ prior: before, candidate: after, trigger: 'category_changed' })).toMatchObject({
      outcome: 'material',
      materialReasons: ['funding_policy_changed'],
      changedCategoryIds: ['gifts'],
      reversible: true,
    });
  });
});

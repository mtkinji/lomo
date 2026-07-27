import { projectCategoryForecast } from './moneyForecast';

describe('projectCategoryForecast', () => {
  const period = {
    periodStartIso: '2026-07-01',
    periodEndIso: '2026-07-31',
    todayIso: '2026-07-10',
    plannedCents: 100_000,
    spentCents: 20_000,
  } as const;

  it('keeps actual, expected pace, and paced projection distinct', () => {
    expect(projectCategoryForecast({ ...period, mode: 'paced' })).toEqual({
      mode: 'paced',
      claim: 'monthly_range',
      confidence: 'medium',
      expectedSpendCents: 32_258,
      projectedSpendCents: 62_000,
      projectionRangeLowCents: 55_800,
      projectionRangeHighCents: 68_200,
      projectedRemainingCents: 38_000,
      projectedOverageCents: 0,
      status: 'steady',
    });
  });

  it('uses expected-need coverage instead of straight-line pacing for a reserve', () => {
    expect(projectCategoryForecast({
      ...period,
      fundingRhythm: 'reserve',
      reserveAvailableCents: 35_000,
      fundingCoverage: {
        status: 'shortfall',
        dueMonth: '2026-12',
        needCents: 80_000,
        projectedAvailableCents: 75_000,
        shortfallCents: 5_000,
        requiredMonthlyContributionCents: 11_000,
        catchUpContributionCents: 1_000,
      },
    })).toEqual({
      mode: 'paced',
      claim: 'reserve_coverage',
      confidence: 'high',
      expectedSpendCents: 20_000,
      projectedSpendCents: 20_000,
      projectionRangeLowCents: 20_000,
      projectionRangeHighCents: 20_000,
      projectedRemainingCents: 35_000,
      projectedOverageCents: 0,
      status: 'watch',
      reserveCoverage: {
        status: 'shortfall',
        dueMonth: '2026-12',
        needCents: 80_000,
        projectedAvailableCents: 75_000,
        shortfallCents: 5_000,
        requiredMonthlyContributionCents: 11_000,
        catchUpContributionCents: 1_000,
      },
    });
  });

  it('keeps a reserve without an expected need at exposure-only confidence', () => {
    expect(projectCategoryForecast({
      ...period,
      fundingRhythm: 'reserve',
      reserveAvailableCents: 35_000,
      fundingCoverage: { status: 'none' },
    })).toMatchObject({
      claim: 'exposure',
      confidence: 'low',
      projectedSpendCents: 20_000,
      projectedRemainingCents: 35_000,
      status: 'steady',
    });
  });

  it('uses a manual projection without allowing it below already-posted spend', () => {
    expect(projectCategoryForecast({
      ...period,
      mode: 'manual',
      manualProjectedSpendCents: 15_000,
    }).projectedSpendCents).toBe(20_000);
  });

  it('adds a future scheduled amount without counting a due item after its due day', () => {
    const beforeDue = projectCategoryForecast({
      ...period,
      mode: 'scheduled',
      scheduledAmountCents: 70_000,
      scheduledDueDay: 20,
    });
    const afterDue = projectCategoryForecast({
      ...period,
      todayIso: '2026-07-25',
      spentCents: 72_000,
      mode: 'scheduled',
      scheduledAmountCents: 70_000,
      scheduledDueDay: 20,
    });

    expect(beforeDue.projectedSpendCents).toBe(90_000);
    expect(afterDue.projectedSpendCents).toBe(72_000);
  });

  it('reports over-plan risk from the projection rather than current spend', () => {
    expect(projectCategoryForecast({
      ...period,
      mode: 'manual',
      manualProjectedSpendCents: 125_000,
    })).toMatchObject({
      projectedOverageCents: 25_000,
      projectedRemainingCents: 0,
      status: 'over',
      confidence: 'high',
    });
  });
});

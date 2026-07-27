import {
  assessReserveFundingEvidence,
  projectCategoryFunding,
  projectReserveAvailabilityFromAnchor,
} from './categoryFunding';

describe('projectCategoryFunding', () => {
  it('resets monthly availability instead of carrying the prior reserve', () => {
    expect(projectCategoryFunding({
      rhythm: 'monthly',
      monthlyContributionCents: 20_000,
      priorReserveCents: 90_000,
      countedSpendCents: 5_000,
      periodId: '2026-08',
    })).toMatchObject({
      availableCents: 15_000,
      carriedInCents: 0,
      coverage: { status: 'none' },
    });
  });

  it('carries a reserve and subtracts only counted spend', () => {
    expect(projectCategoryFunding({
      rhythm: 'reserve',
      monthlyContributionCents: 10_000,
      priorReserveCents: 30_000,
      countedSpendCents: 5_000,
      periodId: '2026-08',
    })).toMatchObject({
      availableCents: 35_000,
      carriedInCents: 30_000,
      contributionCents: 10_000,
    });
  });

  it('forecasts an expected need from accumulated availability rather than monthly pace', () => {
    expect(projectCategoryFunding({
      rhythm: 'reserve',
      monthlyContributionCents: 10_000,
      priorReserveCents: 30_000,
      countedSpendCents: 5_000,
      periodId: '2026-08',
      expectedNeed: { amountCents: 80_000, dueMonth: '2026-12' },
    }).coverage).toEqual({
      status: 'shortfall',
      dueMonth: '2026-12',
      needCents: 80_000,
      projectedAvailableCents: 75_000,
      shortfallCents: 5_000,
      requiredMonthlyContributionCents: 11_000,
      catchUpContributionCents: 1_000,
    });
  });

  it('never fabricates a starting balance when the need is near', () => {
    const result = projectCategoryFunding({
      rhythm: 'reserve',
      monthlyContributionCents: 10_000,
      priorReserveCents: 0,
      countedSpendCents: 0,
      periodId: '2026-11',
      expectedNeed: { amountCents: 80_000, dueMonth: '2026-12' },
    });

    expect(result.carriedInCents).toBe(0);
    expect(result.coverage).toMatchObject({
      status: 'shortfall',
      projectedAvailableCents: 20_000,
      shortfallCents: 60_000,
      requiredMonthlyContributionCents: 40_000,
      catchUpContributionCents: 30_000,
    });
  });
});

describe('assessReserveFundingEvidence', () => {
  it('keeps one completed-period spike exposure-only', () => {
    const periods = Array.from({ length: 12 }, (_, index) => ({
      periodId: `2025-${String(index + 1).padStart(2, '0')}`,
      spentCents: index === 11 ? 80_000 : 5_000,
    }));

    expect(assessReserveFundingEvidence(periods)).toMatchObject({
      posture: 'exposure_only',
      confidence: 'low',
      reason: 'single_concentration',
    });
  });

  it('suggests reserve only after repeated month-of-year concentration', () => {
    const periods = Array.from({ length: 24 }, (_, index) => {
      const month = (index % 12) + 1;
      const year = 2024 + Math.floor(index / 12);
      return {
        periodId: `${year}-${String(month).padStart(2, '0')}`,
        spentCents: month === 12 ? 80_000 : 5_000,
      };
    });

    expect(assessReserveFundingEvidence(periods)).toEqual({
      posture: 'suggest_reserve',
      confidence: 'high',
      reason: 'repeated_month_of_year_concentration',
      concentratedMonths: [12],
      completedPeriodCount: 24,
    });
  });
});

describe('projectReserveAvailabilityFromAnchor', () => {
  it('carries a known balance through each stable contribution and counted spend period', () => {
    expect(projectReserveAvailabilityFromAnchor({
      anchorPeriodId: '2026-06',
      anchorBalanceCents: 30_000,
      targetPeriodId: '2026-08',
      monthlyContributionCents: 10_000,
      countedSpendSinceAnchorCents: 5_000,
    })).toBe(55_000);
  });

  it('refuses to fabricate availability before the known balance anchor', () => {
    expect(projectReserveAvailabilityFromAnchor({
      anchorPeriodId: '2026-06',
      anchorBalanceCents: 30_000,
      targetPeriodId: '2026-05',
      monthlyContributionCents: 10_000,
      countedSpendSinceAnchorCents: 0,
    })).toBeNull();
  });
});

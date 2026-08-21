import { projectMonthlyCategoryCarry } from './monthlyPlanCarry';

describe('projectMonthlyCategoryCarry', () => {
  it('starts the boundary month at zero carry and sends its result into the next month', () => {
    const result = projectMonthlyCategoryCarry({
      startPeriodId: '2026-01',
      targetPeriodId: '2026-02',
      baseAmountCents: 40_000,
      periods: [
        { periodId: '2026-01', countedSpendCents: 30_000 },
        { periodId: '2026-02', countedSpendCents: 0 },
      ],
    });

    expect(result).toMatchObject({
      periodId: '2026-02',
      baseAmountCents: 40_000,
      priorCarryCents: 10_000,
      availableBeforeSpendCents: 50_000,
      endingCarryCents: 50_000,
    });
  });

  it('carries overspending forward as a signed deficit', () => {
    const result = projectMonthlyCategoryCarry({
      startPeriodId: '2026-07',
      targetPeriodId: '2026-08',
      baseAmountCents: 40_000,
      periods: [
        { periodId: '2026-07', countedSpendCents: 50_000 },
        { periodId: '2026-08', countedSpendCents: 0 },
      ],
    });

    expect(result.priorCarryCents).toBe(-10_000);
    expect(result.availableBeforeSpendCents).toBe(30_000);
    expect(result.endingCarryCents).toBe(30_000);
  });

  it('keeps cumulative positive and negative results instead of using only the previous surplus', () => {
    const result = projectMonthlyCategoryCarry({
      startPeriodId: '2026-01',
      targetPeriodId: '2026-04',
      baseAmountCents: 40_000,
      periods: [
        { periodId: '2026-01', countedSpendCents: 10_000 },
        { periodId: '2026-02', countedSpendCents: 70_000 },
        { periodId: '2026-03', countedSpendCents: 20_000 },
        { periodId: '2026-04', countedSpendCents: 0 },
      ],
    });

    expect(result.priorCarryCents).toBe(20_000);
    expect(result.availableBeforeSpendCents).toBe(60_000);
  });

  it('shows zero spendable room while preserving a deficit larger than the base amount', () => {
    const result = projectMonthlyCategoryCarry({
      startPeriodId: '2026-07',
      targetPeriodId: '2026-08',
      baseAmountCents: 40_000,
      periods: [
        { periodId: '2026-07', countedSpendCents: 100_000 },
        { periodId: '2026-08', countedSpendCents: 0 },
      ],
    });

    expect(result.priorCarryCents).toBe(-60_000);
    expect(result.availableBeforeSpendCents).toBe(0);
    expect(result.recoveryDeficitCents).toBe(20_000);
    expect(result.endingCarryCents).toBe(-20_000);
  });

  it('adds a category-bound one-time amount only to its selected month', () => {
    const august = projectMonthlyCategoryCarry({
      startPeriodId: '2026-08',
      targetPeriodId: '2026-08',
      baseAmountCents: 40_000,
      periods: [{ periodId: '2026-08', countedSpendCents: 214_000, additionCents: 174_000 }],
    });

    expect(august).toMatchObject({
      priorCarryCents: 0,
      additionCents: 174_000,
      availableBeforeSpendCents: 214_000,
      endingCarryCents: 0,
    });
  });

  it('starts fresh at an explicit reset boundary without rewriting earlier activity', () => {
    const result = projectMonthlyCategoryCarry({
      startPeriodId: '2026-01',
      targetPeriodId: '2026-04',
      baseAmountCents: 40_000,
      resetPeriodIds: ['2026-04'],
      periods: [
        { periodId: '2026-01', countedSpendCents: 10_000 },
        { periodId: '2026-02', countedSpendCents: 10_000 },
        { periodId: '2026-03', countedSpendCents: 10_000 },
        { periodId: '2026-04', countedSpendCents: 0 },
      ],
    });

    expect(result.priorCarryCents).toBe(0);
    expect(result.availableBeforeSpendCents).toBe(40_000);
    expect(result.endingCarryCents).toBe(40_000);
  });
});

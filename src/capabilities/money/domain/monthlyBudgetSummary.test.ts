import type { MoneyPlanAudit } from './moneyPlanAudit';
import type { MoneyPlanLimitAnswer } from './moneyPlanLimitAnswer';
import { projectMonthlyBudgetSummary } from './monthlyBudgetSummary';

describe('projectMonthlyBudgetSummary', () => {
  it('keeps actual income and spending separate from the plan comparison', () => {
    const result = projectMonthlyBudgetSummary({
      audit: audit({ incomeReceivedCents: 1_106_456, totalSpendingCents: 1_043_768 }),
      monthlyPlan: { committedPlanCents: 400_000, flexiblePlanCents: 400_000 },
      answer: answer({
        resourceBasisCents: 1_106_456,
        livingPercent: 70,
        livingLimitCents: 774_519,
        protectedPlanCents: 400_000,
        protectedOverageCents: 21_253,
        countedFlexibleSpendCents: 622_515,
      }),
    });

    expect(result).toEqual({
      incomeReceivedCents: 1_106_456,
      totalSpendingCents: 1_043_768,
      spendingIncomePercent: 94.3,
      planTargetCents: 774_519,
      planTargetPercent: 70,
      planTargetBasisCents: 1_106_456,
      committedPlanCents: 400_000,
      flexiblePlanCents: 400_000,
      monthlyPlanCents: 800_000,
      planVsTarget: { status: 'above', amountCents: 25_481 },
      planCoveredSpendingCents: 1_043_768,
      savedResourceSpendingCents: 0,
      outsidePlanSpendingCents: 0,
      planAccountedCents: 1_043_768,
      planResult: { status: 'over', amountCents: 243_768 },
      spendingOutsideCurrentPlanCents: 0,
    });
  });

  it('does not compare saved-money or outside-plan spending against the monthly plan', () => {
    const result = projectMonthlyBudgetSummary({
      audit: audit({
        incomeReceivedCents: 120_000,
        totalSpendingCents: 100_000,
        savedResourceSpendingCents: 20_000,
        outsidePlanSpendingCents: 10_000,
      }),
      monthlyPlan: { committedPlanCents: 20_000, flexiblePlanCents: 60_000 },
      answer: answer({ protectedPlanCents: 0, protectedOverageCents: 0, countedFlexibleSpendCents: 70_000 }),
    });

    expect(result.totalSpendingCents).toBe(100_000);
    expect(result.planCoveredSpendingCents).toBe(70_000);
    expect(result.savedResourceSpendingCents).toBe(20_000);
    expect(result.outsidePlanSpendingCents).toBe(10_000);
    expect(result.planAccountedCents).toBe(70_000);
    expect(result.spendingOutsideCurrentPlanCents).toBe(30_000);
    expect(result.planResult).toEqual({ status: 'left', amountCents: 10_000 });
  });

  it('keeps the plan result unavailable when the supported plan arithmetic is unavailable', () => {
    const result = projectMonthlyBudgetSummary({
      audit: audit({ incomeReceivedCents: 50_000, totalSpendingCents: 30_000 }),
      monthlyPlan: { committedPlanCents: 20_000, flexiblePlanCents: 60_000 },
      answer: null,
    });

    expect(result.planAccountedCents).toBeNull();
    expect(result.planResult).toBeNull();
    expect(result.planTargetCents).toBeNull();
    expect(result.planVsTarget).toBeNull();
  });
});

function audit(overrides: Partial<MoneyPlanAudit>): MoneyPlanAudit {
  return {
    protectedCategories: [], committedTransactionIds: [], committedSpendingCents: 0,
    flexibleTransactionIds: [], flexibleSpendingCents: 0, unclearTransactionIds: [], unclearSpendingCents: 0,
    outsidePlanTransactionIds: [], outsidePlanSpendingCents: 0, nonSpendingTransactionIds: [], nonSpendingCents: 0,
    incomeReceivedCents: 0, totalSpendingCents: 0, savedResourceSpendingCents: 0, countedFlexibleSpendCents: 0,
    notCountedTransactionIds: [], notCountedCents: 0, isComplete: true, ...overrides,
  };
}

function answer(overrides: Partial<MoneyPlanLimitAnswer['facts']>): MoneyPlanLimitAnswer {
  return {
    state: 'supported', headlineAmountCents: 0, limitLine: null, qualification: null, recoveryAction: null,
    reviewTransactionIds: [],
    facts: {
      periodId: '2026-07', planVersionId: 'plan', policyVersion: 'money-plan-limit-v3', resourceBasisCents: 100_000,
      resourceBasisKind: 'detected_income', resourceBasisUpdatedAtIso: null, livingPercent: 70, livingLimitCents: 80_000,
      protectedPlanCents: 0, protectedOverageCents: 0, flexibleCapacityCents: 80_000,
      countedFlexibleSpendCents: 0, flexibleRoomCents: 80_000, flexibleRoomLowCents: 80_000,
      flexibleRoomHighCents: 80_000, unresolvedInScopeCents: 0, plannedCents: 80_000, unassignedCents: 0,
      overLimitCents: 0, freshness: 'fresh', confidence: 'supported', qualificationReason: null, ...overrides,
    },
  };
}

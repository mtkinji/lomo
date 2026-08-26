import type { MonthlyHouseholdPlanStatement } from '../data/moneySnapshot';
import type { MoneyPlanAudit } from './moneyPlanAudit';
import type { MoneyPlanLimitAnswer } from './moneyPlanLimitAnswer';

export type MonthlyBudgetSummary = {
  incomeReceivedCents: number;
  totalSpendingCents: number;
  spendingIncomePercent: number | null;
  planTargetCents: number | null;
  planTargetPercent: number | null;
  planTargetBasisCents: number | null;
  committedPlanCents: number;
  flexiblePlanCents: number;
  monthlyPlanCents: number;
  planVsTarget: { status: 'below' | 'above' | 'even'; amountCents: number } | null;
  planCoveredSpendingCents: number;
  savedResourceSpendingCents: number;
  outsidePlanSpendingCents: number;
  planAccountedCents: number | null;
  planResult: { status: 'left' | 'over' | 'even'; amountCents: number } | null;
  spendingOutsideCurrentPlanCents: number;
};

export function projectMonthlyBudgetSummary(input: {
  audit: MoneyPlanAudit;
  monthlyPlan: Pick<MonthlyHouseholdPlanStatement, 'committedPlanCents' | 'flexiblePlanCents'>;
  answer: MoneyPlanLimitAnswer | null;
}): MonthlyBudgetSummary {
  const planAccountedCents = projectPlanAccountedCents(input.answer);
  const incomeReceivedCents = Math.max(0, Math.round(input.audit.incomeReceivedCents));
  const totalSpendingCents = Math.max(0, Math.round(input.audit.totalSpendingCents));
  const committedPlanCents = Math.max(0, Math.round(input.monthlyPlan.committedPlanCents));
  const flexiblePlanCents = Math.max(0, Math.round(input.monthlyPlan.flexiblePlanCents));
  const monthlyPlanCents = committedPlanCents + flexiblePlanCents;
  const savedResourceSpendingCents = Math.max(0, Math.round(input.audit.savedResourceSpendingCents));
  const outsidePlanSpendingCents = Math.max(0, Math.round(input.audit.outsidePlanSpendingCents));
  const planCoveredSpendingCents = Math.max(
    0,
    totalSpendingCents - savedResourceSpendingCents - outsidePlanSpendingCents,
  );
  const planTargetCents = input.answer?.facts.livingLimitCents == null
    ? null
    : Math.max(0, Math.round(input.answer.facts.livingLimitCents));
  return {
    incomeReceivedCents,
    totalSpendingCents,
    spendingIncomePercent: incomeReceivedCents > 0
      ? Math.round(totalSpendingCents / incomeReceivedCents * 1_000) / 10
      : null,
    planTargetCents,
    planTargetPercent: input.answer?.facts.livingPercent ?? null,
    planTargetBasisCents: input.answer?.facts.resourceBasisCents == null
      ? null
      : Math.max(0, Math.round(input.answer.facts.resourceBasisCents)),
    committedPlanCents,
    flexiblePlanCents,
    monthlyPlanCents,
    planVsTarget: planTargetCents == null
      ? null
      : {
          status: monthlyPlanCents > planTargetCents
            ? 'above'
            : monthlyPlanCents < planTargetCents
              ? 'below'
              : 'even',
          amountCents: Math.abs(monthlyPlanCents - planTargetCents),
        },
    planCoveredSpendingCents,
    savedResourceSpendingCents,
    outsidePlanSpendingCents,
    planAccountedCents,
    planResult: planAccountedCents == null
      ? null
      : {
          status: planAccountedCents > monthlyPlanCents
            ? 'over'
            : planAccountedCents < monthlyPlanCents
              ? 'left'
              : 'even',
          amountCents: Math.abs(monthlyPlanCents - planAccountedCents),
        },
    spendingOutsideCurrentPlanCents: Math.max(0, Math.round(
      savedResourceSpendingCents + outsidePlanSpendingCents,
    )),
  };
}

function projectPlanAccountedCents(answer: MoneyPlanLimitAnswer | null): number | null {
  if (!answer) return null;
  const { countedFlexibleSpendCents, protectedPlanCents, protectedOverageCents } = answer.facts;
  if (countedFlexibleSpendCents == null || protectedPlanCents == null) return null;
  return Math.max(0, Math.round(
    protectedPlanCents + protectedOverageCents + countedFlexibleSpendCents,
  ));
}

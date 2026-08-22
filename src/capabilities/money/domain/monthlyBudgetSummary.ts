import type { MonthlyHouseholdPlanStatement } from '../data/moneySnapshot';
import type { MoneyPlanAudit } from './moneyPlanAudit';
import type { MoneyPlanLimitAnswer } from './moneyPlanLimitAnswer';

export type MonthlyBudgetSummary = {
  incomeReceivedCents: number;
  totalSpendingCents: number;
  monthlyPlanCents: number;
  planAccountedCents: number | null;
  planResult: { status: 'left' | 'over' | 'even'; amountCents: number } | null;
  spendingOutsideCurrentPlanCents: number;
};

export function projectMonthlyBudgetSummary(input: {
  audit: MoneyPlanAudit;
  monthlyPlan: Pick<MonthlyHouseholdPlanStatement, 'regularPlanCents' | 'plannedOutflowCents'>;
  answer: MoneyPlanLimitAnswer | null;
}): MonthlyBudgetSummary {
  const planAccountedCents = projectPlanAccountedCents(input.answer);
  const monthlyPlanCents = Math.max(0, Math.round(input.monthlyPlan.plannedOutflowCents));
  return {
    incomeReceivedCents: Math.max(0, Math.round(input.audit.incomeReceivedCents)),
    totalSpendingCents: Math.max(0, Math.round(input.audit.totalSpendingCents)),
    monthlyPlanCents,
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
      input.audit.savedResourceSpendingCents + input.audit.outsidePlanSpendingCents,
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

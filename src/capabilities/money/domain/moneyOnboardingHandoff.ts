export type MoneyOnboardingHandoffReceipt = {
  createdAtIso: string;
  selectedPlanCents: number;
  goalId: string | null;
  goalTitle: string | null;
  savingsCents: number;
  todoCount: number;
};

export type MoneyOnboardingHandoffState = MoneyOnboardingHandoffReceipt & {
  budgetGuideAcknowledgedAt: string | null;
  followThroughGuideAcknowledgedAt: string | null;
};

export type MoneyOnboardingHandoffGuide = 'budgets' | 'follow_through' | null;

export function getMoneyOnboardingHandoffGuide({
  exploredBudgetThisVisit,
  handoff,
  isFreshCompletion,
}: {
  exploredBudgetThisVisit: boolean;
  handoff: MoneyOnboardingHandoffState | null;
  isFreshCompletion: boolean;
}): MoneyOnboardingHandoffGuide {
  if (!handoff) return null;
  if (!handoff.budgetGuideAcknowledgedAt) return 'budgets';
  if (
    handoff.goalId
    && !handoff.followThroughGuideAcknowledgedAt
    && (exploredBudgetThisVisit || !isFreshCompletion)
  ) {
    return 'follow_through';
  }
  return null;
}

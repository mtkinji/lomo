import { getMoneyOnboardingHandoffGuide, type MoneyOnboardingHandoffState } from './moneyOnboardingHandoff';

const receipt: MoneyOnboardingHandoffState = {
  createdAtIso: '2026-08-21T18:00:00.000Z',
  selectedPlanCents: 617_500,
  goalId: 'goal-money-onboarding-spend-less-v1',
  goalTitle: 'Spend $205 less each month',
  savingsCents: 20_500,
  todoCount: 2,
  budgetGuideAcknowledgedAt: null,
  followThroughGuideAcknowledgedAt: null,
};

describe('Money onboarding handoff guide', () => {
  it('shows the budget-ready guide first', () => {
    expect(getMoneyOnboardingHandoffGuide({
      exploredBudgetThisVisit: false,
      handoff: receipt,
      isFreshCompletion: true,
    })).toBe('budgets');
  });

  it('waits to reveal follow-through until the fresh Budget visit includes exploration', () => {
    const acknowledged = { ...receipt, budgetGuideAcknowledgedAt: '2026-08-21T18:01:00.000Z' };

    expect(getMoneyOnboardingHandoffGuide({
      exploredBudgetThisVisit: false,
      handoff: acknowledged,
      isFreshCompletion: true,
    })).toBeNull();
    expect(getMoneyOnboardingHandoffGuide({
      exploredBudgetThisVisit: true,
      handoff: acknowledged,
      isFreshCompletion: true,
    })).toBe('follow_through');
  });

  it('reveals pending follow-through on a later Money visit', () => {
    expect(getMoneyOnboardingHandoffGuide({
      exploredBudgetThisVisit: false,
      handoff: { ...receipt, budgetGuideAcknowledgedAt: '2026-08-21T18:01:00.000Z' },
      isFreshCompletion: false,
    })).toBe('follow_through');
  });

  it('does not invent follow-through for a plan without a Goal or replay an acknowledged guide', () => {
    expect(getMoneyOnboardingHandoffGuide({
      exploredBudgetThisVisit: true,
      handoff: { ...receipt, goalId: null, goalTitle: null, budgetGuideAcknowledgedAt: '2026-08-21T18:01:00.000Z' },
      isFreshCompletion: true,
    })).toBeNull();
    expect(getMoneyOnboardingHandoffGuide({
      exploredBudgetThisVisit: true,
      handoff: {
        ...receipt,
        budgetGuideAcknowledgedAt: '2026-08-21T18:01:00.000Z',
        followThroughGuideAcknowledgedAt: '2026-08-21T18:02:00.000Z',
      },
      isFreshCompletion: false,
    })).toBeNull();
  });
});

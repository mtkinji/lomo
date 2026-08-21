import { buildMoneyOnboardingFollowThrough } from './moneyOnboardingFollowThrough';

describe('Money onboarding follow-through', () => {
  const createdAtIso = '2026-08-21T18:00:00.000Z';

  it('turns an accepted spend-less target into one goal and two concrete next steps', () => {
    const result = buildMoneyOnboardingFollowThrough({
      createdAtIso,
      evidenceScope: 'household',
      observedMonthlySpendingCents: 638_000,
      selectedPlanCents: 617_500,
    });

    expect(result).toMatchObject({
      savingsCents: 20_500,
      goal: {
        id: 'goal-money-onboarding-spend-less-v1',
        title: 'Spend $205 less each month',
        status: 'in_progress',
      },
    });
    expect(result.activities).toHaveLength(2);
    expect(result.activities.map(({ id, goalId, title, reminderAt }) => ({ id, goalId, title, reminderAt }))).toEqual([
      {
        id: 'activity-money-onboarding-review-recurring-v1',
        goalId: 'goal-money-onboarding-spend-less-v1',
        title: 'Review recurring services for one to stop or downgrade',
        reminderAt: null,
      },
      {
        id: 'activity-money-onboarding-lower-cost-food-week-v1',
        goalId: 'goal-money-onboarding-spend-less-v1',
        title: 'Plan one lower-cost week of meals',
        reminderAt: null,
      },
    ]);
  });

  it('scopes a partial-evidence goal without claiming a whole-household result', () => {
    const result = buildMoneyOnboardingFollowThrough({
      createdAtIso,
      evidenceScope: 'connected_accounts',
      observedMonthlySpendingCents: 638_000,
      selectedPlanCents: 617_500,
    });

    expect(result.goal.description).toContain('in the accounts you connected');
    expect(result.goal.description).not.toContain('across your household');
  });

  it('keeps the spend-less commitment truthful when the selected plan is not below observed spending', () => {
    const result = buildMoneyOnboardingFollowThrough({
      createdAtIso,
      evidenceScope: 'household',
      observedMonthlySpendingCents: 638_000,
      selectedPlanCents: 665_000,
    });

    expect(result.savingsCents).toBe(0);
    expect(result.goal.title).toBe('Spend less each month');
    expect(result.goal.description).not.toContain('save $');
  });
});

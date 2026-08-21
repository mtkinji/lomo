import { buildMoneyOnboardingDemoBudget } from './moneyOnboardingDemoBudget';

describe('buildMoneyOnboardingDemoBudget', () => {
  it('projects the connected-household rehearsal into the plan the handoff announces', () => {
    const snapshot = buildMoneyOnboardingDemoBudget(new Date('2026-08-21T18:00:00.000Z'));

    expect(snapshot.totals.plannedCents).toBe(617_500);
    expect(snapshot.monthlyPlan).toMatchObject({
      regularPlanCents: 617_500,
      committedPlanCents: 478_000,
      flexiblePlanCents: 139_500,
    });
    expect(snapshot.categories.filter((category) => category.planRole === 'protected')
      .reduce((sum, category) => sum + category.plannedCents, 0)).toBe(478_000);
    expect(snapshot.categories.filter((category) => category.planRole !== 'protected')
      .reduce((sum, category) => sum + category.plannedCents, 0)).toBe(139_500);
    expect(snapshot.accounts).toHaveLength(3);
    expect(snapshot.transactions.length).toBeGreaterThan(5);
  });
});

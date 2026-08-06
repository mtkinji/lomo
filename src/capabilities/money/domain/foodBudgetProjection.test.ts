import { projectFoodBudget } from './foodBudgetProjection';

describe('Food budget projection', () => {
  const input = { authorized: true, selectedCategoryIds: ['food'], period: { startsOn: '2026-08-01', endsOn: '2026-08-31' }, categories: [{ id: 'food', plannedCents: 90000, spentCents: 32000 }, { id: 'home', plannedCents: 100000, spentCents: 50000 }], forecastRangeCents: { min: 50000, max: 68000 }, sourcePlanVersionId: 'money-plan-v4', observedAt: '2026-08-05T12:00:00.000Z', now: '2026-08-05T13:00:00.000Z', maxAgeSeconds: 7200 };
  it('projects only selected Food categories with source version and freshness', () => {
    expect(projectFoodBudget(input)).toEqual({ state: 'current', categoryIds: ['food'], period: input.period, plannedCents: 90000, spentCents: 32000, remainingCents: 58000, forecastRangeCents: input.forecastRangeCents, sourcePlanVersionId: 'money-plan-v4', observedAt: input.observedAt, freshUntil: '2026-08-05T14:00:00.000Z' });
    expect(projectFoodBudget(input)).not.toHaveProperty('cashSafeCents');
  });
  it('rejects unauthorized evidence and never labels stale data current', () => {
    expect(projectFoodBudget({ ...input, authorized: false })).toMatchObject({ state: 'unauthorized', plannedCents: null, remainingCents: null });
    expect(projectFoodBudget({ ...input, now: '2026-08-05T15:00:01.000Z' })).toMatchObject({ state: 'stale', remainingCents: 58000 });
  });
});

import {
  FOOD_ONBOARDING_MOMENTS,
  createFoodOnboardingState,
  reduceFoodOnboarding,
} from './foodOnboardingModel';

describe('Food onboarding model', () => {
  it('teaches the connected meal loop in the accepted order', () => {
    expect(FOOD_ONBOARDING_MOMENTS.map((moment) => moment.id)).toEqual([
      'choose-together',
      'follow-through',
    ]);
    expect(FOOD_ONBOARDING_MOMENTS.map((moment) => moment.title)).toEqual([
      'Find meals everyone can get behind.',
      'Plan it. Shop it. Cook it.',
    ]);
    expect(FOOD_ONBOARDING_MOMENTS[0].body).toContain('If you share a Household');
    expect(FOOD_ONBOARDING_MOMENTS[1].body).toContain('keep your place while you cook');
  });

  it('moves manually and resumes at an exact checkpoint', () => {
    const resumed = createFoodOnboardingState('follow-through');
    expect(resumed.index).toBe(1);
    expect(reduceFoodOnboarding(resumed, { type: 'back' }).index).toBe(0);
    expect(reduceFoodOnboarding(resumed, { type: 'next' }).index).toBe(1);
  });
});

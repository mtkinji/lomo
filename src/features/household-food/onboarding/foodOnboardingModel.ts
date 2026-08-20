export type FoodOnboardingMomentId =
  | 'choose-together'
  | 'follow-through';

export type FoodOnboardingMoment = {
  id: FoodOnboardingMomentId;
  title: string;
  body: string;
  illustrationLabel: string;
};

export const FOOD_ONBOARDING_MOMENTS: readonly FoodOnboardingMoment[] = [
  {
    id: 'choose-together',
    title: 'Find meals everyone can get behind.',
    body: 'Pick from Kwilt or add your own. If you share a Household, everyone can add ideas and vote.',
    illustrationLabel: 'A family gathering and voting on meal ideas',
  },
  {
    id: 'follow-through',
    title: 'Plan it. Shop it. Cook it.',
    body: 'Turn the meals you choose into one shared ingredient list, then keep your place while you cook.',
    illustrationLabel: 'A meal moving from recipe to ingredient list to cooking',
  },
];

export type FoodOnboardingState = { index: number };
export type FoodOnboardingAction = { type: 'next' | 'back' };

export function createFoodOnboardingState(
  checkpoint?: FoodOnboardingMomentId | null,
): FoodOnboardingState {
  const index = checkpoint
    ? FOOD_ONBOARDING_MOMENTS.findIndex((moment) => moment.id === checkpoint)
    : 0;
  return { index: index >= 0 ? index : 0 };
}

export function reduceFoodOnboarding(
  state: FoodOnboardingState,
  action: FoodOnboardingAction,
): FoodOnboardingState {
  const offset = action.type === 'next' ? 1 : -1;
  return {
    index: Math.max(0, Math.min(FOOD_ONBOARDING_MOMENTS.length - 1, state.index + offset)),
  };
}

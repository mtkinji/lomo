import { capabilityNavigationLabel } from './capabilityNavigationContract';

describe('capability navigation copy', () => {
  test.each([
    ['screen-time', 'Screen Time'],
    ['meal-planning', 'Meal Plan'],
    ['account-settings', 'Settings'],
    ['todos', 'To-dos'],
    ['recipes', 'Recipes'],
  ] as const)('uses the product-facing label for %s', (capabilityId, label) => {
    expect(capabilityNavigationLabel(capabilityId)).toBe(label);
  });
});

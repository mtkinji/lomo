import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { useHouseholdMealPreferencesStore } from '../../../features/household-food/runtime/useHouseholdMealPreferencesStore';
import { recipeContractFixture, recipeVersionContractFixture } from '../domain/recipeContractFixtures';
import { AddToMealPlanSheet } from './AddToMealPlanSheet';

jest.mock('../../../ui/BottomDrawer', () => {
  const { View } = require('react-native');
  return { BottomDrawer: ({ visible, children }: any) => visible ? <View>{children}</View> : null };
});

jest.mock('../../meal-planning/data/mealPlanningRepository', () => ({
  createMealPlanningRepository: () => ({ list: jest.fn().mockResolvedValue([]) }),
}));

const projection = {
  recipe: recipeContractFixture(),
  currentVersion: {
    ...recipeVersionContractFixture(),
    ingredients: recipeVersionContractFixture().ingredients.map((line, index) => index === 0
      ? { ...line, originalText: '1 cup peanuts', ingredientConcept: 'peanut', parseConfidence: 1 }
      : line),
  },
};

describe('Add to Meal Plan household fit', () => {
  beforeEach(() => {
    useHouseholdMealPreferencesStore.setState({
      userId: 'user', status: 'ready', error: null,
      projection: {
        householdId: 'household', setupState: 'completed', usualDinerPersonIds: ['adult', 'child'],
        members: [
          { id: 'member-adult', personId: 'adult', displayName: 'Blair', kind: 'adult', role: 'owner' },
          { id: 'member-child', personId: 'child', displayName: 'Avery', kind: 'dependent', role: 'child' },
        ],
        foodNeeds: [{ id: 'need', personId: 'child', kind: 'must_avoid', ingredientConcept: 'peanut', displayLabel: 'Peanuts' }],
      },
    });
  });

  it('keeps the normal drawer reductive until recorded evidence conflicts', async () => {
    const screen = render(<AddToMealPlanSheet visible recipe={projection} defaultServings={4} onClose={jest.fn()} onAdded={jest.fn()} />);
    await waitFor(() => expect(screen.getByText("Peanuts conflict with Avery's food needs.")).toBeTruthy());

    fireEvent.press(screen.getByText('Make for everyone else'));
    expect(screen.getByText('Avery still needs a meal.')).toBeTruthy();
    expect(screen.getByText('Add for 1')).toBeTruthy();
    fireEvent.press(screen.getByText('Not eating this time'));
    expect(screen.queryByText(/safe|allergy-safe|compatible/i)).toBeNull();
  });

  it('shows not checked when structured ingredient evidence is incomplete', async () => {
    const incomplete = {
      ...projection,
      currentVersion: {
        ...projection.currentVersion,
        ingredients: projection.currentVersion.ingredients.map((line, index) => index === 0 ? { ...line, ingredientConcept: null } : line),
      },
    };
    const screen = render(<AddToMealPlanSheet visible recipe={incomplete} defaultServings={4} onClose={jest.fn()} onAdded={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('Not checked against food needs.')).toBeTruthy());
  });

  it('uses the numeric household default even when only some diners have profiles', async () => {
    const screen = render(<AddToMealPlanSheet visible recipe={projection} defaultServings={6} onClose={jest.fn()} onAdded={jest.fn()} />);
    await waitFor(() => expect(screen.getByText('6')).toBeTruthy());
  });
});

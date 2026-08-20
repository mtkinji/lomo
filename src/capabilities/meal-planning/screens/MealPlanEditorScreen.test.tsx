import { fireEvent, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../../../test/renderWithProviders';
import { recipeContractFixture, recipeVersionContractFixture } from '../../recipes/domain/recipeContractFixtures';
import { MealPlanEditorScreen } from './MealPlanEditorScreen';

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockList = jest.fn();
const mockGetHouseholdSnapshot = jest.fn();
const mockRecipes = [{
  recipe: recipeContractFixture(),
  currentVersion: recipeVersionContractFixture(),
}];

jest.mock('../data/mealPlanningRepository', () => ({
  createMealPlanningRepository: () => ({
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    list: (...args: unknown[]) => mockList(...args),
  }),
}));

jest.mock('../../../features/household/data/household', () => ({
  getHouseholdSnapshot: (...args: unknown[]) => mockGetHouseholdSnapshot(...args),
}));

jest.mock('../../../services/backend/supabaseClient', () => ({
  getSupabaseClient: () => ({}),
}));

jest.mock('../../recipes/runtime/useRecipeStore', () => ({
  useRecipeStore: (selector: (state: { recipes: unknown[] }) => unknown) => selector({ recipes: mockRecipes }),
}));

jest.mock('../../recipes/data/starterRecipeCatalog', () => ({
  buildRecipeLibraryInventory: (recipes: unknown[]) => recipes,
}));

jest.mock('../../groceries/data/foodStockRepository', () => ({
  createFoodStockRepository: () => ({ list: jest.fn().mockResolvedValue([]) }),
}));

jest.mock('../../../services/analytics/useAnalytics', () => ({
  useAnalytics: () => ({ capture: jest.fn() }),
}));

jest.mock('../../../store/useAppStore', () => ({
  useAppStore: (selector: (state: unknown) => unknown) => selector({ userProfile: null }),
}));

describe('MealPlanEditorScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockResolvedValue({ planId: 'plan-personal', version: 1, state: 'draft' });
    mockUpdate.mockResolvedValue({});
    mockList.mockResolvedValue([]);
    mockGetHouseholdSnapshot.mockResolvedValue({
      household: null,
      currentMembershipId: null,
      members: [],
      activations: [],
      grants: [],
    });
  });

  it('saves a first meal as a real personal Plan without requiring a Household', async () => {
    const replace = jest.fn();
    const screen = renderWithProviders(
      <MealPlanEditorScreen
        navigation={{ goBack: jest.fn(), replace } as never}
        route={{ key: 'editor', name: 'MealPlanEditor', params: { source: 'recipe_library' } }}
      />,
    );

    fireEvent.press(await screen.findByText("Grandma Ruth's Cake"));
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      horizon: { kind: 'next_shop', shopBy: null },
      candidates: [expect.objectContaining({ title: "Grandma Ruth's Cake" })],
    })));
    expect(mockCreate.mock.calls[0][0]).not.toHaveProperty('householdId');
    expect(replace).toHaveBeenCalledWith('NextMeals');
  });
});

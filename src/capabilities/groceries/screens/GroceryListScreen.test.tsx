import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Alert } from 'react-native';
import { GroceryListScreen } from './GroceryListScreen';
import { createGroceryRepository } from '../data/groceryRepository';
import { groceryEducation } from '../data/groceryEducation';
import { reconcileGroceryOfflineQueue } from '../data/groceryOfflineQueue';

const mockOpenMenu = jest.fn();
let mockCapabilityMenuOpen = false;
let mockScreenFocused = true;
let mockCountryCode: string | null = 'US';
const mockEnqueue = jest.fn();
const mockAddItem = jest.fn();
const mockReadOnlineShoppingPreferences = jest.fn();
const mockReadPreferredStore = jest.fn();
const mockRuntimePolicies = jest.fn();
const mockBuildAffiliateProductSearch = jest.fn();
const mockOpenAffiliateProductSearch = jest.fn();
const mockAffiliateLinkDisclosure = jest.fn();
let mockMealPlans: Array<Record<string, unknown>> = [];
let mockRecipes: unknown[] = [];

type MockPageHeaderProps = {
  title: string;
  onPressMenu?: () => void;
  onPressBack?: () => void;
  moreMenu?: ReactNode;
  rightElement?: ReactNode;
};

type MockButtonProps = {
  children?: ReactNode;
  variant?: string;
  disabled?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
};

jest.mock('../data/groceryRepository', () => ({ createGroceryRepository: jest.fn() }));
jest.mock('../data/onlineShoppingPreferencesRepository', () => ({
  onlineShoppingPreferencesRepository: { read: (...args: unknown[]) => mockReadOnlineShoppingPreferences(...args) },
}));
jest.mock('../data/preferredGroceryStore', () => ({
  preferredGroceryStore: { read: (...args: unknown[]) => mockReadPreferredStore(...args) },
}));
jest.mock('../providers/affiliateRetailerProvider', () => ({
  buildApprovedAffiliateProductSearch: (...args: unknown[]) => mockBuildAffiliateProductSearch(...args),
  getAffiliateRetailerLinkDisclosure: (...args: unknown[]) => mockAffiliateLinkDisclosure(...args),
  getOnlineRetailerRuntimePolicies: (...args: unknown[]) => mockRuntimePolicies(...args),
  openAffiliateProductSearch: (...args: unknown[]) => mockOpenAffiliateProductSearch(...args),
}));
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => mockScreenFocused,
}));
jest.mock('expo-localization', () => ({
  getLocales: () => [{ regionCode: mockCountryCode }],
}));
jest.mock('../data/groceryEducation', () => ({
  groceryEducation: {
    hasSeenAlreadyHave: jest.fn(),
    hasStartedCartFlow: jest.fn(),
    markAlreadyHaveSeen: jest.fn(),
    markCartFlowStarted: jest.fn(),
  },
}));
jest.mock('../data/groceryCache', () => ({
  groceryCache: { read: jest.fn().mockResolvedValue([]), write: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../data/groceryOfflineQueue', () => ({
  applyQueuedGroceryStates: (lists: unknown) => lists,
  groceryOfflineQueue: { read: jest.fn().mockResolvedValue([]), enqueue: mockEnqueue },
  reconcileGroceryOfflineQueue: jest.fn(async ({ lists }: { lists: unknown[] }) => ({
    lists,
    pendingCount: 0,
    interrupted: false,
  })),
  shouldStackGroceryItemLayout: () => false,
}));
jest.mock('../../../store/useAppStore', () => ({
  useAppStore: (selector: (state: { authIdentity: { userId: string } }) => unknown) =>
    selector({ authIdentity: { userId: 'user-1' } }),
}));
jest.mock('../../../navigation/CapabilityShellContext', () => ({
  useCapabilityShell: () => ({ openMenu: mockOpenMenu }),
}));
jest.mock('../../../navigation/CapabilityMenuStateContext', () => ({
  useCapabilityMenuOpen: () => mockCapabilityMenuOpen,
}));
jest.mock('../../../services/analytics/useAnalytics', () => ({
  useAnalytics: () => ({ capture: jest.fn() }),
}));
jest.mock('../../../features/activities/QuickAddDock', () => {
  const { Pressable, TextInput, View } = require('react-native');
  return {
    QuickAddDock: ({
      isFocused,
      value,
      onChangeText,
      onSubmit,
      inputAccessibilityLabel,
      submitAccessibilityLabel,
      showCollapsedTrigger,
      showLeadingAffordance,
      showAiActions,
    }: {
      isFocused: boolean;
      value: string;
      onChangeText: (value: string) => void;
      onSubmit: () => void;
      inputAccessibilityLabel: string;
      submitAccessibilityLabel: string;
      showCollapsedTrigger: boolean;
      showLeadingAffordance: boolean;
      showAiActions: boolean;
    }) => isFocused ? (
      <View
        testID="grocery-quick-add-composer"
        accessibilityValue={{
          text: JSON.stringify({ showCollapsedTrigger, showLeadingAffordance, showAiActions }),
        }}
      >
        <TextInput accessibilityLabel={inputAccessibilityLabel} value={value} onChangeText={onChangeText} />
        <Pressable accessibilityRole="button" accessibilityLabel={submitAccessibilityLabel} onPress={onSubmit} />
      </View>
    ) : null,
  };
});
jest.mock('../../recipes/runtime/useRecipeStore', () => ({
  useRecipeStore: (selector: (state: { recipes: unknown[] }) => unknown) => selector({ recipes: mockRecipes }),
}));
jest.mock('../../recipes/data/starterRecipeCatalog', () => ({
  buildRecipeLibraryInventory: (recipes: unknown[]) => recipes,
}));
jest.mock('../../meal-planning/data/mealPlanningRepository', () => ({
  createMealPlanningRepository: () => ({
    list: jest.fn(() => Promise.resolve(mockMealPlans)),
  }),
}));
jest.mock('../../../ui/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('../../../ui/Coachmark', () => {
  const { Pressable, Text, View } = require('react-native');
  return {
    Coachmark: ({ visible, title, body, onAction }: {
      visible: boolean;
      title?: ReactNode;
      body: ReactNode;
      onAction?: (actionId: string) => void;
    }) => visible ? (
      <View testID="grocery-already-have-coachmark">
        {title}
        {body}
        <Pressable accessibilityRole="button" accessibilityLabel="Got it" onPress={() => onAction?.('dismiss')}>
          <Text>Got it</Text>
        </Pressable>
      </View>
    ) : null,
  };
});
jest.mock('../../../ui/layout/PageHeader', () => {
  const { Pressable, Text } = require('react-native');
  return {
    PageHeader: ({ title, onPressMenu, onPressBack, moreMenu, rightElement }: MockPageHeaderProps) => (
      <>
        <Text>{title}</Text>
        {onPressMenu ? <Pressable accessibilityLabel="Open navigation menu" onPress={onPressMenu} /> : null}
        {onPressBack ? <Pressable accessibilityLabel={`Go back from ${title}`} onPress={onPressBack} /> : null}
        {moreMenu}
        {rightElement}
      </>
    ),
  };
});
jest.mock('../../../ui/layout/BottomDrawerHeader', () => ({
  BottomDrawerHeader: () => null,
}));
jest.mock('../../../ui/BottomDrawer', () => ({
  BottomDrawer: ({ visible, children }: { visible: boolean; children: ReactNode }) =>
    visible ? children : null,
}));
jest.mock('../../../ui/Button', () => {
  const { Pressable, Text } = require('react-native');
  return {
    Button: ({ children, variant = 'default', testID, ...props }: MockButtonProps) => (
      <Pressable
        {...props}
        testID={testID ?? (typeof children === 'string' ? `button-${children}` : undefined)}
        accessibilityValue={{ text: variant }}
      >
        <Text>{children}</Text>
      </Pressable>
    ),
    IconButton: ({ children, ...props }: MockButtonProps) => (
      <Pressable {...props}>{children}</Pressable>
    ),
  };
});
jest.mock('../components/StoreOpportunityCaptureSheet', () => ({ StoreOpportunityCaptureSheet: () => null }));
jest.mock('../components/GroceryItemProvenanceSheet', () => ({ GroceryItemProvenanceSheet: () => null }));

const mockHasSeenAlreadyHave = groceryEducation.hasSeenAlreadyHave as jest.Mock;
const mockHasStartedCartFlow = groceryEducation.hasStartedCartFlow as jest.Mock;
const mockMarkAlreadyHaveSeen = groceryEducation.markAlreadyHaveSeen as jest.Mock;
const mockMarkCartFlowStarted = groceryEducation.markCartFlowStarted as jest.Mock;

describe('Grocery List primary capability', () => {
  const markReviewed = jest.fn().mockResolvedValue({ status: 'ready' });

  beforeEach(() => {
    jest.clearAllMocks();
    mockCapabilityMenuOpen = false;
    mockScreenFocused = true;
    mockCountryCode = 'US';
    mockHasSeenAlreadyHave.mockResolvedValue(false);
    mockHasStartedCartFlow.mockResolvedValue(false);
    mockMarkAlreadyHaveSeen.mockResolvedValue(undefined);
    mockMarkCartFlowStarted.mockResolvedValue(undefined);
    (reconcileGroceryOfflineQueue as jest.Mock).mockImplementation(async ({ lists }: { lists: unknown[] }) => ({
      lists,
      pendingCount: 0,
      interrupted: false,
    }));
    mockEnqueue.mockResolvedValue([]);
    mockAddItem.mockResolvedValue({});
    mockBuildAffiliateProductSearch.mockReturnValue('https://www.amazon.com/s?k=immersion%20blender&tag=kwiltapp-20');
    mockOpenAffiliateProductSearch.mockResolvedValue(true);
    mockAffiliateLinkDisclosure.mockReturnValue('Paid link');
    mockReadOnlineShoppingPreferences.mockResolvedValue(null);
    mockReadPreferredStore.mockResolvedValue(null);
    mockRuntimePolicies.mockReturnValue([
      { retailerId: 'amazon', capability: 'product_links', supportedModes: ['pickup', 'delivery'], approvedSurface: true, productEvidence: true, cartWrite: false },
      { retailerId: 'kroger', capability: 'cart_prepare', supportedModes: ['pickup'], approvedSurface: true, productEvidence: true, cartWrite: true },
      { retailerId: 'walmart', capability: 'product_links', supportedModes: ['pickup', 'delivery'], approvedSurface: true, productEvidence: true, cartWrite: false },
    ]);
    mockRecipes = [];
    mockMealPlans = [
      {
        id: 'plan-1',
        version: 1,
        state: 'finalized',
        entries: [{ id: 'meal-1' }, { id: 'meal-2' }],
        occasions: [],
        candidates: [],
      },
    ];
    (createGroceryRepository as jest.Mock).mockReturnValue({
      list: jest.fn().mockResolvedValue([
        {
          id: 'list-1',
          revision: 1,
          status: 'review_needed',
          sourceMealPlanId: 'plan-1',
          sourceMealPlanVersion: 1,
          items: [
            {
              id: 'item-1',
              aisle: 'pantry',
              concept: 'flour',
              quantityMin: 2,
              quantityMax: null,
              unit: 'cups',
              state: 'needed',
              reviewReason: null,
            },
          ],
        },
      ]),
      setItemState: jest.fn(),
      markReviewed,
      addItem: mockAddItem,
    });
  });

  it('starts a real manual list before any Meal Plan exists', async () => {
    const createManualList = jest.fn().mockResolvedValue({
      groceryListId: 'manual-list-1', revision: 1, status: 'ready', replayed: false,
    });
    (createGroceryRepository as jest.Mock).mockReturnValue({
      list: jest.fn().mockResolvedValue([]),
      createManualList,
      setItemState: jest.fn(),
      addItem: mockAddItem,
    });
    const replace = jest.fn();
    const screen = render(
      <GroceryListScreen
        navigation={{ goBack: jest.fn(), navigate: jest.fn(), replace } as never}
        route={{ key: 'grocery', name: 'GroceryList', params: { entryPoint: 'capability-menu' } } as never}
      />,
    );

    fireEvent.press(await screen.findByLabelText('Start a grocery list with an item'));

    await waitFor(() => expect(createManualList).toHaveBeenCalledTimes(1));
    expect(replace).toHaveBeenCalledWith('GroceryList', { listId: 'manual-list-1' });
    expect(screen.getByTestId('grocery-quick-add-composer')).toBeTruthy();
  });

  it('teaches already-have on the grocery list before the first online cart flow', async () => {
    const screen = render(
      <GroceryListScreen
        navigation={{ goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn() } as never}
        route={{ params: { entryPoint: 'capability-menu' } } as never}
      />,
    );

    expect(await screen.findByText('Already have something?')).toBeTruthy();
    expect(screen.getByText('Check it off here. It won’t be sent to your online cart.')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Got it' }));

    expect(mockMarkAlreadyHaveSeen).toHaveBeenCalledWith('user-1');
    expect(screen.queryByTestId('grocery-already-have-coachmark')).toBeNull();
  });

  it('anchors already-have education to the first still-needed grocery item', async () => {
    (createGroceryRepository as jest.Mock).mockReturnValue({
      list: jest.fn().mockResolvedValue([
        {
          id: 'list-1',
          revision: 1,
          status: 'ready',
          sourceMealPlanId: 'plan-1',
          sourceMealPlanVersion: 1,
          items: [
            {
              id: 'item-1',
              aisle: 'pantry',
              concept: 'flour',
              quantityMin: 2,
              quantityMax: null,
              unit: 'cups',
              state: 'already_have',
              reviewReason: null,
            },
            {
              id: 'item-2',
              aisle: 'pantry',
              concept: 'sugar',
              quantityMin: 1,
              quantityMax: null,
              unit: 'cup',
              state: 'needed',
              reviewReason: null,
            },
          ],
        },
      ]),
      setItemState: jest.fn(),
      markReviewed,
      addItem: mockAddItem,
    });

    const screen = render(
      <GroceryListScreen
        navigation={{ goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn() } as never}
        route={{ params: { entryPoint: 'capability-menu' } } as never}
      />,
    );

    expect(await screen.findByText('Already have something?')).toBeTruthy();
    expect(
      screen.getByTestId('ingredient-coachmark-target').findByProps({
        testID: 'ingredient-check-item-2',
      }),
    ).toBeTruthy();
  });

  it('removes already-have education when the grocery screen loses focus', async () => {
    const navigation = { goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn() } as never;
    const route = { params: { entryPoint: 'capability-menu' } } as never;
    const screen = render(<GroceryListScreen navigation={navigation} route={route} />);

    expect(await screen.findByTestId('grocery-already-have-coachmark')).toBeTruthy();

    mockScreenFocused = false;
    screen.rerender(<GroceryListScreen navigation={navigation} route={route} />);

    await waitFor(() => {
      expect(screen.queryByTestId('grocery-already-have-coachmark')).toBeNull();
    });
  });

  it('does not show already-have education after an online cart flow has started', async () => {
    mockHasStartedCartFlow.mockResolvedValue(true);
    const screen = render(
      <GroceryListScreen
        navigation={{ goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn() } as never}
        route={{ params: { entryPoint: 'capability-menu' } } as never}
      />,
    );

    await waitFor(() => expect(mockHasStartedCartFlow).toHaveBeenCalledWith('user-1'));
    await waitFor(() => expect(screen.getByTestId('ingredient-check-item-1')).toBeTruthy());
    expect(screen.queryByTestId('grocery-already-have-coachmark')).toBeNull();
  });

  it('uses retailer cart evidence to suppress education on an existing install', async () => {
    (createGroceryRepository as jest.Mock).mockReturnValue({
      list: jest.fn().mockResolvedValue([
        {
          id: 'list-1',
          revision: 1,
          status: 'ready',
          sourceMealPlanId: 'plan-1',
          sourceMealPlanVersion: 1,
          items: [{
            id: 'item-1',
            aisle: 'pantry',
            concept: 'flour',
            quantityMin: 2,
            quantityMax: null,
            unit: 'cups',
            state: 'needed',
            reviewReason: null,
            retailerCart: {
              provider: 'kroger',
              retailerLabel: "Smith's",
              locationName: null,
              state: 'cart_add_acknowledged',
            },
          }],
        },
      ]),
      setItemState: jest.fn(),
      markReviewed,
      addItem: mockAddItem,
    });
    const screen = render(
      <GroceryListScreen
        navigation={{ goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn() } as never}
        route={{ params: { entryPoint: 'capability-menu' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('ingredient-check-item-1')).toBeTruthy());
    expect(screen.queryByTestId('grocery-already-have-coachmark')).toBeNull();
  });

  it('does not show already-have education again after it has been seen', async () => {
    mockHasSeenAlreadyHave.mockResolvedValue(true);
    const screen = render(
      <GroceryListScreen
        navigation={{ goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn() } as never}
        route={{ params: { entryPoint: 'capability-menu' } } as never}
      />,
    );

    await waitFor(() => expect(mockHasSeenAlreadyHave).toHaveBeenCalledWith('user-1'));
    await waitFor(() => expect(screen.getByTestId('ingredient-check-item-1')).toBeTruthy());
    expect(screen.queryByTestId('grocery-already-have-coachmark')).toBeNull();
  });

  it('keeps grocery education behind the capability menu', async () => {
    mockCapabilityMenuOpen = true;
    const screen = render(
      <GroceryListScreen
        navigation={{ goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn() } as never}
        route={{ params: { entryPoint: 'capability-menu' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('ingredient-check-item-1')).toBeTruthy());
    expect(screen.queryByTestId('grocery-already-have-coachmark')).toBeNull();
  });

  it('uses the global navigation affordance when opened as a primary capability', async () => {
    const screen = render(
      <GroceryListScreen
        navigation={{ goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn() } as never}
        route={{ params: { entryPoint: 'capability-menu' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('ingredient-check-item-1')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Open navigation menu'));
    expect(mockOpenMenu).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('Go back from Groceries')).toBeNull();
  });

  it('is the checklist itself, using the Recipe ingredient checked treatment without review chrome', async () => {
    const navigate = jest.fn();
    const screen = render(
      <GroceryListScreen
        navigation={{ goBack: jest.fn(), navigate, replace: jest.fn() } as never}
        route={{ params: { entryPoint: 'capability-menu' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('ingredient-check-item-1')).toBeTruthy());
    expect(screen.queryByText(/things to get/i)).toBeNull();
    expect(screen.queryByText('Review what I already have')).toBeNull();
    expect(screen.queryByText('List looks right')).toBeNull();
    expect(screen.queryByText('Why?')).toBeNull();
    fireEvent.press(screen.getByTestId('meal-plan-header-action'));
    expect(navigate).toHaveBeenCalledWith('RecipeLibrary', { openPlan: true });
  });

  it('offers specialized equipment below groceries and opens a truthful one-item Amazon search', async () => {
    mockMealPlans = [
      {
        id: 'plan-1',
        version: 1,
        state: 'finalized',
        entries: [{
          id: 'meal-1',
          candidateId: 'candidate-1',
          title: 'Tomato soup',
          recipeSnapshot: {
            recipeVersionId: 'soup-v1',
            equipmentSuggestions: [
              { id: 'immersion-blender', label: 'Immersion blender' },
            ],
          },
        }],
        occasions: [],
        candidates: [],
      },
    ];

    const screen = render(
      <GroceryListScreen
        navigation={{ goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn() } as never}
        route={{ params: { entryPoint: 'capability-menu' } } as never}
      />,
    );

    expect(await screen.findByText('For these recipes')).toBeTruthy();
    expect(screen.getByText('Immersion blender')).toBeTruthy();
    expect(screen.getByText('Needed for Tomato soup · Paid link')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Search Amazon for Immersion blender'));

    await waitFor(() => {
      expect(mockOpenAffiliateProductSearch).toHaveBeenCalledWith('amazon', 'immersion blender');
    });
    expect(mockAddItem).not.toHaveBeenCalled();
  });

  it('does not expose recipe equipment when no approved Amazon link is available', async () => {
    mockBuildAffiliateProductSearch.mockReturnValue('');
    mockMealPlans = [
      {
        id: 'plan-1',
        version: 1,
        state: 'finalized',
        entries: [{
          id: 'meal-1',
          title: 'Tomato soup',
          recipeSnapshot: {
            recipeVersionId: 'soup-v1',
            equipmentSuggestions: [{ id: 'immersion-blender', label: 'Immersion blender' }],
          },
        }],
        occasions: [],
        candidates: [],
      },
    ];

    const screen = render(
      <GroceryListScreen
        navigation={{ goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn() } as never}
        route={{ params: { entryPoint: 'capability-menu' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('ingredient-check-item-1')).toBeTruthy());
    expect(screen.queryByText('For these recipes')).toBeNull();
  });

  it('offers Add to list only as recovery when Amazon cannot open', async () => {
    mockOpenAffiliateProductSearch.mockResolvedValue(false);
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockMealPlans = [
      {
        id: 'plan-1',
        version: 1,
        state: 'finalized',
        entries: [{
          id: 'meal-1',
          title: 'Tomato soup',
          recipeSnapshot: {
            recipeVersionId: 'soup-v1',
            equipmentSuggestions: [{ id: 'immersion-blender', label: 'Immersion blender' }],
          },
        }],
        occasions: [],
        candidates: [],
      },
    ];

    const screen = render(
      <GroceryListScreen
        navigation={{ goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn() } as never}
        route={{ params: { entryPoint: 'capability-menu' } } as never}
      />,
    );

    fireEvent.press(await screen.findByLabelText('Search Amazon for Immersion blender'));
    await waitFor(() => expect(alert).toHaveBeenCalled());

    const buttons = alert.mock.calls.at(-1)?.[2];
    buttons?.find((button) => button.text === 'Add to list')?.onPress?.();

    await waitFor(() => {
      expect(mockAddItem).toHaveBeenCalledWith('list-1', 1, 'Immersion blender');
    });
  });

  it('opens first-use setup when no online-shopping preference is saved', async () => {
    const navigate = jest.fn();
    const screen = render(
      <GroceryListScreen
        navigation={{ goBack: jest.fn(), navigate, replace: jest.fn() } as never}
        route={{ params: { entryPoint: 'capability-menu' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('ingredient-check-item-1')).toBeTruthy());
    fireEvent.press(screen.getByTestId('grocery-shop-remaining'));

    await waitFor(() => expect(markReviewed).toHaveBeenCalledWith('list-1', 1));
    expect(mockMarkCartFlowStarted).toHaveBeenCalledWith('user-1');
    expect(screen.getByLabelText('Shop online · 1 item')).toBeTruthy();
    expect(mockReadOnlineShoppingPreferences).toHaveBeenCalledWith('user-1');
    expect(navigate).toHaveBeenCalledWith('OnlineShoppingSetup', { listId: 'list-1' });
  });

  it('opens Order this list when online-shopping preferences already exist', async () => {
    mockReadPreferredStore.mockResolvedValue({
      id: 'store-1',
      name: 'Smiths',
      banner: "Smith's",
      address: '689 N Redwood Rd · Saratoga Springs, UT 84045',
      latitude: 40.34,
      longitude: -111.91,
    });
    mockReadOnlineShoppingPreferences.mockResolvedValue({
      schemaVersion: 1,
      defaultFulfillment: 'pickup',
      homePostalCode: null,
      savedAt: '2026-08-13T16:00:00.000Z',
      retailers: [{ id: 'kroger', enabled: true, rank: 1, label: "Smith's", membershipConfirmed: null }],
    });
    const navigate = jest.fn();
    const screen = render(
      <GroceryListScreen
        navigation={{ goBack: jest.fn(), navigate, replace: jest.fn() } as never}
        route={{ params: { entryPoint: 'capability-menu' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('ingredient-check-item-1')).toBeTruthy());
    fireEvent.press(screen.getByTestId('grocery-shop-remaining'));

    await waitFor(() => expect(markReviewed).toHaveBeenCalledWith('list-1', 1));
    expect(navigate).toHaveBeenCalledWith('OnlineOrder', { listId: 'list-1' });
  });

  it('goes directly to Amazon preparation when Amazon is already preferred', async () => {
    mockReadOnlineShoppingPreferences.mockResolvedValue({
      schemaVersion: 1,
      defaultFulfillment: 'pickup',
      homePostalCode: null,
      savedAt: '2026-08-13T16:00:00.000Z',
      retailers: [
        { id: 'amazon', enabled: true, rank: 1, label: 'Amazon', membershipConfirmed: null },
        { id: 'walmart', enabled: true, rank: 2, label: 'Walmart', membershipConfirmed: null },
      ],
    });
    const navigate = jest.fn();
    const screen = render(
      <GroceryListScreen
        navigation={{ goBack: jest.fn(), navigate, replace: jest.fn() } as never}
        route={{ params: { entryPoint: 'capability-menu' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('ingredient-check-item-1')).toBeTruthy());
    fireEvent.press(screen.getByTestId('grocery-shop-remaining'));

    await waitFor(() => expect(markReviewed).toHaveBeenCalledWith('list-1', 1));
    expect(navigate).toHaveBeenCalledWith('RetailerLinkShopping', {
      listId: 'list-1',
      retailerId: 'amazon',
    });
    expect(navigate).not.toHaveBeenCalledWith('OnlineOrder', { listId: 'list-1' });
  });

  it('only offers online shopping in the US or Canada', async () => {
    mockCountryCode = 'FR';
    const screen = render(
      <GroceryListScreen
        navigation={{ goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn() } as never}
        route={{ params: { entryPoint: 'capability-menu' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('ingredient-check-item-1')).toBeTruthy());
    expect(screen.queryByTestId('grocery-shop-remaining')).toBeNull();
    expect(screen.queryByTestId('grocery-already-have-coachmark')).toBeNull();
    expect(screen.getByRole('button', { name: 'Add grocery item' })).toBeTruthy();
  });

  it('keeps a queued completion layout-stable while updating the handoff count', async () => {
    (reconcileGroceryOfflineQueue as jest.Mock).mockResolvedValue({
      lists: [
        {
          id: 'list-1',
          revision: 1,
          status: 'review_needed',
          sourceMealPlanId: 'plan-1',
          sourceMealPlanVersion: 1,
          items: [
            {
              id: 'item-1',
              aisle: 'pantry',
              concept: 'flour',
              quantityMin: 2,
              quantityMax: null,
              unit: 'cups',
              state: 'already_have',
              reviewReason: null,
            },
            {
              id: 'item-2',
              aisle: 'dairy_eggs',
              concept: 'eggs',
              quantityMin: 6,
              quantityMax: null,
              unit: 'count',
              state: 'needed',
              reviewReason: null,
            },
          ],
        },
      ],
      pendingCount: 1,
      interrupted: false,
    });

    const screen = render(
      <GroceryListScreen
        navigation={{ goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn() } as never}
        route={{ params: { entryPoint: 'capability-menu' } } as never}
      />,
    );

    expect(await screen.findByLabelText('Shop online · 1 item')).toBeTruthy();
    expect(screen.queryByText(/saved on this device/i)).toBeNull();
    expect(screen.queryByText(/pull to sync/i)).toBeNull();
    expect(screen.queryByText('Sync to shop')).toBeNull();
    expect(screen.getByTestId('grocery-shop-remaining')).not.toHaveStyle({ opacity: 0.45 });
    expect(screen.getByTestId('grocery-shop-surface.surface')).toHaveStyle({
      backgroundColor: '#1C1A19',
    });
  });

  it('opens the To-do composer contract without To-do-only controls', async () => {
    const screen = render(
      <GroceryListScreen
        navigation={{ goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn() } as never}
        route={{ params: { entryPoint: 'capability-menu' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('ingredient-check-item-1')).toBeTruthy());
    expect(screen.getByLabelText('Shop online · 1 item')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Add grocery item' }));

    const composer = screen.getByLabelText('Grocery item');
    expect(screen.getByTestId('grocery-quick-add-composer').props.accessibilityValue.text).toBe(
      JSON.stringify({ showCollapsedTrigger: false, showLeadingAffordance: false, showAiActions: false }),
    );
    expect(screen.queryByLabelText('Shop online · 1 item')).toBeNull();
    fireEvent.changeText(composer, 'dish soap');
    fireEvent.press(screen.getByRole('button', { name: 'Add grocery item to list' }));

    await waitFor(() => expect(mockAddItem).toHaveBeenCalledWith('list-1', 1, 'dish soap'));
  });
});

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { GroceryListScreen } from './GroceryListScreen';
import { createGroceryRepository } from '../data/groceryRepository';

const mockOpenMenu = jest.fn();
const mockEnqueue = jest.fn();

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
jest.mock('../../../services/analytics/useAnalytics', () => ({
  useAnalytics: () => ({ capture: jest.fn() }),
}));
jest.mock('../../meal-planning/data/mealPlanningRepository', () => ({
  createMealPlanningRepository: () => ({
    list: jest.fn().mockResolvedValue([
      {
        id: 'plan-1',
        version: 1,
        state: 'finalized',
        entries: [{ id: 'meal-1' }, { id: 'meal-2' }],
        occasions: [],
      },
    ]),
  }),
}));
jest.mock('../../../ui/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => children,
}));
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

describe('Grocery List primary capability', () => {
  const markReviewed = jest.fn().mockResolvedValue({ status: 'ready' });

  beforeEach(() => {
    jest.clearAllMocks();
    mockEnqueue.mockResolvedValue([]);
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
    });
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
    const screen = render(
      <GroceryListScreen
        navigation={{ goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn() } as never}
        route={{ params: { entryPoint: 'capability-menu' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('ingredient-check-item-1')).toBeTruthy());
    expect(screen.queryByText(/things to get/i)).toBeNull();
    expect(screen.queryByText('Review what I already have')).toBeNull();
    expect(screen.queryByText('List looks right')).toBeNull();
    expect(screen.queryByText('Why?')).toBeNull();
    expect(screen.getByTestId('meal-plan-header-action')).toBeTruthy();
  });

  it('goes straight from Shop online to store selection', async () => {
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
    expect(screen.getByText('Shop online')).toBeTruthy();
    expect(navigate).toHaveBeenCalledWith('KrogerCart', { listId: 'list-1' });
  });
});

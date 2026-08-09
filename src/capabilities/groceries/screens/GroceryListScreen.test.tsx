import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { GroceryListScreen } from './GroceryListScreen';
import { createGroceryRepository } from '../data/groceryRepository';

const mockOpenMenu = jest.fn();

type MockPageHeaderProps = {
  title: string;
  onPressMenu?: () => void;
  onPressBack?: () => void;
};

type MockButtonProps = {
  children?: ReactNode;
  variant?: string;
  disabled?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
};

jest.mock('../data/groceryRepository', () => ({ createGroceryRepository: jest.fn() }));
jest.mock('../data/groceryCache', () => ({
  groceryCache: { read: jest.fn().mockResolvedValue([]), write: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../data/groceryOfflineQueue', () => ({
  applyQueuedGroceryStates: (lists: unknown) => lists,
  groceryOfflineQueue: { read: jest.fn().mockResolvedValue([]), enqueue: jest.fn() },
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
jest.mock('../../../ui/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('../../../ui/layout/PageHeader', () => {
  const { Pressable, Text } = require('react-native');
  return {
    PageHeader: ({ title, onPressMenu, onPressBack }: MockPageHeaderProps) => (
      <>
        <Text>{title}</Text>
        {onPressMenu ? <Pressable accessibilityLabel="Open navigation menu" onPress={onPressMenu} /> : null}
        {onPressBack ? <Pressable accessibilityLabel={`Go back from ${title}`} onPress={onPressBack} /> : null}
      </>
    ),
  };
});
jest.mock('../../../ui/Button', () => {
  const { Pressable, Text } = require('react-native');
  return {
    Button: ({ children, variant = 'default', ...props }: MockButtonProps) => (
      <Pressable
        {...props}
        testID={typeof children === 'string' ? `button-${children}` : undefined}
        accessibilityValue={{ text: variant }}
      >
        <Text>{children}</Text>
      </Pressable>
    ),
  };
});
jest.mock('../components/StoreOpportunityCaptureSheet', () => ({ StoreOpportunityCaptureSheet: () => null }));
jest.mock('../components/GroceryItemProvenanceSheet', () => ({ GroceryItemProvenanceSheet: () => null }));

describe('Grocery List primary capability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    });
  });

  it('uses the global navigation affordance when opened as a primary capability', async () => {
    const screen = render(
      <GroceryListScreen
        navigation={{ goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn() } as never}
        route={{ params: { entryPoint: 'capability-menu' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('button-Review what I already have')).toBeTruthy());
    fireEvent.press(screen.getByLabelText('Open navigation menu'));
    expect(mockOpenMenu).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('Go back from Groceries')).toBeNull();
  });

  it('keeps grocery workflow actions neutral instead of green', async () => {
    const screen = render(
      <GroceryListScreen
        navigation={{ goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn() } as never}
        route={{ params: { entryPoint: 'capability-menu' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByTestId('button-Review what I already have')).toBeTruthy());
    expect(screen.getByTestId('button-Review what I already have').props.accessibilityValue).toEqual({ text: 'outline' });
    expect(screen.getByTestId('button-List looks right').props.accessibilityValue).toEqual({ text: 'outline' });
  });
});

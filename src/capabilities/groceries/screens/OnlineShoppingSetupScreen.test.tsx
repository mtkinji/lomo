import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

const mockReadPreferences = jest.fn();
const mockReplacePreferences = jest.fn();
const mockReadPreferredStore = jest.fn();
const mockRuntimePolicies = jest.fn();

jest.mock('../data/onlineShoppingPreferencesRepository', () => ({
  onlineShoppingPreferencesRepository: {
    read: (...args: unknown[]) => mockReadPreferences(...args),
    replace: (...args: unknown[]) => mockReplacePreferences(...args),
  },
}));
jest.mock('../data/preferredGroceryStore', () => ({
  preferredGroceryStore: {
    read: (...args: unknown[]) => mockReadPreferredStore(...args),
  },
}));
jest.mock('../providers/affiliateRetailerProvider', () => ({
  getOnlineRetailerRuntimePolicies: (...args: unknown[]) => mockRuntimePolicies(...args),
}));
jest.mock('../../../store/useAppStore', () => ({
  useAppStore: (selector: (state: { authIdentity: { userId: string } }) => unknown) =>
    selector({ authIdentity: { userId: 'person-1' } }),
}));
jest.mock('../../../ui/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('../../../ui/layout/CanvasScrollView', () => ({
  CanvasScrollView: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('../../../ui/layout/PageHeader', () => ({
  PageHeader: ({ title }: { title: string }) => title,
}));
jest.mock('../../../ui/layout/BottomDrawerHeader', () => ({
  BottomDrawerHeader: ({ title }: { title: string }) => title,
}));
jest.mock('../../../ui/BottomDrawer', () => ({
  BottomDrawer: ({ children, visible }: { children: ReactNode; visible: boolean }) =>
    visible ? children : null,
}));
jest.mock('react-native-draggable-flatlist', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      data,
      renderItem,
    }: {
      data: Array<{ id: string }>;
      renderItem(params: {
        item: { id: string };
        drag(): void;
        getIndex(): number;
        isActive: boolean;
      }): ReactNode;
    }) => (
      <View>
        {data.map((item, index) => (
          <View key={item.id}>{renderItem({ item, drag: jest.fn(), getIndex: () => index, isActive: false })}</View>
        ))}
      </View>
    ),
  };
});

import { OnlineShoppingSetupScreen } from './OnlineShoppingSetupScreen';

const smiths = {
  id: '70600123',
  name: 'Smiths',
  banner: "Smith's",
  address: '689 N Redwood Rd · Saratoga Springs, UT 84045',
  latitude: 40.34,
  longitude: -111.91,
};

const policies = [
  { retailerId: 'amazon', capability: 'product_links', supportedModes: ['pickup', 'delivery'], approvedSurface: true, productEvidence: true, cartWrite: false },
  { retailerId: 'costco', capability: 'remembered_only', supportedModes: [], approvedSurface: false, productEvidence: false, cartWrite: false },
  { retailerId: 'kroger', capability: 'cart_prepare', supportedModes: ['pickup'], approvedSurface: true, productEvidence: true, cartWrite: true },
  { retailerId: 'walmart', capability: 'product_links', supportedModes: ['pickup', 'delivery'], approvedSurface: true, productEvidence: true, cartWrite: false },
  { retailerId: 'other', capability: 'remembered_only', supportedModes: [], approvedSurface: false, productEvidence: false, cartWrite: false },
];

function navigation() {
  return {
    addListener: jest.fn(() => jest.fn()),
    goBack: jest.fn(),
    navigate: jest.fn(),
  };
}

describe('OnlineShoppingSetupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReadPreferences.mockResolvedValue(null);
    mockReplacePreferences.mockResolvedValue(undefined);
    mockReadPreferredStore.mockResolvedValue(smiths);
    mockRuntimePolicies.mockReturnValue(policies);
  });

  it('ranks one list of actionable destinations using the local store banner', async () => {
    const nav = navigation();
    const screen = render(
      <OnlineShoppingSetupScreen
        navigation={nav as never}
        route={{ params: { listId: 'list-1' } } as never}
      />,
    );

    expect(screen.getByText('How do you want to get your groceries?')).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    fireEvent.press(screen.getByRole('radio', { name: /^Pickup\./ }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue' })).not.toBeDisabled());
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Where should Kwilt look first?')).toBeTruthy();
    expect(screen.getByText('Only stores Kwilt can help you shop online are shown.')).toBeTruthy();
    expect(screen.getByText('Amazon')).toBeTruthy();
    expect(screen.getByText("Smith's")).toBeTruthy();
    expect(screen.getByText('Walmart')).toBeTruthy();
    expect(screen.queryByText('Costco')).toBeNull();
    expect(screen.queryByText('Kroger family')).toBeNull();
    expect(screen.queryByText(/commission/i)).toBeNull();

    fireEvent(
      screen.getByLabelText("Smith's, position 2 of 3"),
      'accessibilityAction',
      { nativeEvent: { actionName: 'moveUp' } },
    );
    fireEvent.press(screen.getByRole('button', { name: 'Remove Walmart' }));
    fireEvent.press(screen.getByRole('button', { name: 'Save and continue' }));

    await waitFor(() => expect(mockReplacePreferences).toHaveBeenCalledWith(
      'person-1',
      expect.objectContaining({
        schemaVersion: 1,
        defaultFulfillment: 'pickup',
        retailers: [
          expect.objectContaining({ id: 'kroger', label: "Smith's", rank: 1 }),
          expect.objectContaining({ id: 'amazon', label: 'Amazon', rank: 2 }),
          expect.objectContaining({ id: 'walmart', enabled: false, rank: 0 }),
        ],
      }),
    ));
    expect(nav.navigate).toHaveBeenCalledWith('OnlineOrder', { listId: 'list-1' });
  });

  it('offers supported nearby-store discovery instead of a generic retailer entry', async () => {
    mockReadPreferredStore.mockResolvedValue(null);
    const nav = navigation();
    const screen = render(
      <OnlineShoppingSetupScreen
        navigation={nav as never}
        route={{ params: { listId: 'list-1' } } as never}
      />,
    );

    fireEvent.press(screen.getByRole('radio', { name: /^Pickup\./ }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue' })).not.toBeDisabled());
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.press(screen.getByRole('button', { name: 'Add online store' }));
    fireEvent.press(screen.getByRole('button', { name: 'Find a nearby pickup store' }));

    expect(nav.navigate).toHaveBeenCalledWith('OnlineStorePicker', { listId: 'list-1' });
    expect(screen.queryByLabelText('Other retailer name')).toBeNull();
  });

  it('filters legacy remembered-only stores, relabels the provider route, and adds newly supported stores', async () => {
    mockReadPreferences.mockResolvedValue({
      schemaVersion: 1,
      defaultFulfillment: 'pickup',
      homePostalCode: null,
      savedAt: '2026-08-13T16:00:00.000Z',
      retailers: [
        { id: 'kroger', enabled: true, rank: 1, label: 'Kroger family', membershipConfirmed: null },
        { id: 'costco', enabled: true, rank: 2, label: 'Costco', membershipConfirmed: true },
      ],
    });
    const screen = render(
      <OnlineShoppingSetupScreen
        navigation={navigation() as never}
        route={{ params: { listId: 'list-1' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue' })).not.toBeDisabled());
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText("Smith's")).toBeTruthy();
    expect(screen.getByText('Amazon')).toBeTruthy();
    expect(screen.getByText('Walmart')).toBeTruthy();
    expect(screen.queryByText('Kroger family')).toBeNull();
    expect(screen.queryByText('Costco')).toBeNull();
  });

  it('remembers a removed supported store and lets the person add it back', async () => {
    mockReadPreferences.mockResolvedValue({
      schemaVersion: 1,
      defaultFulfillment: 'pickup',
      homePostalCode: null,
      savedAt: '2026-08-13T16:00:00.000Z',
      retailers: [
        { id: 'amazon', enabled: true, rank: 1, label: 'Amazon', membershipConfirmed: null },
        { id: 'kroger', enabled: true, rank: 2, label: "Smith's", membershipConfirmed: null },
        { id: 'walmart', enabled: false, rank: 0, label: 'Walmart', membershipConfirmed: null },
      ],
    });
    const screen = render(
      <OnlineShoppingSetupScreen
        navigation={navigation() as never}
        route={{ params: { listId: 'list-1' } } as never}
      />,
    );

    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue' })).not.toBeDisabled());
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.queryByText('Walmart')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Add online store' }));
    fireEvent.press(screen.getByRole('button', { name: 'Walmart' }));
    expect(screen.getByText('Walmart')).toBeTruthy();
  });
});

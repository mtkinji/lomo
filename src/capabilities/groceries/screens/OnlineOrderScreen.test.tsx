import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { OnlineOrderScreen } from './OnlineOrderScreen';

const mockReadPreferences = jest.fn();
const mockListGroceries = jest.fn();
const mockReadPreferredStore = jest.fn();
const mockRuntimePolicies = jest.fn();
const mockOpenAffiliateProductSearch = jest.fn();

jest.mock('../data/onlineShoppingPreferencesRepository', () => ({
  onlineShoppingPreferencesRepository: { read: (...args: unknown[]) => mockReadPreferences(...args) },
}));
jest.mock('../data/groceryRepository', () => ({
  createGroceryRepository: () => ({ list: (...args: unknown[]) => mockListGroceries(...args) }),
}));
jest.mock('../data/preferredGroceryStore', () => ({
  preferredGroceryStore: { read: (...args: unknown[]) => mockReadPreferredStore(...args) },
}));
jest.mock('../providers/affiliateRetailerProvider', () => ({
  getOnlineRetailerRuntimePolicies: (...args: unknown[]) => mockRuntimePolicies(...args),
  openAffiliateProductSearch: (...args: unknown[]) => mockOpenAffiliateProductSearch(...args),
}));
jest.mock('../../../store/useAppStore', () => ({
  useAppStore: (selector: (state: { authIdentity: { userId: string } }) => unknown) =>
    selector({ authIdentity: { userId: 'person-1' } }),
}));
jest.mock('../../../ui/layout/AppShell', () => ({ AppShell: ({ children }: { children: ReactNode }) => children }));
jest.mock('../../../ui/layout/CanvasScrollView', () => ({ CanvasScrollView: ({ children }: { children: ReactNode }) => children }));
jest.mock('../../../ui/layout/PageHeader', () => ({ PageHeader: ({ title }: { title: string }) => title }));

const preferences = {
  schemaVersion: 1 as const,
  defaultFulfillment: 'pickup' as const,
  homePostalCode: null,
  savedAt: '2026-08-13T16:00:00.000Z',
  retailers: [
    { id: 'amazon' as const, enabled: true, rank: 1, label: 'Amazon', membershipConfirmed: true },
    { id: 'kroger' as const, enabled: true, rank: 2, label: "Smith's", membershipConfirmed: null },
    { id: 'costco' as const, enabled: true, rank: 3, label: 'Costco', membershipConfirmed: true },
  ],
};

const list = {
  id: 'list-1',
  revision: 4,
  status: 'ready',
  items: [{ id: 'item-1', concept: 'almond milk', state: 'needed' }],
};

const smiths = {
  id: '70600123',
  name: 'Smiths',
  banner: "Smith's",
  address: '689 N Redwood Rd · Saratoga Springs, UT 84045',
  latitude: 40.34,
  longitude: -111.91,
};

describe('OnlineOrderScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReadPreferences.mockResolvedValue(preferences);
    mockListGroceries.mockResolvedValue([list]);
    mockReadPreferredStore.mockResolvedValue(smiths);
    mockRuntimePolicies.mockReturnValue([
      { retailerId: 'amazon', capability: 'product_links', supportedModes: ['pickup', 'delivery'], approvedSurface: true, productEvidence: true, cartWrite: false },
      { retailerId: 'kroger', capability: 'cart_prepare', supportedModes: ['pickup'], approvedSurface: true, productEvidence: true, cartWrite: true },
      { retailerId: 'costco', capability: 'remembered_only', supportedModes: [], approvedSurface: false, productEvidence: false, cartWrite: false },
    ]);
  });

  it('makes the highest-ranked approved link retailer the primary shopping outcome', async () => {
    const navigate = jest.fn();
    const screen = render(
      <OnlineOrderScreen
        navigation={{ navigate, goBack: jest.fn() } as never}
        route={{ params: { listId: 'list-1' } } as never}
      />,
    );

    expect(await screen.findByText('Pickup · Amazon first')).toBeTruthy();
    expect(screen.getByText('Amazon')).toBeTruthy();
    expect(screen.getByText('Kwilt will send what it can and keep the rest on your list.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start shopping at Amazon' })).toHaveTextContent('Shop with Amazon');
    expect(screen.queryByText(/one item at a time/i)).toBeNull();
    expect(screen.getByRole('button', { name: 'Start shopping at Amazon' })).toBeTruthy();
    expect(screen.queryByText(/items found/i)).toBeNull();
    expect(screen.queryByText(/best price/i)).toBeNull();
    expect(screen.queryByText(/coverage score/i)).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Start shopping at Amazon' }));
    expect(navigate).toHaveBeenCalledWith('RetailerLinkShopping', {
      listId: 'list-1',
      retailerId: 'amazon',
    });
    fireEvent.press(screen.getByRole('button', { name: 'Try another retailer' }));
    fireEvent.press(screen.getByRole('button', { name: "Build with Smith's" }));
    expect(navigate).toHaveBeenCalledWith('KrogerCart', { listId: 'list-1', fulfillmentMode: 'pickup' });
    fireEvent.press(screen.getByRole('button', { name: 'Change online shopping preferences' }));
    expect(navigate).toHaveBeenCalledWith('OnlineShoppingSetup', { listId: 'list-1' });
  });

  it('does not carry remembered-only retailers into an online order', async () => {
    const screen = render(
      <OnlineOrderScreen
        navigation={{ navigate: jest.fn(), goBack: jest.fn() } as never}
        route={{ params: { listId: 'list-1' } } as never}
      />,
    );

    await screen.findByText('Pickup · Amazon first');
    expect(screen.queryByText(/Costco/)).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Try another retailer' }));
    expect(screen.queryByText(/Costco/)).toBeNull();
  });

  it('relabels a legacy provider preference with the selected local banner', async () => {
    mockReadPreferences.mockResolvedValue({
      ...preferences,
      retailers: [
        { id: 'kroger', enabled: true, rank: 1, label: 'Kroger family', membershipConfirmed: null },
      ],
    });
    const screen = render(
      <OnlineOrderScreen
        navigation={{ navigate: jest.fn(), goBack: jest.fn() } as never}
        route={{ params: { listId: 'list-1' } } as never}
      />,
    );

    expect(await screen.findByText("Pickup · Smith's first")).toBeTruthy();
    expect(screen.getByText("Build with Smith's")).toBeTruthy();
    expect(screen.queryByText('Kroger family')).toBeNull();
  });

  it('requires refresh when the Grocery-list revision changes', async () => {
    mockListGroceries
      .mockResolvedValueOnce([list])
      .mockResolvedValueOnce([{ ...list, revision: 5 }]);
    const screen = render(
      <OnlineOrderScreen
        navigation={{ navigate: jest.fn(), goBack: jest.fn() } as never}
        route={{ params: { listId: 'list-1' } } as never}
      />,
    );

    await screen.findByText('Pickup · Amazon first');
    fireEvent.press(screen.getByRole('button', { name: 'Refresh list' }));
    await waitFor(() => expect(screen.getByText('Your grocery list changed. Review it before shopping.')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Start shopping at Amazon' })).toBeDisabled();
  });
});

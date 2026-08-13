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

describe('OnlineOrderScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReadPreferences.mockResolvedValue(preferences);
    mockListGroceries.mockResolvedValue([list]);
    mockReadPreferredStore.mockResolvedValue(null);
    mockRuntimePolicies.mockReturnValue([
      { retailerId: 'amazon', capability: 'product_links', supportedModes: ['pickup', 'delivery'], approvedSurface: true, productEvidence: true, cartWrite: false },
      { retailerId: 'kroger', capability: 'cart_prepare', supportedModes: ['pickup'], approvedSurface: true, productEvidence: true, cartWrite: true },
      { retailerId: 'costco', capability: 'remembered_only', supportedModes: [], approvedSurface: false, productEvidence: false, cartWrite: false },
    ]);
  });

  it('shows one cart outcome while explaining a higher-ranked link-only retailer', async () => {
    const navigate = jest.fn();
    const screen = render(
      <OnlineOrderScreen
        navigation={{ navigate, goBack: jest.fn() } as never}
        route={{ params: { listId: 'list-1' } } as never}
      />,
    );

    expect(await screen.findByText('Pickup · Amazon first')).toBeTruthy();
    expect(screen.getByText('Amazon can help with individual products; Kwilt cannot prepare this cart there.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Build my pickup cart' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open product search at Amazon' })).toBeTruthy();
    expect(screen.getByText('Affiliate link')).toBeTruthy();
    expect(screen.queryByText(/items found/i)).toBeNull();
    expect(screen.queryByText(/best price/i)).toBeNull();
    expect(screen.queryByText(/coverage score/i)).toBeNull();

    fireEvent.press(screen.getByRole('button', { name: 'Build my pickup cart' }));
    expect(navigate).toHaveBeenCalledWith('KrogerCart', {
      listId: 'list-1',
      fulfillmentMode: 'pickup',
    });
    fireEvent.press(screen.getByRole('button', { name: 'Change online shopping preferences' }));
    expect(navigate).toHaveBeenCalledWith('OnlineShoppingSetup', { listId: 'list-1' });
  });

  it('keeps remembered retailers behind progressive disclosure', async () => {
    const screen = render(
      <OnlineOrderScreen
        navigation={{ navigate: jest.fn(), goBack: jest.fn() } as never}
        route={{ params: { listId: 'list-1' } } as never}
      />,
    );

    await screen.findByText('Pickup · Amazon first');
    expect(screen.queryByText('Costco is remembered, but Kwilt cannot shop there yet.')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Try another retailer' }));
    expect(screen.getByText('Costco is remembered, but Kwilt cannot shop there yet.')).toBeTruthy();
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
    await waitFor(() => expect(screen.getByText('Your grocery list changed. Review it before building a cart.')).toBeTruthy());
    expect(screen.getByRole('button', { name: 'Build my pickup cart' })).toBeDisabled();
  });
});

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { RetailerLinkShoppingScreen } from './RetailerLinkShoppingScreen';

const mockListGroceries = jest.fn();
const mockReadSession = jest.fn();
const mockReplaceSession = jest.fn();
const mockOpenProductSearch = jest.fn();
const mockPrepareAmazon = jest.fn();
const mockOpenAmazonCart = jest.fn();

jest.mock('../data/groceryRepository', () => ({
  createGroceryRepository: () => ({ list: (...args: unknown[]) => mockListGroceries(...args) }),
}));
jest.mock('../data/retailerLinkSessionRepository', () => ({
  retailerLinkSessionRepository: {
    read: (...args: unknown[]) => mockReadSession(...args),
    replace: (...args: unknown[]) => mockReplaceSession(...args),
  },
}));
jest.mock('../providers/affiliateRetailerProvider', () => ({
  getAffiliateRetailerLinkDisclosure: () => 'Paid link',
  openAffiliateProductSearch: (...args: unknown[]) => mockOpenProductSearch(...args),
}));
jest.mock('../providers/amazonCartPreparationProvider', () => ({
  amazonCartPreparationProvider: { prepare: (...args: unknown[]) => mockPrepareAmazon(...args) },
  openAmazonPreparedCart: (...args: unknown[]) => mockOpenAmazonCart(...args),
}));
jest.mock('../../../store/useAppStore', () => ({
  useAppStore: (selector: (state: { authIdentity: { userId: string } }) => unknown) =>
    selector({ authIdentity: { userId: 'person-1' } }),
}));
jest.mock('../../../ui/layout/AppShell', () => ({ AppShell: ({ children }: { children: ReactNode }) => children }));
jest.mock('../../../ui/layout/CanvasScrollView', () => ({ CanvasScrollView: ({ children }: { children: ReactNode }) => children }));
jest.mock('../../../ui/FullScreenInterstitial', () => ({ FullScreenInterstitial: ({ children }: { children: ReactNode }) => children }));
jest.mock('../../../ui/hooks/useAccessibilityPreferences', () => ({
  useAccessibilityPreferences: () => ({ reduceMotionEnabled: true, screenReaderEnabled: false }),
}));
jest.mock('../../../ui/layout/PageHeader', () => {
  const { Text } = jest.requireActual('react-native');
  return { PageHeader: ({ title }: { title: string }) => <Text>{title}</Text> };
});

const list = {
  id: 'list-1',
  revision: 4,
  status: 'ready',
  items: [
    { id: 'milk', concept: 'Almond milk', quantityMin: 2, quantityMax: null, unit: 'cartons', state: 'needed', retailerCart: null },
    { id: 'eggs', concept: 'Eggs', quantityMin: 1, quantityMax: null, unit: 'dozen', state: 'needed', retailerCart: null },
    { id: 'covered', concept: 'Bread', quantityMin: 1, quantityMax: null, unit: 'loaf', state: 'already_have', retailerCart: null },
  ],
};

describe('RetailerLinkShoppingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListGroceries.mockResolvedValue([list]);
    mockReadSession.mockResolvedValue(null);
    mockReplaceSession.mockResolvedValue(undefined);
    mockOpenProductSearch.mockResolvedValue(true);
    mockOpenAmazonCart.mockResolvedValue(true);
    mockPrepareAmazon.mockResolvedValue({
      schemaVersion: 1,
      retailerId: 'amazon',
      listId: 'list-1',
      listRevision: 4,
      source: 'provider',
      observedAt: '2026-08-14T18:00:00.000Z',
      cartUrl: 'https://www.amazon.com/gp/cart/view.html?tag=kwiltapp-20',
      items: [
        { itemId: 'milk', status: 'ready', productId: 'B000000001', title: 'Unsweetened almond milk, 6 pack' },
        { itemId: 'eggs', status: 'review', productId: 'B000000002', title: 'Large eggs, 12 count', reason: 'Choose the package you want' },
      ],
    });
  });

  it('shows the prepared result and waits for explicit consent before opening Amazon', async () => {
    const screen = render(
      <RetailerLinkShoppingScreen
        navigation={{ goBack: jest.fn(), navigate: jest.fn() } as never}
        route={{ params: { listId: 'list-1', retailerId: 'amazon' } } as never}
      />,
    );

    expect(await screen.findByText('1 ready for Amazon')).toBeTruthy();
    expect(screen.getByText('1 will stay in Kwilt')).toBeTruthy();
    expect(screen.getByText('Paid link')).toBeTruthy();
    expect(mockOpenAmazonCart).not.toHaveBeenCalled();

    fireEvent.press(screen.getByRole('button', { name: 'Open Amazon' }));

    await waitFor(() => expect(mockOpenAmazonCart).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'provider' }),
    ));
    expect(await screen.findByText('Amazon opened')).toBeTruthy();
    expect(mockOpenAmazonCart).toHaveBeenCalledWith(expect.objectContaining({ source: 'provider' }));
    expect(screen.queryByText(/worked through/i)).toBeNull();
    expect(screen.queryByText('I added it')).toBeNull();
    expect(screen.queryByRole('button', { name: /Add .* Amazon/ })).toBeNull();
  });

  it('resumes a current list revision without repeating worked-through items', async () => {
    mockReadSession.mockResolvedValue({
      schemaVersion: 1,
      listId: 'list-1',
      listRevision: 4,
      retailerId: 'walmart',
      decisions: { milk: 'kept_for_later' },
      updatedAt: '2026-08-14T16:00:00.000Z',
    });
    const screen = render(
      <RetailerLinkShoppingScreen
        navigation={{ goBack: jest.fn() } as never}
        route={{ params: { listId: 'list-1', retailerId: 'walmart' } } as never}
      />,
    );

    expect(await screen.findByText('Shop at Walmart')).toBeTruthy();
    expect(screen.getByText('Eggs')).toBeTruthy();
    expect(screen.queryByText('Almond milk')).toBeNull();
  });

  it('does not present internal example matches as a successful Amazon handoff', async () => {
    mockPrepareAmazon.mockResolvedValue({
      schemaVersion: 1,
      retailerId: 'amazon',
      listId: 'list-1',
      listRevision: 4,
      source: 'preview',
      observedAt: '2026-08-14T18:00:00.000Z',
      cartUrl: null,
      items: [
        { itemId: 'milk', status: 'ready', productId: 'preview:milk', title: 'Almond milk · example Amazon match' },
        { itemId: 'eggs', status: 'ready', productId: 'preview:eggs', title: 'Eggs · example Amazon match' },
      ],
    });
    const screen = render(
      <RetailerLinkShoppingScreen
        navigation={{ goBack: jest.fn() } as never}
        route={{ params: { listId: 'list-1', retailerId: 'amazon' } } as never}
      />,
    );

    expect(await screen.findByText('Amazon cart handoff isn’t connected')).toBeTruthy();
    expect(screen.getByText('Kwilt can preview this flow, but it cannot place these items in Amazon yet.')).toBeTruthy();
    expect(screen.queryByText('2 ready for Amazon')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Done' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Use another retailer' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Add .* Amazon/ })).toBeNull();
    expect(mockOpenAmazonCart).not.toHaveBeenCalled();
  });

  it('fails closed without dropping the grocery list', async () => {
    mockPrepareAmazon.mockRejectedValue(new Error('amazon.preparation_unavailable'));
    const screen = render(
      <RetailerLinkShoppingScreen
        navigation={{ goBack: jest.fn() } as never}
        route={{ params: { listId: 'list-1', retailerId: 'amazon' } } as never}
      />,
    );

    expect(await screen.findByText('Amazon isn’t ready')).toBeTruthy();
    expect(screen.getByText('Amazon could not prepare this list yet. Your Grocery list is unchanged.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy();
  });
});

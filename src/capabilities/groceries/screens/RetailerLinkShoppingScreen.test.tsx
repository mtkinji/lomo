import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { RetailerLinkShoppingScreen } from './RetailerLinkShoppingScreen';

const mockListGroceries = jest.fn();
const mockReadSession = jest.fn();
const mockReplaceSession = jest.fn();
const mockOpenProductSearch = jest.fn();

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
jest.mock('../../../store/useAppStore', () => ({
  useAppStore: (selector: (state: { authIdentity: { userId: string } }) => unknown) =>
    selector({ authIdentity: { userId: 'person-1' } }),
}));
jest.mock('../../../ui/layout/AppShell', () => ({ AppShell: ({ children }: { children: ReactNode }) => children }));
jest.mock('../../../ui/layout/CanvasScrollView', () => ({ CanvasScrollView: ({ children }: { children: ReactNode }) => children }));
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
  });

  it('guides one item at a time and advances only after an explicit report', async () => {
    const screen = render(
      <RetailerLinkShoppingScreen
        navigation={{ goBack: jest.fn() } as never}
        route={{ params: { listId: 'list-1', retailerId: 'amazon' } } as never}
      />,
    );

    expect(await screen.findByText('Shop at Amazon')).toBeTruthy();
    expect(screen.getByText('0 of 2 worked through')).toBeTruthy();
    expect(screen.getByText('Almond milk')).toBeTruthy();
    expect(screen.getByText('2 cartons')).toBeTruthy();
    expect(screen.getByText('Paid link')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Find Almond milk at Amazon' }));
    await waitFor(() => expect(mockOpenProductSearch).toHaveBeenCalledWith('amazon', 'Almond milk'));
    expect(await screen.findByRole('button', { name: 'I added Almond milk' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'I added Almond milk' }));

    await waitFor(() => expect(mockReplaceSession).toHaveBeenCalledWith(
      'person-1',
      expect.objectContaining({ decisions: { milk: 'reported_added' } }),
    ));
    expect(await screen.findByText('Eggs')).toBeTruthy();
    expect(screen.getByText('1 of 2 worked through')).toBeTruthy();
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

  it('states link failure without advancing the session', async () => {
    mockOpenProductSearch.mockResolvedValue(false);
    const screen = render(
      <RetailerLinkShoppingScreen
        navigation={{ goBack: jest.fn() } as never}
        route={{ params: { listId: 'list-1', retailerId: 'amazon' } } as never}
      />,
    );

    await screen.findByText('Almond milk');
    fireEvent.press(screen.getByRole('button', { name: 'Find Almond milk at Amazon' }));
    expect(await screen.findByText("Amazon didn't open. Try again.")).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'I added Almond milk' })).toBeNull();
  });

  it('clears transient handoff state when switching retailers', async () => {
    const navigation = { goBack: jest.fn() } as never;
    const screen = render(
      <RetailerLinkShoppingScreen
        navigation={navigation}
        route={{ params: { listId: 'list-1', retailerId: 'amazon' } } as never}
      />,
    );

    await screen.findByText('Almond milk');
    fireEvent.press(screen.getByRole('button', { name: 'Find Almond milk at Amazon' }));
    expect(await screen.findByText('What happened in Amazon?')).toBeTruthy();

    screen.rerender(
      <RetailerLinkShoppingScreen
        navigation={navigation}
        route={{ params: { listId: 'list-1', retailerId: 'walmart' } } as never}
      />,
    );

    expect(await screen.findByRole('button', { name: 'Find Almond milk at Walmart' })).toBeTruthy();
    expect(screen.queryByText('What happened in Walmart?')).toBeNull();
  });

  it('finishes with user-reported counts rather than a cart claim', async () => {
    mockReadSession.mockResolvedValue({
      schemaVersion: 1,
      listId: 'list-1',
      listRevision: 4,
      retailerId: 'amazon',
      decisions: { milk: 'reported_added', eggs: 'kept_for_later' },
      updatedAt: '2026-08-14T16:00:00.000Z',
    });
    const screen = render(
      <RetailerLinkShoppingScreen
        navigation={{ goBack: jest.fn() } as never}
        route={{ params: { listId: 'list-1', retailerId: 'amazon' } } as never}
      />,
    );

    expect(await screen.findByText('This pass is ready')).toBeTruthy();
    expect(screen.getByText('1 reported added · 1 kept for later')).toBeTruthy();
    expect(screen.queryByText(/ordered/i)).toBeNull();
    expect(screen.queryByText(/Amazon cart contains/i)).toBeNull();
  });
});

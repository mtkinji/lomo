import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { GroceryHandoffScreen } from './GroceryHandoffScreen';

const mockRepositoryList = jest.fn().mockResolvedValue([]);
const mockKrogerStatus = jest.fn().mockResolvedValue({ configured: true, connection: null });
jest.mock('../data/groceryRepository', () => ({
  createGroceryRepository: () => ({ list: mockRepositoryList }),
}));
jest.mock('../data/krogerConnectionRepository', () => ({
  createKrogerConnectionRepository: () => ({ status: mockKrogerStatus }),
}));
jest.mock('../data/groceryCache', () => ({
  groceryCache: { read: jest.fn().mockResolvedValue([]), write: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../data/groceryOfflineQueue', () => ({
  groceryOfflineQueue: { read: jest.fn().mockResolvedValue([]) },
}));
jest.mock('../../../store/useAppStore', () => ({
  useAppStore: (selector: (state: { authIdentity: { userId: string } }) => unknown) =>
    selector({ authIdentity: { userId: 'user-1' } }),
}));
jest.mock('../../../services/analytics/useAnalytics', () => ({
  useAnalytics: () => ({ capture: jest.fn() }),
}));
jest.mock('../../../ui/layout/PageHeader', () => ({
  PageHeader: ({ title }: { title: string }) => title,
}));
jest.mock('../../../ui/layout/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => children,
}));

describe('Grocery handoff accessibility layout', () => {
  beforeEach(() => {
    mockRepositoryList.mockReset().mockResolvedValue([]);
    mockKrogerStatus.mockReset().mockResolvedValue({ configured: true, connection: null });
  });

  it('bounds the editorial heading so words stay intact on a small screen at maximum text size', async () => {
    mockRepositoryList.mockResolvedValue([{
      id: 'list-1',
      revision: 8,
      status: 'ready',
      items: [],
    }]);
    const screen = render(
      <GroceryHandoffScreen
        navigation={{ goBack: jest.fn() } as never}
        route={{ params: { listId: 'list-1' } } as never}
      />,
    );

    expect((await screen.findByText('Your grocery list is ready.')).props.maxFontSizeMultiplier).toBe(1.6);
  });

  it('does not call a stale list ready while retailer handoff is disabled', async () => {
    const navigate = jest.fn();
    mockRepositoryList.mockResolvedValue([{
      id: 'list-1',
      revision: 8,
      status: 'stale',
      items: [],
    }]);
    const screen = render(
      <GroceryHandoffScreen
        navigation={{ goBack: jest.fn(), navigate } as never}
        route={{ params: { listId: 'list-1' } } as never}
      />,
    );

    expect(await screen.findByText('Review your grocery list first.')).toBeTruthy();
    expect(screen.queryByText('Your grocery list is ready.')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Shop on Instacart' })).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Review grocery list' }));
    expect(navigate).toHaveBeenCalledWith('GroceryList', { listId: 'list-1' });
  });

  it('offers Smiths as the direct cart path for a synced reviewed list', async () => {
    const navigate = jest.fn();
    mockRepositoryList.mockResolvedValue([{ id: 'list-1', revision: 8, status: 'ready', items: [] }]);
    const screen = render(
      <GroceryHandoffScreen
        navigation={{ goBack: jest.fn(), navigate } as never}
        route={{ params: { listId: 'list-1' } } as never}
      />,
    );
    fireEvent.press(await screen.findByRole('button', { name: "Shop at Smith's" }));
    expect(navigate).toHaveBeenCalledWith('KrogerCart', { listId: 'list-1' });
  });

  it('does not offer a dead Smiths handoff when Kroger is not configured', async () => {
    mockRepositoryList.mockResolvedValue([{ id: 'list-1', revision: 8, status: 'ready', items: [] }]);
    mockKrogerStatus.mockResolvedValue({ configured: false, connection: null });
    const screen = render(
      <GroceryHandoffScreen
        navigation={{ goBack: jest.fn(), navigate: jest.fn() } as never}
        route={{ params: { listId: 'list-1' } } as never}
      />,
    );

    expect(await screen.findByText('Your grocery list is ready.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: "Shop at Smith's" })).toBeNull();
    expect(screen.getByText('Take the plain list anywhere.')).toBeTruthy();
  });
});

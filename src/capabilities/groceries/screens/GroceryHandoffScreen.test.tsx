import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { GroceryHandoffScreen } from './GroceryHandoffScreen';

jest.mock('../data/groceryRepository', () => ({
  createGroceryRepository: () => ({ list: jest.fn().mockResolvedValue([]) }),
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
  it('bounds the editorial heading so words stay intact on a small screen at maximum text size', () => {
    const screen = render(
      <GroceryHandoffScreen
        navigation={{ goBack: jest.fn() } as never}
        route={{ params: { listId: 'list-1' } } as never}
      />,
    );

    expect(screen.getByText('Take the reviewed list where you shop.').props.maxFontSizeMultiplier).toBe(1.6);
  });
});

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { OnlineShoppingSetupScreen } from './OnlineShoppingSetupScreen';

const mockReplacePreferences = jest.fn();

jest.mock('../data/onlineShoppingPreferencesRepository', () => ({
  onlineShoppingPreferencesRepository: {
    replace: (...args: unknown[]) => mockReplacePreferences(...args),
  },
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

describe('OnlineShoppingSetupScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReplacePreferences.mockResolvedValue(undefined);
  });

  it('progresses through fulfillment, retailers, and preferred order', async () => {
    const navigate = jest.fn();
    const screen = render(
      <OnlineShoppingSetupScreen
        navigation={{ navigate, goBack: jest.fn() } as never}
        route={{ params: { listId: 'list-1' } } as never}
      />,
    );

    expect(screen.getByText('How should Kwilt help?')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Default fulfillment, Pickup'));
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Where do you shop?')).toBeTruthy();
    fireEvent.press(screen.getByRole('switch', { name: 'Use Amazon' }));
    fireEvent.press(screen.getByRole('switch', { name: 'Use Kroger family' }));
    expect(screen.getByText('Your exact local store comes later, when Kwilt can match this list.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Which should Kwilt try first?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Move Amazon earlier' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Move Amazon later' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Move Kroger family earlier' }));
    fireEvent.press(screen.getByRole('button', { name: 'Save and continue' }));

    await waitFor(() => expect(mockReplacePreferences).toHaveBeenCalledWith(
      'person-1',
      expect.objectContaining({
        schemaVersion: 1,
        defaultFulfillment: 'pickup',
        retailers: expect.arrayContaining([
          expect.objectContaining({ id: 'kroger', enabled: true, rank: 1 }),
          expect.objectContaining({ id: 'amazon', enabled: true, rank: 2 }),
        ]),
      }),
    ));
    expect(navigate).toHaveBeenCalledWith('OnlineOrder', { listId: 'list-1' });
  });

  it('does not ask for an account or location during preference setup', () => {
    const screen = render(
      <OnlineShoppingSetupScreen
        navigation={{ navigate: jest.fn(), goBack: jest.fn() } as never}
        route={{ params: { listId: 'list-1' } } as never}
      />,
    );

    expect(screen.queryByText(/sign in/i)).toBeNull();
    expect(screen.queryByText(/allow location/i)).toBeNull();
  });
});

import { Alert } from 'react-native';
import { fireEvent } from '@testing-library/react-native';

jest.mock('../../ui/layout/AppShell', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    AppShell: ({ children }: any) =>
      React.createElement(View, { testID: 'app-shell' }, children),
  };
});

jest.mock('../../ui/layout/PageHeader', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    PageHeader: ({ title }: any) =>
      React.createElement(
        View,
        { testID: 'page-header' },
        React.createElement(Text, null, title),
      ),
  };
});

jest.mock('../../services/accountDeletion', () => ({
  deleteAccount: jest.fn().mockResolvedValue({ ok: true }),
}));

jest.mock('../../services/pushTokenService', () => ({
  unregisterPushToken: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/entitlements', () => {
  const actual = jest.requireActual('../../services/entitlements');
  return {
    ...actual,
    clearAdminEntitlementsOverrideTier: jest.fn().mockResolvedValue(undefined),
    openManageSubscription: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: jest.fn() }),
  };
});

import { renderWithProviders } from '../../test/renderWithProviders';
import { resetAllStores } from '../../test/storeFixtures';
import { useAppStore } from '../../store/useAppStore';
import { openManageSubscription } from '../../services/entitlements';
import { ProfileSettingsScreen } from './ProfileSettingsScreen';

describe('ProfileSettingsScreen account deletion', () => {
  beforeEach(() => {
    resetAllStores();
    useAppStore.getState().clearAuthIdentity();
    jest.restoreAllMocks();
  });

  it('shows account deletion inside Account settings for signed-in users', () => {
    useAppStore.getState().setAuthIdentity({ userId: 'user-1', email: 'user@example.com' });

    const { getByText } = renderWithProviders(<ProfileSettingsScreen />);

    expect(getByText('Account settings')).toBeTruthy();
    expect(getByText('Account deletion')).toBeTruthy();
    expect(getByText('Delete account')).toBeTruthy();
  });

  it('does not show account deletion when signed out', () => {
    const { queryByText } = renderWithProviders(<ProfileSettingsScreen />);

    expect(queryByText('Delete account')).toBeNull();
  });

  it('starts the destructive confirmation flow with subscription guidance', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    useAppStore.getState().setAuthIdentity({ userId: 'user-1', email: 'user@example.com' });

    const { getByText } = renderWithProviders(<ProfileSettingsScreen />);
    fireEvent.press(getByText('Delete account'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Delete account?',
      expect.stringContaining('does not cancel billing'),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Manage subscription' }),
        expect.objectContaining({ text: 'Continue', style: 'destructive' }),
      ]),
    );
  });

  it('opens Apple subscription management from the deletion warning', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    useAppStore.getState().setAuthIdentity({ userId: 'user-1', email: 'user@example.com' });

    const { getByText } = renderWithProviders(<ProfileSettingsScreen />);
    fireEvent.press(getByText('Delete account'));

    const buttons = alertSpy.mock.calls[0][2] as Array<{ text?: string; onPress?: () => void }>;
    buttons.find((button) => button.text === 'Manage subscription')?.onPress?.();

    expect(openManageSubscription).toHaveBeenCalledTimes(1);
  });
});

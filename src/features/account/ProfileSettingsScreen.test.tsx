import { Alert } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { act, waitFor } from '@testing-library/react-native';

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
  ...jest.requireActual('../../services/accountDeletion'),
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
    useNavigation: () => ({ goBack: jest.fn(), setParams: jest.fn() }),
    useRoute: () => ({ params: undefined }),
  };
});

import { renderWithProviders } from '../../test/renderWithProviders';
import { resetAllStores } from '../../test/storeFixtures';
import { useAppStore } from '../../store/useAppStore';
import { openManageSubscription } from '../../services/entitlements';
import { AccountDeletionClientError, deleteAccount } from '../../services/accountDeletion';
import { ProfileSettingsScreen } from './ProfileSettingsScreen';

describe('ProfileSettingsScreen account deletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetAllStores();
    useAppStore.getState().clearAuthIdentity();
    jest.restoreAllMocks();
    (deleteAccount as jest.Mock).mockResolvedValue({ ok: true });
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

  it('names Money data and financial connections before permanent deletion', () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    useAppStore.getState().setAuthIdentity({ userId: 'user-1', email: 'user@example.com' });

    const { getByText } = renderWithProviders(<ProfileSettingsScreen />);
    fireEvent.press(getByText('Delete account'));
    const firstButtons = alertSpy.mock.calls[0][2] as Array<{ text?: string; onPress?: () => void }>;
    firstButtons.find((button) => button.text === 'Continue')?.onPress?.();

    expect(alertSpy).toHaveBeenLastCalledWith(
      'Delete permanently?',
      expect.stringMatching(/Money plans, transactions, and connected financial accounts/),
      expect.any(Array),
    );
  });

  it('deletes for the signed-in identity and reports success only after completion', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    useAppStore.getState().setAuthIdentity({ userId: 'user-1', email: 'user@example.com' });

    const { getByText } = renderWithProviders(<ProfileSettingsScreen />);
    fireEvent.press(getByText('Delete account'));
    const firstButtons = alertSpy.mock.calls[0][2] as Array<{ text?: string; onPress?: () => void }>;
    firstButtons.find((button) => button.text === 'Continue')?.onPress?.();
    const secondButtons = alertSpy.mock.calls[1][2] as Array<{ text?: string; onPress?: () => void }>;
    await act(async () => secondButtons.find((button) => button.text === 'Delete account')?.onPress?.());

    expect(deleteAccount).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(alertSpy).toHaveBeenLastCalledWith('Account deleted', 'Your Kwilt account has been deleted.');
  });

  it('reports retryable failures without claiming deletion', async () => {
    (deleteAccount as jest.Mock).mockRejectedValueOnce(new AccountDeletionClientError(
      'Your account was not deleted. Try again.',
      'server_rejected',
      false,
    ));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    useAppStore.getState().setAuthIdentity({ userId: 'user-1' });

    const { getByText } = renderWithProviders(<ProfileSettingsScreen />);
    fireEvent.press(getByText('Delete account'));
    (alertSpy.mock.calls[0][2] as any[]).find((button) => button.text === 'Continue')?.onPress?.();
    const finalButtons = alertSpy.mock.calls[1][2] as any[];
    await act(async () => finalButtons.find((button) => button.text === 'Delete account')?.onPress?.());

    expect(alertSpy).toHaveBeenLastCalledWith('Account not deleted', 'Your account was not deleted. Try again.');
  });

  it('distinguishes a deleted account from incomplete device cleanup', async () => {
    (deleteAccount as jest.Mock).mockRejectedValueOnce(new AccountDeletionClientError(
      'Your account was deleted, but Kwilt could not finish clearing this device.',
      'local_cleanup_incomplete',
      true,
    ));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    useAppStore.getState().setAuthIdentity({ userId: 'user-1' });

    const { getByText } = renderWithProviders(<ProfileSettingsScreen />);
    fireEvent.press(getByText('Delete account'));
    (alertSpy.mock.calls[0][2] as any[]).find((button) => button.text === 'Continue')?.onPress?.();
    const finalButtons = alertSpy.mock.calls[1][2] as any[];
    await act(async () => finalButtons.find((button) => button.text === 'Delete account')?.onPress?.());

    expect(alertSpy).toHaveBeenLastCalledWith(
      'Account deleted — finish cleanup',
      'Your account was deleted, but Kwilt could not finish clearing this device.',
    );
  });

  it('gives legacy Sign in with Apple access-removal guidance after deletion', async () => {
    (deleteAccount as jest.Mock).mockResolvedValueOnce({ ok: true, manualAppleAccessRemovalRequired: true });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    useAppStore.getState().setAuthIdentity({ userId: 'user-1' });

    const { getByText } = renderWithProviders(<ProfileSettingsScreen />);
    fireEvent.press(getByText('Delete account'));
    (alertSpy.mock.calls[0][2] as any[]).find((button) => button.text === 'Continue')?.onPress?.();
    const finalButtons = alertSpy.mock.calls[1][2] as any[];
    await act(async () => finalButtons.find((button) => button.text === 'Delete account')?.onPress?.());

    expect(alertSpy).toHaveBeenLastCalledWith(
      'Account deleted',
      expect.stringContaining('Sign in with Apple'),
    );
  });

  it('ignores repeated delete presses while one request is running', async () => {
    let resolveDelete: ((value: { ok: true }) => void) | undefined;
    (deleteAccount as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => { resolveDelete = resolve; }));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    useAppStore.getState().setAuthIdentity({ userId: 'user-1' });

    const { getByText } = renderWithProviders(<ProfileSettingsScreen />);
    fireEvent.press(getByText('Delete account'));
    (alertSpy.mock.calls[0][2] as any[]).find((button) => button.text === 'Continue')?.onPress?.();
    const deletePress = (alertSpy.mock.calls[1][2] as any[]).find((button) => button.text === 'Delete account')?.onPress;
    act(() => {
      deletePress?.();
      deletePress?.();
    });
    await waitFor(() => expect(deleteAccount).toHaveBeenCalledTimes(1));
    resolveDelete?.({ ok: true });
    await waitFor(() => expect(alertSpy).toHaveBeenLastCalledWith('Account deleted', expect.any(String)));
  });
});

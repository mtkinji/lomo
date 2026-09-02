import { act, fireEvent, waitFor } from '@testing-library/react-native';

const mockResolveSelfAvatar = jest.fn();
const mockUploadAvatar = jest.fn();
const mockRemoveAvatar = jest.fn();
const mockLaunchImageLibrary = jest.fn();
const mockCapture = jest.fn();

jest.mock('../household/data/householdAvatars', () => ({
  resolveSelfAvatar: (...args: unknown[]) => mockResolveSelfAvatar(...args),
  uploadAvatar: (...args: unknown[]) => mockUploadAvatar(...args),
  removeAvatar: (...args: unknown[]) => mockRemoveAvatar(...args),
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({ granted: true })),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: (...args: unknown[]) => mockLaunchImageLibrary(...args),
}));

jest.mock('expo-file-system', () => ({
  File: class { size = 123; type = 'image/jpeg'; },
}));

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

jest.mock('../../ui/BottomDrawer', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    BottomDrawer: ({ visible, children }: any) =>
      visible
        ? React.createElement(View, { testID: 'bottom-drawer' }, children)
        : null,
  };
});

jest.mock('../../services/proCodes', () => ({
  getAdminProCodesStatus: jest.fn().mockResolvedValue({ role: null, httpStatus: 200 }),
}));

jest.mock('../../services/pushTokenService', () => ({
  unregisterPushToken: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/backend/auth', () => ({
  signOut: jest.fn().mockResolvedValue(undefined),
  ensureSignedInWithPrompt: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/entitlements', () => {
  const actual = jest.requireActual('../../services/entitlements');
  return {
    ...actual,
    clearAdminEntitlementsOverrideTier: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('../../services/analytics/useAnalytics', () => ({
  useAnalytics: () => ({ capture: mockCapture }),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const navigate = jest.fn();
  const rootNavigate = jest.fn();
  const getParent = jest.fn(() => ({ navigate: rootNavigate }));
  return {
    ...actual,
    useNavigation: () => ({ navigate, getParent }),
    useFocusEffect: (effect: () => void | (() => void)) => effect(),
    __navMocks: { navigate, rootNavigate, getParent },
  };
});

import { renderWithProviders } from '../../test/renderWithProviders';
import { resetAllStores } from '../../test/storeFixtures';
import { useAppStore } from '../../store/useAppStore';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import { SettingsHomeScreen } from './SettingsHomeScreen';

const navModule = require('@react-navigation/native') as {
  __navMocks: { navigate: jest.Mock; rootNavigate: jest.Mock; getParent: jest.Mock };
};

describe('SettingsHomeScreen planning group', () => {
  beforeEach(() => {
    resetAllStores();
    navModule.__navMocks.navigate.mockReset();
    navModule.__navMocks.rootNavigate.mockReset();
    mockResolveSelfAvatar.mockReset().mockResolvedValue({ avatarSource: 'initials', avatarUrl: null });
    mockUploadAvatar.mockReset();
    mockRemoveAvatar.mockReset();
    mockLaunchImageLibrary.mockReset();
    mockCapture.mockReset();
    jest.restoreAllMocks();
  });

  it('renders both Availability and Calendars rows in the Settings menu', () => {
    const { getByText } = renderWithProviders(<SettingsHomeScreen />);
    expect(getByText('Availability')).toBeTruthy();
    expect(getByText('Calendars')).toBeTruthy();
  });

  it('uses the shared grouped settings hierarchy', () => {
    const { getByText, queryByText } = renderWithProviders(<SettingsHomeScreen />);

    expect(getByText('Planning')).toBeTruthy();
    expect(getByText('Household & sharing')).toBeTruthy();
    expect(getByText('Money')).toBeTruthy();
    expect(getByText('Kwilt features')).toBeTruthy();
    expect(getByText('App')).toBeTruthy();
    expect(getByText('Account')).toBeTruthy();
    expect(queryByText('People')).toBeNull();
    expect(queryByText('Integrations')).toBeNull();
    expect(queryByText('Personalization')).toBeNull();
  });

  it('uses concrete setting labels without repeating their section owner', () => {
    const { getByText, queryByText } = renderWithProviders(<SettingsHomeScreen />);

    expect(getByText('Activity areas')).toBeTruthy();
    expect(getByText('Meal preferences')).toBeTruthy();
    expect(getByText('Budget')).toBeTruthy();
    expect(getByText('Profile & account')).toBeTruthy();
    expect(queryByText('Subscription')).toBeNull();
    expect(queryByText('Privacy lock')).toBeNull();
    expect(queryByText('Household access')).toBeNull();
    expect(queryByText('Money privacy')).toBeNull();
    expect(queryByText('Money household')).toBeNull();
  });

  it('separates Free status from a benefit-led Pro invitation and opens pricing directly', () => {
    const { getByLabelText, getByText } = renderWithProviders(<SettingsHomeScreen />);

    expect(getByText('Free plan')).toBeTruthy();
    expect(getByText('Check your plan before you spend.')).toBeTruthy();
    expect(getByText(
      'Kwilt Pro keeps your budget current, can pause selected spending apps for a quick review, and includes 1,000 AI credits each month.',
    )).toBeTruthy();
    expect(getByText('View Pro plans')).toBeTruthy();

    fireEvent.press(getByLabelText('View Kwilt Pro plans'));
    expect(navModule.__navMocks.navigate).toHaveBeenCalledWith(
      'SettingsManageSubscription',
      expect.objectContaining({
        openPricingDrawer: true,
        openPricingDrawerNonce: expect.any(Number),
      }),
    );
    expect(mockCapture).toHaveBeenCalledWith('upgrade_entry_tapped', {
      source: 'settings_home',
    });
  });

  it('records the visible Free upgrade invitation without showing it to Pro members', async () => {
    const screen = renderWithProviders(<SettingsHomeScreen />);

    expect(mockCapture).toHaveBeenCalledWith('upgrade_entry_viewed', {
      source: 'settings_home',
    });

    mockCapture.mockClear();
    await act(async () => {
      useEntitlementsStore.setState({ isPro: true });
    });
    screen.rerender(<SettingsHomeScreen />);
    expect(mockCapture).not.toHaveBeenCalledWith('upgrade_entry_viewed', expect.anything());
  });

  it('shows Pro members their plan status and management path without an upgrade invitation', () => {
    useEntitlementsStore.setState({ isPro: true });
    const { getByLabelText, getByText, queryByText } = renderWithProviders(<SettingsHomeScreen />);

    expect(getByText('Kwilt Pro')).toBeTruthy();
    expect(getByText('Manage plan')).toBeTruthy();
    expect(queryByText('Let Kwilt carry more of the household load')).toBeNull();
    expect(queryByText('View Pro plans')).toBeNull();

    fireEvent.press(getByLabelText('Manage Kwilt Pro plan'));
    expect(navModule.__navMocks.navigate).toHaveBeenCalledWith('SettingsManageSubscription');
  });

  it('uses the cross-domain Screen Time label at the Settings root', () => {
    const { getByText, queryByText } = renderWithProviders(<SettingsHomeScreen />);

    expect(getByText('Screen Time')).toBeTruthy();
    expect(queryByText('Screen Time Controls')).toBeNull();
  });

  it('routes experimental capabilities through Kwilt Labs instead of exposing Explore directly', () => {
    const { getByText, queryByText } = renderWithProviders(<SettingsHomeScreen />);

    expect(getByText('Kwilt Labs')).toBeTruthy();
    expect(queryByText('Explore')).toBeNull();
    fireEvent.press(getByText('Kwilt Labs'));
    expect(navModule.__navMocks.navigate).toHaveBeenCalledWith('SettingsKwiltLabs');
  });

  it('names the connections destination in plain language', () => {
    const { getByText, queryByText } = renderWithProviders(<SettingsHomeScreen />);

    expect(getByText('Apps & connections')).toBeTruthy();
    expect(queryByText('Connected tools')).toBeNull();
  });

  it('makes the bounded Agent model and context settings reachable', () => {
    const { getByText } = renderWithProviders(<SettingsHomeScreen />);
    fireEvent.press(getByText('Agent'));
    expect(navModule.__navMocks.navigate).toHaveBeenCalledWith('SettingsAiModel');
  });

  it('opens the canonical Household settings surface', () => {
    const { getByText } = renderWithProviders(<SettingsHomeScreen />);
    fireEvent.press(getByText('Household'));
    expect(navModule.__navMocks.navigate).toHaveBeenCalledWith('SettingsHousehold');
  });

  it('keeps Household, meal preferences, and Sharing together without retaining Family', () => {
    const { getByText, getAllByText, queryByText } = renderWithProviders(<SettingsHomeScreen />);

    expect(queryByText('Family')).toBeNull();
    expect(getByText('Household')).toBeTruthy();
    expect(getByText('Meal preferences')).toBeTruthy();
    expect(getAllByText('Sharing')).toHaveLength(1);

    fireEvent.press(getByText('Sharing'));
    expect(navModule.__navMocks.navigate).toHaveBeenCalledWith('SettingsSharing');
  });

  it('keeps incomplete destinations hidden and removes non-settings dashboards', () => {
    const { queryByText } = renderWithProviders(<SettingsHomeScreen />);

    expect(queryByText('Phone Agent')).toBeNull();
    expect(queryByText('Destinations')).toBeNull();
    expect(queryByText('Widgets')).toBeNull();
    expect(queryByText('Haptics')).toBeNull();
    expect(queryByText('No Streak Yet')).toBeNull();
    expect(queryByText('Get Kwilt Pro')).toBeNull();
  });

  it('navigates to SettingsPlanAvailability when Availability is pressed', () => {
    const { getByText } = renderWithProviders(<SettingsHomeScreen />);
    fireEvent.press(getByText('Availability'));
    expect(navModule.__navMocks.navigate).toHaveBeenCalledWith('SettingsPlanAvailability');
  });

  it('navigates to SettingsPlanCalendars when Calendars is pressed', () => {
    const { getByText } = renderWithProviders(<SettingsHomeScreen />);
    fireEvent.press(getByText('Calendars'));
    expect(navModule.__navMocks.navigate).toHaveBeenCalledWith('SettingsPlanCalendars');
  });

  it('navigates to household meal preferences from the shared settings root', () => {
    const { getByText } = renderWithProviders(<SettingsHomeScreen />);
    fireEvent.press(getByText('Meal preferences'));
    expect(navModule.__navMocks.navigate).toHaveBeenCalledWith('SettingsMeals');
  });

  it('navigates to SettingsWeeklyChapters when Weekly Chapters is pressed', () => {
    const { getByText } = renderWithProviders(<SettingsHomeScreen />);
    fireEvent.press(getByText('Weekly Chapters'));
    expect(navModule.__navMocks.navigate).toHaveBeenCalledWith('SettingsWeeklyChapters');
  });

  it('navigates to Games player settings from Kwilt features', () => {
    const { getByText } = renderWithProviders(<SettingsHomeScreen />);
    fireEvent.press(getByText('Games'));
    expect(navModule.__navMocks.navigate).toHaveBeenCalledWith('SettingsGames');
  });

  it('navigates to Legal & privacy from the root Settings menu', () => {
    const { getByText } = renderWithProviders(<SettingsHomeScreen />);
    fireEvent.press(getByText('Legal & privacy'));
    expect(navModule.__navMocks.navigate).toHaveBeenCalledWith('SettingsLegalPrivacy');
  });

  it('opens the canonical Budget settings surface from the Money group', () => {
    const { getByText } = renderWithProviders(<SettingsHomeScreen />);
    fireEvent.press(getByText('Budget'));
    expect(navModule.__navMocks.navigate).toHaveBeenCalledWith('SettingsBudget');
  });

  it('opens capability-owned account management from the Money group', () => {
    const { getByText, queryByText } = renderWithProviders(<SettingsHomeScreen />);

    expect(getByText('Accounts')).toBeTruthy();
    expect(queryByText('Accounts & connections')).toBeNull();
    fireEvent.press(getByText('Accounts'));
    expect(navModule.__navMocks.navigate).toHaveBeenCalledWith('SettingsMoneyAccounts');
    expect(navModule.__navMocks.rootNavigate).not.toHaveBeenCalled();
  });

  it('keeps account deletion off the root Settings menu', () => {
    const { getByText } = renderWithProviders(<SettingsHomeScreen />);
    expect(getByText('Profile & account')).toBeTruthy();
    expect(() => getByText('Delete account')).toThrow();
  });

  it('loads and updates a signed-in account photo through canonical private storage', async () => {
    useAppStore.getState().setAuthIdentity({ userId: 'user-1', name: 'Andrew' });
    mockResolveSelfAvatar.mockResolvedValue({ avatarSource: 'account', avatarUrl: 'https://signed.test/old' });
    mockLaunchImageLibrary.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///picked.jpg', mimeType: 'image/jpeg', fileSize: 123 }],
    });
    mockUploadAvatar.mockResolvedValue({ avatarSource: 'account', avatarUrl: 'https://signed.test/new' });
    const { getByLabelText, getByText } = renderWithProviders(<SettingsHomeScreen />);

    await waitFor(() => expect(useAppStore.getState().userProfile?.avatarUrl).toBe('https://signed.test/old'));
    fireEvent.press(getByLabelText('Change profile photo'));
    fireEvent.press(getByText('Choose from library'));

    await waitFor(() => expect(mockUploadAvatar).toHaveBeenCalledWith({
      source: 'account', fileUri: 'file:///picked.jpg', mimeType: 'image/jpeg', sizeBytes: 123,
    }));
    expect(useAppStore.getState().userProfile?.avatarUrl).toBe('https://signed.test/new');
  });
});

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

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const navigate = jest.fn();
  const getParent = jest.fn(() => ({ navigate: jest.fn() }));
  return {
    ...actual,
    useNavigation: () => ({ navigate, getParent }),
    __navMocks: { navigate, getParent },
  };
});

import { renderWithProviders } from '../../test/renderWithProviders';
import { resetAllStores } from '../../test/storeFixtures';
import { SettingsHomeScreen } from './SettingsHomeScreen';

const navModule = require('@react-navigation/native') as {
  __navMocks: { navigate: jest.Mock; getParent: jest.Mock };
};

describe('SettingsHomeScreen planning group', () => {
  beforeEach(() => {
    resetAllStores();
    navModule.__navMocks.navigate.mockReset();
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
    expect(getByText('Privacy lock')).toBeTruthy();
    expect(getByText('Household access')).toBeTruthy();
    expect(getByText('Profile & account')).toBeTruthy();
    expect(getByText('Subscription')).toBeTruthy();
    expect(queryByText('Money privacy')).toBeNull();
    expect(queryByText('Money household')).toBeNull();
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

  it('navigates to capability-scoped Money privacy from its concrete root label', () => {
    const { getByText } = renderWithProviders(<SettingsHomeScreen />);
    fireEvent.press(getByText('Privacy lock'));
    expect(navModule.__navMocks.navigate).toHaveBeenCalledWith('SettingsMoneyPrivacy');
  });

  it('navigates to Money household access from its concrete root label', () => {
    const { getByText } = renderWithProviders(<SettingsHomeScreen />);
    fireEvent.press(getByText('Household access'));
    expect(navModule.__navMocks.navigate).toHaveBeenCalledWith('SettingsMoneyHousehold');
  });

  it('keeps account deletion off the root Settings menu', () => {
    const { getByText } = renderWithProviders(<SettingsHomeScreen />);
    expect(getByText('Profile & account')).toBeTruthy();
    expect(() => getByText('Delete account')).toThrow();
  });
});

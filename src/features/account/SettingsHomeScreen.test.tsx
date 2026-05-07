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
  });

  it('renders both Availability and Calendars rows in the Settings menu', () => {
    const { getByText } = renderWithProviders(<SettingsHomeScreen />);
    expect(getByText('Availability')).toBeTruthy();
    expect(getByText('Calendars')).toBeTruthy();
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
});

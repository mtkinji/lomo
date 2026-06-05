import { fireEvent, render } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import { LegalPrivacyScreen } from './LegalPrivacyScreen';
import { KWILT_PRIVACY_URL, KWILT_TERMS_URL } from '../paywall/SubscriptionLegalLinks';
import { openManageSubscription } from '../../services/entitlements';

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

jest.mock('../../services/entitlements', () => ({
  openManageSubscription: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const navigate = jest.fn();
  const goBack = jest.fn();
  return {
    ...actual,
    useNavigation: () => ({ navigate, goBack }),
    __navMocks: { navigate, goBack },
  };
});

const navModule = require('@react-navigation/native') as {
  __navMocks: { navigate: jest.Mock; goBack: jest.Mock };
};

describe('LegalPrivacyScreen', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    navModule.__navMocks.navigate.mockReset();
    navModule.__navMocks.goBack.mockReset();
    (openManageSubscription as jest.Mock).mockClear();
  });

  it('opens canonical policy links and support email', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as any);
    const { getByText } = render(<LegalPrivacyScreen />);

    fireEvent.press(getByText('Privacy Policy'));
    fireEvent.press(getByText('Terms of Use (EULA)'));
    fireEvent.press(getByText('Contact support'));

    expect(openURL).toHaveBeenCalledWith(KWILT_PRIVACY_URL);
    expect(openURL).toHaveBeenCalledWith(KWILT_TERMS_URL);
    expect(openURL).toHaveBeenCalledWith('mailto:support@kwilt.app');
  });

  it('routes account deletion to account settings and opens Apple subscriptions', () => {
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const { getByText } = render(<LegalPrivacyScreen />);

    fireEvent.press(getByText('Account deletion'));
    fireEvent.press(getByText('Manage subscription'));

    expect(navModule.__navMocks.navigate).toHaveBeenCalledWith('SettingsProfile');
    expect(openManageSubscription).toHaveBeenCalledTimes(1);
  });
});

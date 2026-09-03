import { fireEvent, render } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import { LegalPrivacyScreen } from './LegalPrivacyScreen';
import { KWILT_PRIVACY_URL, KWILT_TERMS_URL } from '../paywall/SubscriptionLegalLinks';
import { openManageSubscription } from '../../services/entitlements';
import { useAnalyticsConsentStore } from '../../services/analytics/analyticsConsent';

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

jest.mock('../../ui/KwiltSwitch', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { KwiltSwitch: () => React.createElement(View) };
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
    useAnalyticsConsentStore.setState({ status: 'unknown', policyVersion: null, hydrated: true });
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

  it('summarizes the unified Tools for Life privacy scope', () => {
    const { getByText } = render(<LegalPrivacyScreen />);

    expect(getByText(/Money, Explore, meals and groceries, Games/)).toBeTruthy();
    expect(getByText(/AI and voice, calendar, Health, family sharing, and subscriptions/)).toBeTruthy();
  });

  it('starts optional analytics on and supports withdrawal and renewal', () => {
    const screen = render(<LegalPrivacyScreen />);
    const toggle = screen.getByRole('switch', { name: 'Share product analytics' });

    expect(toggle.props.accessibilityState).toEqual(expect.objectContaining({ checked: true }));
    expect(screen.getByText(/does not change any Kwilt feature/i)).toBeTruthy();
    expect(screen.getByText(/does not include your writing, financial details/i)).toBeTruthy();

    fireEvent.press(toggle);
    expect(useAnalyticsConsentStore.getState().status).toBe('withdrawn');
    fireEvent.press(screen.getByRole('switch', { name: 'Share product analytics' }));
    expect(useAnalyticsConsentStore.getState().status).toBe('granted');
  });
});

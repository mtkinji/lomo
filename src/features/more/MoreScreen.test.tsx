import { fireEvent } from '@testing-library/react-native';

import { AnalyticsEvent } from '../../services/analytics/events';
import { usePaywallStore } from '../../store/usePaywallStore';
import { resetAllStores } from '../../test/storeFixtures';
import { renderWithProviders } from '../../test/renderWithProviders';
import { MoreScreen } from './MoreScreen';

const mockCapture = jest.fn();
const mockNavigate = jest.fn();
const mockOpenPaywallPurchaseEntry = jest.fn();
const mockGetFeatureFlag = jest.fn();

jest.mock('../../services/analytics/posthogClient', () => ({
  posthogClient: { getFeatureFlag: (...args: unknown[]) => mockGetFeatureFlag(...args) },
}));

jest.mock('../../services/paywall', () => ({
  openPaywallPurchaseEntry: () => mockOpenPaywallPurchaseEntry(),
}));

jest.mock('../../services/analytics/useAnalytics', () => ({
  useAnalytics: () => ({ capture: mockCapture }),
}));

jest.mock('../../navigation/CapabilityShellContext', () => ({
  useCapabilityShellOptional: () => null,
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate }),
    useFocusEffect: (effect: () => void | (() => void)) => effect(),
  };
});

describe('MoreScreen Pro entry', () => {
  beforeEach(() => {
    resetAllStores();
    mockCapture.mockReset();
    mockNavigate.mockReset();
    mockOpenPaywallPurchaseEntry.mockReset();
    mockGetFeatureFlag.mockReset();
  });

  it('uses the proven Pro promise and attributes the direct purchase path', () => {
    const screen = renderWithProviders(<MoreScreen />);

    expect(
      screen.getByText(
      'A current budget, spending-app check-ins, scheduled and combined Screen Time rules, and 1,000 AI credits each month.',
      ),
    ).toBeTruthy();
    expect(mockCapture).toHaveBeenCalledWith(AnalyticsEvent.UpgradeEntryViewed, {
      source: 'more',
    });

    fireEvent.press(screen.getByRole('button', { name: 'Upgrade to Kwilt Pro' }));

    expect(mockCapture).toHaveBeenCalledWith(AnalyticsEvent.UpgradeEntryTapped, {
      source: 'more',
    });
    expect(usePaywallStore.getState().directEntrySource).toBe('more');
    expect(mockOpenPaywallPurchaseEntry).toHaveBeenCalledTimes(1);
  });

  it('removes Screen Time from the visible Pro promise when the ordinary fallback is active', () => {
    mockGetFeatureFlag.mockReturnValue(false);
    const screen = renderWithProviders(<MoreScreen />);

    expect(screen.getByText(
      'A current budget, spending-app check-ins, and 1,000 AI credits each month.',
    )).toBeTruthy();
    expect(screen.queryByText(/Screen Time rules/i)).toBeNull();
  });
});

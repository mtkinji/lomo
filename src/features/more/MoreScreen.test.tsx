import { fireEvent } from '@testing-library/react-native';

import { AnalyticsEvent } from '../../services/analytics/events';
import { usePaywallStore } from '../../store/usePaywallStore';
import { resetAllStores } from '../../test/storeFixtures';
import { renderWithProviders } from '../../test/renderWithProviders';
import { MoreScreen } from './MoreScreen';

const mockCapture = jest.fn();
const mockNavigate = jest.fn();

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
  });

  it('uses the proven Pro promise and attributes the direct purchase path', () => {
    const screen = renderWithProviders(<MoreScreen />);

    expect(
      screen.getByText(
      'A current budget, spending-app check-ins, multi-condition Screen Time rules, and 1,000 AI credits each month.',
      ),
    ).toBeTruthy();
    expect(mockCapture).toHaveBeenCalledWith(AnalyticsEvent.UpgradeEntryViewed, {
      source: 'more',
    });

    fireEvent.press(screen.getByRole('button', { name: 'View Kwilt Pro plans' }));

    expect(mockCapture).toHaveBeenCalledWith(AnalyticsEvent.UpgradeEntryTapped, {
      source: 'more',
    });
    expect(usePaywallStore.getState().directEntrySource).toBe('more');
    expect(mockNavigate).toHaveBeenCalledWith('Settings', expect.objectContaining({
      screen: 'SettingsManageSubscription',
    }));
  });
});

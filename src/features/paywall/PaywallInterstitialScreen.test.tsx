import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { resetAllStores } from '../../test/storeFixtures';

jest.mock('../account/useProStoreOffer', () => ({
  useProStoreOffer: () => ({ status: 'unavailable', snapshot: null, retry: jest.fn() }),
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const goBack = jest.fn();
  return {
    ...actual,
    useNavigation: () => ({ goBack }),
    useRoute: () => ({
      params: { reason: 'pro_money_budgets', source: 'money_connect_account' },
    }),
    __testGoBack: goBack,
  };
});

import { PaywallInterstitialScreen } from './PaywallInterstitialScreen';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { __testGoBack: goBack } = require('@react-navigation/native') as { __testGoBack: jest.Mock };

describe('PaywallInterstitialScreen', () => {
  beforeEach(() => {
    resetAllStores();
    goBack.mockReset();
  });

  it('renders the underlying paywall content for the route params', () => {
    const { getByLabelText, getByTestId, getByText, queryByTestId } = renderWithProviders(<PaywallInterstitialScreen />);
    expect(getByText('Know what’s left. Stay in control.')).toBeTruthy();
    expect(getByTestId('bottom-drawer.bottom-accessory')).toBeTruthy();
    expect(queryByTestId('bottom-drawer.footer')).toBeNull();
    expect(getByLabelText('Upgrade to Pro')).toBeTruthy();
  });

  it('calls navigation.goBack when the close button is pressed', () => {
    const { getByLabelText } = renderWithProviders(<PaywallInterstitialScreen />);
    fireEvent.press(getByLabelText('Close paywall'));
    expect(goBack).toHaveBeenCalledTimes(1);
  });
});

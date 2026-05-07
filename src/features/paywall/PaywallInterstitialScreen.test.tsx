import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { resetAllStores } from '../../test/storeFixtures';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const goBack = jest.fn();
  return {
    ...actual,
    useNavigation: () => ({ goBack }),
    useRoute: () => ({
      params: { reason: 'limit_arcs_total', source: 'arcs_create' },
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
    const { getByText } = renderWithProviders(<PaywallInterstitialScreen />);
    expect(getByText('Grow into more than one version of yourself')).toBeTruthy();
  });

  it('calls navigation.goBack when the close button is pressed', () => {
    const { getByLabelText } = renderWithProviders(<PaywallInterstitialScreen />);
    fireEvent.press(getByLabelText('Close paywall'));
    expect(goBack).toHaveBeenCalledTimes(1);
  });
});

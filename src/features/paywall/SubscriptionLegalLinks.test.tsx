import { fireEvent, render } from '@testing-library/react-native';
import { Linking } from 'react-native';
import {
  KWILT_PRIVACY_URL,
  KWILT_TERMS_URL,
  SubscriptionLegalLinks,
} from './SubscriptionLegalLinks';

describe('SubscriptionLegalLinks', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('renders compact legal links for the subscriber settings screen', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as any);
    const { getByText } = render(<SubscriptionLegalLinks variant="footer" />);

    fireEvent.press(getByText('Terms of Use (EULA)'));
    fireEvent.press(getByText('Privacy Policy'));

    expect(openURL).toHaveBeenCalledWith(KWILT_TERMS_URL);
    expect(openURL).toHaveBeenCalledWith(KWILT_PRIVACY_URL);
  });
});

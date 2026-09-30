import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../test/renderWithProviders';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import { ProPlanChooserScreen } from './ProPlanChooserScreen';
import type { ProStoreOfferSnapshot } from '../../services/entitlements';

const mockBack = jest.fn();
const mockCapture = jest.fn();
const mockRetry = jest.fn();
let mockSnapshot: ProStoreOfferSnapshot;
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ canGoBack: () => true, goBack: mockBack }),
  useFocusEffect: () => undefined,
}));
jest.mock('../../services/analytics/useAnalytics', () => ({ useAnalytics: () => ({ capture: mockCapture }) }));
jest.mock('./useProStoreOffer', () => ({ useProStoreOffer: () => ({ status: 'ready', snapshot: mockSnapshot, retry: mockRetry }) }));
jest.mock('../../ui/hooks/useAccessibilityPreferences', () => ({
  useAccessibilityPreferences: () => ({ reduceMotionEnabled: true, screenReaderEnabled: false }),
}));

describe('ProPlanChooser lifetime entry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSnapshot = { status: 'ready', products: {
      pro_lifetime: { sku: 'pro_lifetime', price: 29.99, priceString: '$29.99', currencyCode: 'USD', introEligibility: 'no_offer' },
    } };
    useEntitlementsStore.setState({ isPro: false, proAccessType: undefined, isRefreshing: false });
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());
  it('lets an eligible user select the annual trial and purchases the annual product', async () => {
    mockSnapshot.products.pro_annual = { sku: 'pro_annual', price: 59.99, priceString: '$59.99', introEligibility: 'eligible', introPrice: { priceString: '$0.00', type: 'FREE_TRIAL', periodUnit: 'MONTH', periodNumberOfUnits: 1 } };
    const purchase = jest.fn().mockResolvedValue({ isPro: false });
    useEntitlementsStore.setState({ purchase, refreshEntitlements: jest.fn().mockResolvedValue(undefined) });
    const screen = renderWithProviders(<ProPlanChooserScreen />);
    fireEvent.press(screen.getByRole('radio', { name: /Try 1 month free/ }));
    fireEvent.press(screen.getByRole('button', { name: 'Start my free month' }));
    await waitFor(() => expect(purchase).toHaveBeenCalledWith({ plan: 'individual', cadence: 'annual' }));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Purchase pending', expect.any(String)));
    expect(mockBack).not.toHaveBeenCalled();
  });
  it('offers the live annual price without a trial claim when eligibility is unknown', () => {
    mockSnapshot.products.pro_annual = { sku: 'pro_annual', price: 69.99, priceString: '$69.99', introEligibility: 'unknown' };
    const screen = renderWithProviders(<ProPlanChooserScreen />);
    fireEvent.press(screen.getByRole('radio', { name: /Annual/ }));
    expect(screen.getByLabelText('$69.99')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Subscribe to Pro' })).toBeTruthy();
    expect(screen.queryByText('Try 1 month free')).toBeNull();
  });
  it('leads with a real lifetime offer even when subscriptions are unavailable, and allows dismissal', () => {
    const screen = renderWithProviders(<ProPlanChooserScreen />);
    expect(screen.getByLabelText('$29.99')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Close offer' }));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
  it('does not show the purchase offer to lifetime owners or when the product is absent', () => {
    useEntitlementsStore.setState({ isPro: true, proAccessType: 'lifetime' });
    const screen = renderWithProviders(<ProPlanChooserScreen />);
    expect(screen.queryByTestId('foundingOffer')).toBeNull();
    screen.unmount();
    useEntitlementsStore.setState({ isPro: false, proAccessType: undefined });
    mockSnapshot = { status: 'ready', products: {} };
    expect(renderWithProviders(<ProPlanChooserScreen />).queryByTestId('foundingOffer')).toBeNull();
  });
  it('never starts a real purchase from a development fixture', () => {
    mockSnapshot.source = 'development_fixture';
    const purchase = jest.fn();
    useEntitlementsStore.setState({ purchase });
    const screen = renderWithProviders(<ProPlanChooserScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Purchase' }));
    expect(purchase).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith('Simulator offer preview', expect.any(String));
  });
  it('keeps an unconfirmed purchase on the offer instead of claiming success', async () => {
    const purchase = jest.fn().mockResolvedValue({ isPro: false, proAccessType: undefined });
    useEntitlementsStore.setState({ purchase, refreshEntitlements: jest.fn().mockResolvedValue(undefined) });
    const screen = renderWithProviders(<ProPlanChooserScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Purchase' }));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Purchase pending', expect.any(String)));
    expect(purchase).toHaveBeenCalledWith({ lifetime: true });
    expect(mockBack).not.toHaveBeenCalled();
  });
});

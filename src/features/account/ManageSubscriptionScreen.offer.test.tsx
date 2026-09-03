import React from 'react';
import { Alert, StyleSheet } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import type { ProStoreOfferSnapshot } from '../../services/entitlements';
import { renderWithProviders } from '../../test/renderWithProviders';
import { resetAllStores } from '../../test/storeFixtures';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import { AnalyticsEvent } from '../../services/analytics/events';

const mockCapture = jest.fn();
const mockGoBack = jest.fn();
const mockSetParams = jest.fn();
let mockCanGoBack = true;
let mockStoreOfferState: {
  status: 'loading' | 'ready' | 'unavailable';
  snapshot: ProStoreOfferSnapshot | null;
  retry: jest.Mock;
};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const ReactActual = jest.requireActual('react');
  return {
    ...actual,
    useNavigation: () => ({
      canGoBack: () => mockCanGoBack,
      goBack: mockGoBack,
      reset: jest.fn(),
      setParams: mockSetParams,
    }),
    useFocusEffect: (callback: () => void | (() => void)) => ReactActual.useEffect(callback, [callback]),
  };
});

jest.mock('../../navigation/rootNavigationRef', () => ({
  rootNavigationRef: { isReady: () => true, navigate: jest.fn() },
}));

jest.mock('../../ui/BottomDrawer', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    BottomDrawer: ({ visible, children }: { visible: boolean; children: React.ReactNode }) =>
      visible ? ReactActual.createElement(View, null, children) : null,
    BottomDrawerScrollView: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(View, null, children),
  };
});

jest.mock('../../services/analytics/useAnalytics', () => ({
  useAnalytics: () => ({ capture: mockCapture }),
}));

jest.mock('./useProStoreOffer', () => ({
  useProStoreOffer: () => mockStoreOfferState,
}));

jest.mock('../../services/entitlements', () => {
  const actual = jest.requireActual('../../services/entitlements');
  return {
    ...actual,
    getActiveBillingCadence: jest.fn(async () => null),
    openManageSubscription: jest.fn(async () => undefined),
  };
});

import { ProPlanChooserScreen } from './ProPlanChooserScreen';
import { rootNavigationRef } from '../../navigation/rootNavigationRef';

function eligibleSnapshot(): ProStoreOfferSnapshot {
  const product = (sku: string, price: number, priceString: string) => ({
    sku,
    price,
    priceString,
    currencyCode: 'USD',
    introEligibility: 'eligible' as const,
    introPrice: {
      priceString: '$0.00',
      type: 'FREE_TRIAL',
      periodUnit: 'MONTH',
      periodNumberOfUnits: 1,
    },
  });
  return {
    status: 'ready',
    products: {
      pro_monthly: product('pro_monthly', 9.99, '$9.99'),
      pro_annual: product('pro_annual', 59.99, '$59.99'),
      pro_family_monthly: product('pro_family_monthly', 14.99, '$14.99'),
      pro_family_annual: product('pro_family_annual', 79.99, '$79.99'),
    },
  };
}

describe('ProPlanChooserScreen offer', () => {
  beforeEach(() => {
    resetAllStores();
    jest.clearAllMocks();
    mockCanGoBack = true;
    mockStoreOfferState = {
      status: 'ready',
      snapshot: eligibleSnapshot(),
      retry: jest.fn(),
    };
    useEntitlementsStore.setState({
      isPro: false,
      isRefreshing: false,
      identifiedAppUserID: 'user-a',
    });
  });

  it('shows the complete one-month offer and full renewal charge', async () => {
    const { getByText, getByLabelText, getAllByText, queryByText } = renderWithProviders(
      <ProPlanChooserScreen />,
    );

    await waitFor(() => expect(getByText('Choose your plan')).toBeTruthy());
    expect(getByText('Start free trial')).toBeTruthy();
    expect(getByText('1 month free, then $59.99/year. Auto-renews until canceled.')).toBeTruthy();
    expect(getByLabelText('Select Individual, $59.99/yr, Save 50%')).toBeTruthy();
    expect(queryByText('Keep your plan current with connected transactions.')).toBeNull();
    expect(queryByText('Restore')).toBeNull();
    expect(getAllByText('Terms of Use').length).toBeGreaterThan(0);
    expect(getAllByText('Privacy Policy').length).toBeGreaterThan(0);
  });

  it('keeps plan-card border geometry stable when the selection changes', () => {
    const { getByLabelText } = renderWithProviders(<ProPlanChooserScreen />);

    const individualBefore = getByLabelText('Select Individual, $59.99/yr, Save 50%');
    const familyBefore = getByLabelText('Select Family, $79.99/yr, Save 56%');
    const individualBorderBefore = StyleSheet.flatten(individualBefore.props.style).borderWidth;
    const familyBorderBefore = StyleSheet.flatten(familyBefore.props.style).borderWidth;

    fireEvent.press(familyBefore);

    const individualAfter = getByLabelText('Select Individual, $59.99/yr, Save 50%');
    const familyAfter = getByLabelText('Select Family, $79.99/yr, Save 56%');
    expect(StyleSheet.flatten(individualAfter.props.style).borderWidth).toBe(individualBorderBefore);
    expect(StyleSheet.flatten(familyAfter.props.style).borderWidth).toBe(familyBorderBefore);
  });

  it('classifies a completed trial from the returned RevenueCat period', async () => {
    const purchase = jest.fn(async () => ({
      isPro: true,
      isProToolsTrial: false,
      proPeriodType: 'trial' as const,
      checkedAt: new Date().toISOString(),
      source: 'revenuecat' as const,
    }));
    useEntitlementsStore.setState({ purchase });
    const { getByText } = renderWithProviders(
      <ProPlanChooserScreen />,
    );

    await waitFor(() => expect(getByText('Start free trial')).toBeTruthy());
    fireEvent.press(getByText('Start free trial'));
    await waitFor(() => expect(purchase).toHaveBeenCalled());
    expect(mockCapture).toHaveBeenCalledWith(
      AnalyticsEvent.FreeTrialStarted,
      expect.objectContaining({ product_id: 'pro_annual', offer_state: 'trial' }),
    );
  });

  it('treats Apple purchase cancellation as a neutral dismissal', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const purchase = jest.fn(async () => {
      throw { userCancelled: true };
    });
    useEntitlementsStore.setState({ purchase });
    const { getByText } = renderWithProviders(
      <ProPlanChooserScreen />,
    );

    await waitFor(() => expect(getByText('Start free trial')).toBeTruthy());
    fireEvent.press(getByText('Start free trial'));
    await waitFor(() => expect(purchase).toHaveBeenCalled());
    expect(mockCapture).not.toHaveBeenCalledWith(
      AnalyticsEvent.PurchaseFailed,
      expect.anything(),
    );
    expect(alert).not.toHaveBeenCalledWith('Purchase failed', expect.anything());
  });

  it('shows a useful retry state when Apple plans are unavailable', async () => {
    mockStoreOfferState = {
      status: 'unavailable',
      snapshot: null,
      retry: jest.fn(),
    };
    const { getByText, queryByText } = renderWithProviders(
      <ProPlanChooserScreen />,
    );

    await waitFor(() => expect(getByText('Plans aren’t available right now')).toBeTruthy());
    expect(getByText('Try again')).toBeTruthy();
    expect(queryByText('Price unavailable')).toBeNull();
  });

  it('keeps the Simulator offer interactive without pretending to start an Apple purchase', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const purchase = jest.fn();
    useEntitlementsStore.setState({ purchase });
    mockStoreOfferState = {
      status: 'ready',
      snapshot: { ...eligibleSnapshot(), source: 'development_fixture' },
      retry: jest.fn(),
    };
    const { getByText, queryByText } = renderWithProviders(<ProPlanChooserScreen />);

    await waitFor(() => expect(getByText('Start free trial')).toBeTruthy());
    expect(queryByText('Simulator offer preview')).toBeNull();
    fireEvent.press(getByText('Start free trial'));

    expect(purchase).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith(
      'Simulator offer preview',
      expect.stringContaining('Live Apple'),
    );
  });

  it('returns to the originating screen with the standard Back affordance', () => {
    const { getByLabelText } = renderWithProviders(<ProPlanChooserScreen />);

    fireEvent.press(getByLabelText('Go back from Choose your plan'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('falls back to Subscriptions when there is no navigation history', () => {
    mockCanGoBack = false;
    const { getByLabelText } = renderWithProviders(<ProPlanChooserScreen />);

    fireEvent.press(getByLabelText('Go back from Choose your plan'));

    expect(rootNavigationRef.navigate).toHaveBeenCalledWith('Settings', {
      screen: 'SettingsManageSubscription',
    });
  });
});

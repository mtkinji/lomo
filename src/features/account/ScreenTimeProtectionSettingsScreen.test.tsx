import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import type { MoneyAppControlSettings } from '../../capabilities/money/domain/moneyAppControl';
import { DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS } from '../../services/screenTimeProtection';
import { renderWithProviders } from '../../test/renderWithProviders';
import { resetAllStores } from '../../test/storeFixtures';
import { useAppStore } from '../../store/useAppStore';
import type { HouseholdSnapshot } from '../household/data/household';
import { ScreenTimeProtectionSettingsScreen } from './ScreenTimeProtectionSettingsScreen';

const mockSettingsNavigate = jest.fn();
const mockRootNavigate = jest.fn();
const mockGetHouseholdSnapshot = jest.fn();
const mockMoneySettings = jest.fn<MoneyAppControlSettings, []>();
const mockGetScreenTimeAuthorizationStatus = jest.fn();
const mockRequestScreenTimeAuthorization = jest.fn();
let mockRouteParams: Record<string, unknown> | undefined;

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const React = require('react');
  return {
    ...actual,
    useFocusEffect: (callback: () => void | (() => void)) => React.useEffect(callback, [callback]),
    useNavigation: () => ({
      goBack: jest.fn(),
      navigate: mockSettingsNavigate,
      getParent: () => ({ navigate: mockRootNavigate }),
    }),
    useRoute: () => ({ params: mockRouteParams }),
  };
});

jest.mock('../../services/backend/supabaseClient', () => ({
  getSupabaseClient: () => ({ rpc: jest.fn() }),
}));

jest.mock('../household/data/household', () => ({
  getHouseholdSnapshot: (...args: unknown[]) => mockGetHouseholdSnapshot(...args),
}));

jest.mock('../../capabilities/money/runtime/moneyAppControlStorage', () => ({
  useMoneyAppControlSettings: () => ({
    settings: mockMoneySettings(),
    loaded: true,
    save: jest.fn(),
  }),
}));

jest.mock('../../services/appleEcosystem/screenTimeProtection', () => ({
  getScreenTimeAuthorizationStatus: (...args: unknown[]) => mockGetScreenTimeAuthorizationStatus(...args),
  presentScreenTimeActivityPicker: jest.fn(),
  requestScreenTimeAuthorization: (...args: unknown[]) => mockRequestScreenTimeAuthorization(...args),
}));

jest.mock('../../services/screenTimeProtectionRuntime', () => ({
  reconcileScreenTimeRestrictions: jest.fn(async () => []),
}));

jest.mock('../../services/analytics/useAnalytics', () => ({
  useAnalytics: () => ({ capture: jest.fn() }),
}));

const household: HouseholdSnapshot = {
  household: { id: 'household-1', name: 'My household' },
  currentMembershipId: 'owner-1',
  members: [
    { id: 'owner-1', personId: 'person-1', displayName: 'Andrew', kind: 'adult', role: 'owner' },
    { id: 'child-charlie', personId: 'person-2', displayName: 'Charlie', kind: 'dependent', role: 'child' },
  ],
  activations: [
    { childMembershipId: 'child-charlie', capabilityId: 'screen-time', state: 'pending_setup' },
  ],
  grants: [],
};

const money: MoneyAppControlSettings = {
  authorizationStatus: 'approved',
  policies: {
    shopping: {
      enabled: true,
      preset: 'always_review',
      unlockWindowMinutes: 20,
      selectedApps: [{ token: 'amazon' }],
      selectedCategories: [],
      lastReview: null,
    },
  },
  lastUpdated: null,
};

describe('ScreenTimeProtectionSettingsScreen overview', () => {
  beforeEach(() => {
    resetAllStores();
    mockSettingsNavigate.mockReset();
    mockRootNavigate.mockReset();
    mockGetHouseholdSnapshot.mockReset().mockResolvedValue(household);
    mockMoneySettings.mockReset().mockReturnValue(money);
    mockGetScreenTimeAuthorizationStatus.mockReset().mockResolvedValue('approved');
    mockRequestScreenTimeAuthorization.mockReset().mockResolvedValue('approved');
    mockRouteParams = undefined;
    useAppStore.getState().setAuthIdentity({
      userId: 'user-1',
      email: 'andrew@example.com',
      name: 'Andrew',
    });
    useAppStore.setState({
      screenTimeProtection: {
        ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
        authorizationStatus: 'approved',
        selectedApps: [{ token: 'social' }],
        focusProtection: {
          ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS.focusProtection,
          enabled: true,
          setupCompleted: true,
        },
      },
    });
  });

  it('shows personal, Family, and Money state without duplicating their editors', async () => {
    const { getByText, queryByText } = renderWithProviders(<ScreenTimeProtectionSettingsScreen />);

    expect(getByText('Screen Time')).toBeTruthy();
    expect(getByText('My Screen Time')).toBeTruthy();
    expect(await waitFor(() => getByText('Charlie'))).toBeTruthy();
    expect(getByText('Set up')).toBeTruthy();
    expect(getByText('Money app controls')).toBeTruthy();
    expect(getByText('1 category')).toBeTruthy();
    expect(queryByText('Shopping policy')).toBeNull();
  });

  it('routes Family and Money rows to their canonical owners', async () => {
    const { getByText } = renderWithProviders(<ScreenTimeProtectionSettingsScreen />);
    await waitFor(() => expect(getByText('Charlie')).toBeTruthy());

    fireEvent.press(getByText('Charlie'));
    expect(mockSettingsNavigate).toHaveBeenCalledWith('SettingsFamilyScreenTime', {
      childMembershipId: 'child-charlie',
      childDisplayName: 'Charlie',
    });

    fireEvent.press(getByText('Money app controls'));
    expect(mockRootNavigate).toHaveBeenCalledWith('Money', {
      screen: 'MoneyAppControl',
      params: { categoryId: 'shopping' },
    });
  });

  it('does not show empty Family or Money groups', async () => {
    mockGetHouseholdSnapshot.mockResolvedValue({
      household: null,
      currentMembershipId: null,
      members: [],
      activations: [],
      grants: [],
    });
    mockMoneySettings.mockReturnValue({ ...money, policies: {} });

    const { queryByText } = renderWithProviders(<ScreenTimeProtectionSettingsScreen />);
    await waitFor(() => expect(mockGetHouseholdSnapshot).toHaveBeenCalled());

    expect(queryByText('Family')).toBeNull();
    expect(queryByText('Money')).toBeNull();
  });

  it('shows a recoverable Household row when family state cannot load', async () => {
    mockGetHouseholdSnapshot.mockRejectedValue(new Error('offline'));

    const { getByText } = renderWithProviders(<ScreenTimeProtectionSettingsScreen />);
    expect(await waitFor(() => getByText('Household'))).toBeTruthy();
    expect(getByText('Unavailable')).toBeTruthy();

    fireEvent.press(getByText('Household'));
    expect(mockSettingsNavigate).toHaveBeenCalledWith('SettingsHousehold');
  });

  it('returns to setup when native authorization invalidates persisted completion', async () => {
    mockGetScreenTimeAuthorizationStatus.mockResolvedValue('notDetermined');

    const { getByText } = renderWithProviders(<ScreenTimeProtectionSettingsScreen />);

    expect(await waitFor(() => getByText('Do what matters first.'))).toBeTruthy();
    expect(useAppStore.getState().screenTimeProtection.authorizationStatus).toBe('notDetermined');
  });

  it('reopens guided setup when an incomplete user deliberately enters from Focus', async () => {
    mockGetScreenTimeAuthorizationStatus.mockResolvedValue('notDetermined');
    useAppStore.setState({
      screenTimeProtection: {
        ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
        authorizationStatus: 'notDetermined',
      },
    });

    const screen = renderWithProviders(<ScreenTimeProtectionSettingsScreen />);
    expect(screen.getByText('Do what matters first.')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Close Screen Time Controls setup'));
    expect(screen.queryByText('Do what matters first.')).toBeNull();
    expect(screen.getByText('Screen Time access is needed.')).toBeTruthy();

    mockRouteParams = {
      setupIntent: 'focus_sessions',
      entrySurface: 'focus_drawer',
      returnToActivityId: 'activity-1',
    };
    screen.rerender(<ScreenTimeProtectionSettingsScreen />);

    expect(await screen.findByText('Fewer distractions during Focus.')).toBeTruthy();
  });

  it('explains a missing Screen Time capability inline without showing a duplicate alert', async () => {
    mockGetScreenTimeAuthorizationStatus.mockResolvedValue('notDetermined');
    mockRequestScreenTimeAuthorization.mockResolvedValue('unavailable');
    useAppStore.setState({
      screenTimeProtection: {
        ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
        authorizationStatus: 'notDetermined',
      },
    });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    const screen = renderWithProviders(<ScreenTimeProtectionSettingsScreen />);
    fireEvent.press(screen.getByText('Set Up'));
    fireEvent.press(screen.getByText('Continue'));

    expect(await screen.findByText(
      'Screen Time is unavailable in this build. Reinstall an entitlement-enabled development build to continue.',
    )).toBeTruthy();
    expect(alert).not.toHaveBeenCalled();
    alert.mockRestore();
  });

  it('stays in management when the user intentionally turns every rule off', async () => {
    const { queryByText } = renderWithProviders(<ScreenTimeProtectionSettingsScreen />);

    await act(async () => {
      useAppStore.getState().setScreenTimeProtection((current) => ({
        ...current,
        focusProtection: { ...current.focusProtection, enabled: false },
      }));
    });

    expect(queryByText('Do what matters first.')).toBeNull();
  });

  it('makes each setup rule card an accessible checkbox across every selection combination', async () => {
    useAppStore.setState((state) => ({
      screenTimeProtection: {
        ...state.screenTimeProtection,
        focusProtection: {
          ...state.screenTimeProtection.focusProtection,
          enabled: false,
          setupCompleted: false,
        },
        meaningfulFirst: {
          ...state.screenTimeProtection.meaningfulFirst,
          enabled: false,
          setupCompleted: false,
        },
      },
    }));

    const { getByLabelText, getByText } = renderWithProviders(<ScreenTimeProtectionSettingsScreen />);
    fireEvent.press(getByText('Set Up'));

    const realStep = await waitFor(() => getByLabelText('A real step'));
    const focus = getByLabelText('Focus');
    expect(realStep.props.accessibilityState).toMatchObject({ checked: false });
    expect(focus.props.accessibilityState).toMatchObject({ checked: false });

    fireEvent.press(realStep);
    expect(getByLabelText('A real step').props.accessibilityState).toMatchObject({ checked: true });
    expect(getByLabelText('Focus').props.accessibilityState).toMatchObject({ checked: false });

    fireEvent.press(getByLabelText('Focus'));
    expect(getByLabelText('A real step').props.accessibilityState).toMatchObject({ checked: true });
    expect(getByLabelText('Focus').props.accessibilityState).toMatchObject({ checked: true });

    fireEvent.press(getByLabelText('A real step'));
    expect(getByLabelText('A real step').props.accessibilityState).toMatchObject({ checked: false });
    expect(getByLabelText('Focus').props.accessibilityState).toMatchObject({ checked: true });
  });

  it('creates independently identified rules when both setup cards are selected', async () => {
    useAppStore.setState({
      screenTimeProtection: {
        ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
        authorizationStatus: 'approved',
        selectedApps: [{ token: 'social', label: 'Social' }],
      },
    });

    const screen = renderWithProviders(<ScreenTimeProtectionSettingsScreen />);
    fireEvent.press(screen.getByText('Set Up'));
    fireEvent.press(await screen.findByLabelText('A real step'));
    fireEvent.press(screen.getByLabelText('Focus'));
    fireEvent.press(screen.getByText('Done'));

    await waitFor(() => expect(useAppStore.getState().screenTimeProtection.personalRules).toEqual([
      expect.objectContaining({
        kind: 'real_step',
        selectionId: 'personal_real_step',
        selectedApps: [{ token: 'social', label: 'Social' }],
      }),
      expect.objectContaining({
        kind: 'focus',
        selectionId: 'personal_focus',
        selectedApps: [{ token: 'social', label: 'Social' }],
      }),
    ]));
  });
});

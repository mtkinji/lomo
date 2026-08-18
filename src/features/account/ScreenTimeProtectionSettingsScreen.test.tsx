import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import type { MoneyAppControlSettings } from '../../capabilities/money/domain/moneyAppControl';
import { presentScreenTimeActivityPicker } from '../../services/appleEcosystem/screenTimeProtection';
import { DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS } from '../../services/screenTimeProtection';
import { renderWithProviders } from '../../test/renderWithProviders';
import { resetAllStores } from '../../test/storeFixtures';
import { useAppStore } from '../../store/useAppStore';
import { usePersonalRuleBuilderDrawerStore } from '../screen-time/rule-builder/usePersonalRuleBuilderDrawerStore';
import type { HouseholdSnapshot } from '../household/data/household';
import { ScreenTimeProtectionSettingsScreen } from './ScreenTimeProtectionSettingsScreen';

const mockSettingsNavigate = jest.fn();
const mockRootNavigate = jest.fn();
const mockRootGoBack = jest.fn();
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
      getParent: () => ({ navigate: mockRootNavigate, goBack: mockRootGoBack }),
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
      selectedApps: [{ token: 'amazon', label: 'Amazon' }],
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
    mockRootGoBack.mockReset();
    usePersonalRuleBuilderDrawerStore.getState().close();
    mockGetHouseholdSnapshot.mockReset().mockResolvedValue(household);
    mockMoneySettings.mockReset().mockReturnValue(money);
    mockGetScreenTimeAuthorizationStatus.mockReset().mockResolvedValue('approved');
    mockRequestScreenTimeAuthorization.mockReset().mockResolvedValue('approved');
    (presentScreenTimeActivityPicker as jest.Mock).mockReset().mockResolvedValue(null);
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
        selectedApps: [{ token: 'social', label: 'Social' }],
        focusProtection: {
          ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS.focusProtection,
          enabled: true,
          setupCompleted: true,
        },
      },
    });
  });

  it('shows scoped rule counts, individual Money rules, and Household setup', async () => {
    const { getByText, queryByText } = renderWithProviders(<ScreenTimeProtectionSettingsScreen />);

    expect(getByText('Screen Time')).toBeTruthy();
    expect(getByText('My rules · 2')).toBeTruthy();
    expect(getByText('Household rules · 0')).toBeTruthy();
    expect(await waitFor(() => getByText('Charlie'))).toBeTruthy();
    expect(getByText('Set up')).toBeTruthy();
    expect(getByText('Amazon')).toBeTruthy();
    expect(getByText('Pause until Shopping is reviewed.')).toBeTruthy();
    expect(getByText('Household setup')).toBeTruthy();
    expect(queryByText('Family')).toBeNull();
    expect(queryByText('Shopping policy')).toBeNull();
  });

  it('routes Household setup and an individual Money rule to their canonical owners', async () => {
    const { getByText } = renderWithProviders(<ScreenTimeProtectionSettingsScreen />);
    await waitFor(() => expect(getByText('Charlie')).toBeTruthy());

    fireEvent.press(getByText('Charlie'));
    expect(mockSettingsNavigate).toHaveBeenCalledWith('SettingsFamilyScreenTime', {
      childMembershipId: 'child-charlie',
      childDisplayName: 'Charlie',
    });

    fireEvent.press(getByText('Amazon'));
    expect(mockRootNavigate).toHaveBeenCalledWith('Money', {
      screen: 'MoneyAppControl',
      params: { categoryId: 'shopping' },
    });
  });

  it('carries Household scope from its group add action into the named child flow', async () => {
    const { getByLabelText, getByText } = renderWithProviders(<ScreenTimeProtectionSettingsScreen />);
    await waitFor(() => expect(getByText('Charlie')).toBeTruthy());

    fireEvent.press(getByLabelText('Add Household rule'));

    expect(mockSettingsNavigate).toHaveBeenCalledWith('SettingsFamilyScreenTime', {
      childMembershipId: 'child-charlie',
      childDisplayName: 'Charlie',
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

    expect(queryByText('Household setup')).toBeNull();
    expect(queryByText('Pause until Shopping is reviewed.')).toBeNull();
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
    expect(screen.getByText('Screen Time access')).toBeTruthy();
    expect(screen.getByText('Not set up')).toBeTruthy();

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

  it('returns an authorized Focus offer to its Activity and opens the root rule drawer', async () => {
    mockRouteParams = {
      setupIntent: 'focus_sessions',
      entrySurface: 'focus_drawer',
      returnToActivityId: 'activity-1',
    };
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

    const { getByText } = renderWithProviders(<ScreenTimeProtectionSettingsScreen />);
    fireEvent.press(getByText('Set Up'));

    expect(mockRootGoBack).toHaveBeenCalledTimes(1);
    expect(usePersonalRuleBuilderDrawerStore.getState().request?.params).toEqual({
      entry: 'contextual',
      suggestedKind: 'focus',
      setupIntent: 'focus_sessions',
      entrySurface: 'focus_drawer',
    });
    expect(mockSettingsNavigate).not.toHaveBeenCalledWith(
      'SettingsScreenTimeRuleBuilder',
      expect.anything(),
    );
  });

  it('continues from Screen Time permission into the contextual rule builder', async () => {
    mockRouteParams = {
      setupIntent: 'meaningful_first_pattern_building',
      entrySurface: 'settings',
    };
    useAppStore.setState({
      screenTimeProtection: {
        ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
        authorizationStatus: 'notDetermined',
      },
    });
    mockGetScreenTimeAuthorizationStatus.mockResolvedValue('notDetermined');

    const screen = renderWithProviders(<ScreenTimeProtectionSettingsScreen />);
    fireEvent.press(screen.getByText('Set Up'));
    fireEvent.press(screen.getByText('Continue'));

    await waitFor(() => expect(mockSettingsNavigate).toHaveBeenCalledWith(
      'SettingsScreenTimeRuleBuilder',
      {
        entry: 'contextual',
        suggestedKind: 'real_step',
        setupIntent: 'meaningful_first_pattern_building',
        entrySurface: 'settings',
      },
    ));
  });

  it('routes the My rules add action into the guided builder', () => {
    const screen = renderWithProviders(<ScreenTimeProtectionSettingsScreen />);
    fireEvent.press(screen.getByLabelText('Add My rule'));

    expect(mockSettingsNavigate).toHaveBeenCalledWith('SettingsScreenTimeRuleBuilder', {
      entry: 'inventory',
    });
  });

  it('keeps Add available and toggles one repeated rule by identity', () => {
    useAppStore.setState({
      screenTimeProtection: {
        ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
        authorizationStatus: 'approved',
        personalRules: [
          {
            id: 'focus-social',
            kind: 'focus',
            selectionId: 'focus-social',
            selectedApps: [{ token: 'social', label: 'Social' }],
            selectedCategories: [],
            enabled: true,
            setupCompleted: true,
            temporaryOpenAllowed: true,
            temporaryOpenMinutes: 20,
            currentUnlockUntilIso: null,
            needsSelectionReview: false,
            lastUpdated: null,
            lastAppliedSessionId: null,
          },
          {
            id: 'focus-video',
            kind: 'focus',
            selectionId: 'focus-video',
            selectedApps: [{ token: 'video', label: 'YouTube' }],
            selectedCategories: [],
            enabled: true,
            setupCompleted: true,
            temporaryOpenAllowed: true,
            temporaryOpenMinutes: 20,
            currentUnlockUntilIso: null,
            needsSelectionReview: false,
            lastUpdated: null,
            lastAppliedSessionId: null,
          },
        ],
      },
    });

    const screen = renderWithProviders(<ScreenTimeProtectionSettingsScreen />);
    expect(screen.getByLabelText('Add My rule').props.accessibilityState.disabled).toBe(false);

    fireEvent.press(screen.getByLabelText('YouTube on'));

    const rules = useAppStore.getState().screenTimeProtection.personalRules;
    expect(rules.find((rule) => rule.id === 'focus-social')?.enabled).toBe(true);
    expect(rules.find((rule) => rule.id === 'focus-video')?.enabled).toBe(false);
  });
});

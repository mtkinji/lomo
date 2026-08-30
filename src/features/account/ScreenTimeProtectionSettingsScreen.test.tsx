import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, StyleSheet } from 'react-native';
import { presentScreenTimeActivityPicker } from '../../services/appleEcosystem/screenTimeProtection';
import { DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS } from '../../services/screenTimeProtection';
import { renderWithProviders } from '../../test/renderWithProviders';
import { resetAllStores } from '../../test/storeFixtures';
import { useAppStore } from '../../store/useAppStore';
import { colors } from '../../theme';
import type { HouseholdSnapshot } from '../household/data/household';
import { ScreenTimeProtectionSettingsScreen } from './ScreenTimeProtectionSettingsScreen';

jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, renderRightActions }: { children: React.ReactNode; renderRightActions?: (...args: unknown[]) => React.ReactNode }) => (
      <View>{children}{renderRightActions?.(undefined, undefined, { close: jest.fn() })}</View>
    ),
  };
});

const mockSettingsNavigate = jest.fn();
const mockGetHouseholdSnapshot = jest.fn();
const mockGetScreenTimeAuthorizationStatus = jest.fn();
const mockRequestScreenTimeAuthorization = jest.fn();
const mockEnsureCurrentRuleSystem = jest.fn();
let mockRouteParams: Record<string, unknown> | undefined;
let mockFocusEpoch = 0;

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const React = require('react');
  return {
    ...actual,
    useFocusEffect: (callback: () => void | (() => void)) => React.useEffect(callback, [callback, mockFocusEpoch]),
    useNavigation: () => ({
      goBack: jest.fn(),
      navigate: mockSettingsNavigate,
      getParent: () => ({ navigate: jest.fn() }),
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


jest.mock('../../services/appleEcosystem/screenTimeProtection', () => ({
  getScreenTimeAuthorizationStatus: (...args: unknown[]) => mockGetScreenTimeAuthorizationStatus(...args),
  presentScreenTimeActivityPicker: jest.fn(),
  requestScreenTimeAuthorization: (...args: unknown[]) => mockRequestScreenTimeAuthorization(...args),
}));

jest.mock('../../services/screenTimeProtectionRuntime', () => ({
  activatePersonalCompositeScreenTimeRule: jest.fn(async () => true),
  deactivatePersonalCompositeScreenTimeRule: jest.fn(async () => true),
  activatePersonalScreenTimeRule: jest.fn(async () => true),
  deactivatePersonalScreenTimeRule: jest.fn(async () => true),
  reconcileScreenTimeRestrictions: jest.fn(async () => []),
}));

jest.mock('../screen-time/runtime/screenTimeRuleSystemCleanupRuntime', () => ({
  ensureCurrentScreenTimeRuleSystem: (...args: unknown[]) => mockEnsureCurrentRuleSystem(...args),
}));

jest.mock('../../services/analytics/useAnalytics', () => ({
  useAnalytics: () => ({ capture: jest.fn() }),
}));

const household: HouseholdSnapshot = {
  household: { id: 'household-1', name: 'My household' },
  currentMembershipId: 'owner-1',
  members: [
    { id: 'owner-1', personId: 'person-1', displayName: 'Andrew', kind: 'adult', role: 'owner', updatedAt: 'version' },
    { id: 'child-charlie', personId: 'person-2', displayName: 'Charlie', kind: 'dependent', role: 'child', updatedAt: 'version' },
  ],
  activations: [
    { childMembershipId: 'child-charlie', capabilityId: 'screen-time', state: 'pending_setup' },
  ],
  grants: [],
};

const focusRule = (id: string, label: string) => ({
  id, selectionId: id, selectedApps: [{ token: id, label }], selectedCategories: [],
  enabled: true, setupCompleted: true, connector: 'all' as const, outcome: 'pause' as const,
  conditions: [{ id: `${id}:focus`, type: 'focus_active' as const, operator: 'is' as const, value: true as const }],
  temporaryOpenUntilIso: null, lastUpdated: null,
});

describe('ScreenTimeProtectionSettingsScreen overview', () => {
  beforeEach(() => {
    resetAllStores();
    mockSettingsNavigate.mockReset();
    mockGetHouseholdSnapshot.mockReset().mockResolvedValue(household);
    mockGetScreenTimeAuthorizationStatus.mockReset().mockResolvedValue('approved');
    mockRequestScreenTimeAuthorization.mockReset().mockResolvedValue('approved');
    mockEnsureCurrentRuleSystem.mockReset().mockResolvedValue(true);
    mockFocusEpoch = 0;
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
        personalCompositeRules: [focusRule('focus-social', 'Social')],
      },
    });
  });

  it('shows canonical rule counts and Household setup without a separate Money inventory', async () => {
    const { getByRole, getByTestId, getByText, queryByText } = renderWithProviders(<ScreenTimeProtectionSettingsScreen />);

    expect(getByText('Screen Time')).toBeTruthy();
    expect(getByRole('button', { name: 'Go back from Screen Time' })).toBeTruthy();
    expect(StyleSheet.flatten(getByTestId('app-shell-container').props.style)).toMatchObject({
      backgroundColor: colors.shellAlt,
    });
    expect(getByText('My rules · 1')).toBeTruthy();
    expect(getByText('Household rules · 0')).toBeTruthy();
    expect(await waitFor(() => getByText('Charlie'))).toBeTruthy();
    expect(getByText('Set up')).toBeTruthy();
    expect(getByText('Social')).toBeTruthy();
    expect(getByText('Household setup')).toBeTruthy();
    expect(queryByText('Family')).toBeNull();
    expect(queryByText('Shopping policy')).toBeNull();
  });

  it('routes Household setup and a personal rule to their canonical editors', async () => {
    const { getByText } = renderWithProviders(<ScreenTimeProtectionSettingsScreen />);
    await waitFor(() => expect(getByText('Charlie')).toBeTruthy());

    fireEvent.press(getByText('Charlie'));
    expect(mockSettingsNavigate).toHaveBeenCalledWith('SettingsFamilyScreenTime', {
      householdId: 'household-1',
      childMembershipId: 'child-charlie',
      childDisplayName: 'Charlie',
    });

    fireEvent.press(getByText('Social'));
    expect(mockSettingsNavigate).toHaveBeenCalledWith('SettingsScreenTimeRuleBuilder', {
      entry: 'inventory', ruleId: 'focus-social',
    });
  });

  it('carries Household scope from its group add action into the named child flow', async () => {
    const { getByLabelText, getByText } = renderWithProviders(<ScreenTimeProtectionSettingsScreen />);
    await waitFor(() => expect(getByText('Charlie')).toBeTruthy());

    fireEvent.press(getByLabelText('Add Household rule'));

    expect(mockSettingsNavigate).toHaveBeenCalledWith('SettingsFamilyScreenTime', {
      householdId: 'household-1',
      childMembershipId: 'child-charlie',
      childDisplayName: 'Charlie',
    });
  });

  it('does not show an empty Household setup group', async () => {
    mockGetHouseholdSnapshot.mockResolvedValue({
      household: null,
      currentMembershipId: null,
      members: [],
      activations: [],
      grants: [],
    });

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

  it('shows one calm retry row when old native controls could not be cleared', () => {
    useAppStore.setState((state) => ({
      screenTimeProtection: { ...state.screenTimeProtection, ruleSystemCleanupStatus: 'needs_attention' },
    }));
    const screen = renderWithProviders(<ScreenTimeProtectionSettingsScreen />);

    expect(screen.getByText('Finish updating Screen Time rules')).toBeTruthy();
    expect(screen.getByText("Kwilt couldn't finish removing older Screen Time controls on this iPhone. Keep Kwilt installed and try again.")).toBeTruthy();
    fireEvent.press(screen.getByText('Finish updating Screen Time rules'));
    expect(mockEnsureCurrentRuleSystem).toHaveBeenCalledTimes(1);
  });

  it('returns to setup when native authorization invalidates persisted completion', async () => {
    mockGetScreenTimeAuthorizationStatus.mockResolvedValue('notDetermined');

    const { getByTestId, getByText } = renderWithProviders(<ScreenTimeProtectionSettingsScreen />);

    expect(await waitFor(() => getByText('Do what matters first.'))).toBeTruthy();
    expect(
      StyleSheet.flatten(getByTestId(
        'bottom-drawer.handle-layout-spacer',
        { includeHiddenElements: true },
      ).props.style),
    ).not.toHaveProperty('backgroundColor');
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

  it('keeps a dismissed setup drawer closed when the same route regains focus', async () => {
    mockGetScreenTimeAuthorizationStatus.mockResolvedValue('notDetermined');
    useAppStore.setState({
      screenTimeProtection: {
        ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
        authorizationStatus: 'notDetermined',
      },
    });

    const screen = renderWithProviders(<ScreenTimeProtectionSettingsScreen />);
    fireEvent.press(screen.getByLabelText('Close Screen Time Controls setup'));
    expect(screen.queryByText('Do what matters first.')).toBeNull();

    mockFocusEpoch += 1;
    screen.rerender(<ScreenTimeProtectionSettingsScreen />);

    await waitFor(() => expect(screen.queryByText('Do what matters first.')).toBeNull());
    expect(screen.getByText('Screen Time access')).toBeTruthy();
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
        personalCompositeRules: current.personalCompositeRules.map((rule) => ({ ...rule, enabled: false })),
      }));
    });

    expect(queryByText('Do what matters first.')).toBeNull();
  });

  it('continues an authorized Focus offer in the standard rule management page', async () => {
    mockRouteParams = {
      setupIntent: 'focus_sessions',
      entrySurface: 'focus_drawer',
      returnToActivityId: 'activity-1',
    };
    useAppStore.setState((state) => ({
      screenTimeProtection: {
        ...state.screenTimeProtection,
        personalCompositeRules: [],
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

    expect(mockSettingsNavigate).toHaveBeenCalledWith('SettingsScreenTimeRuleBuilder', {
      entry: 'contextual', suggestedKind: 'focus', setupIntent: 'focus_sessions',
      entrySurface: 'focus_drawer',
    });
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

  it('keeps repeated rules as uniform detail rows with direct enabled controls', async () => {
    useAppStore.setState({
      screenTimeProtection: {
        ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
        authorizationStatus: 'approved',
        personalCompositeRules: [focusRule('focus-social', 'Social'), focusRule('focus-video', 'YouTube')],
      },
    });

    const screen = renderWithProviders(<ScreenTimeProtectionSettingsScreen />);
    expect(screen.getByLabelText('Add My rule').props.accessibilityState.disabled).toBe(false);
    expect(screen.queryAllByRole('switch')).toHaveLength(2);

    fireEvent.press(screen.getByRole('switch', { name: 'YouTube rule enabled' }));
    await waitFor(() => expect(useAppStore.getState().screenTimeProtection.personalCompositeRules
      .find((rule) => rule.id === 'focus-video')?.enabled).toBe(false));

    fireEvent.press(screen.getByLabelText('YouTube. Pause while Focus is active. Off'));

    expect(mockSettingsNavigate).toHaveBeenCalledWith('SettingsScreenTimeRuleBuilder', {
      entry: 'inventory',
      ruleId: 'focus-video',
    });
    expect(presentScreenTimeActivityPicker).not.toHaveBeenCalled();
  });

  it('confirms a personal-rule deletion exposed by the list swipe action', async () => {
    useAppStore.setState({
      screenTimeProtection: {
        ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
        authorizationStatus: 'approved',
        personalCompositeRules: [focusRule('focus-social', 'Social')],
      },
    });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const screen = renderWithProviders(<ScreenTimeProtectionSettingsScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Delete Social rule' }));
    const actions = alert.mock.calls.at(-1)?.[2] ?? [];
    await act(async () => { actions.find((action) => action.text === 'Delete rule')?.onPress?.(); });

    await waitFor(() => expect(useAppStore.getState().screenTimeProtection.personalCompositeRules).toEqual([]));
  });
});

import { act, fireEvent, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Alert } from 'react-native';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { resetAllStores } from '../../../test/storeFixtures';
import { useAppStore } from '../../../store/useAppStore';
import { DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS } from '../../../services/screenTimeProtection';
import {
  presentScreenTimeActivityPicker,
  requestScreenTimeAuthorization,
  transferScreenTimeActivitySelection,
} from '../../../services/appleEcosystem/screenTimeProtection';
import {
  activatePersonalCompositeScreenTimeRule,
  deactivatePersonalCompositeScreenTimeRule,
} from '../../../services/screenTimeProtectionRuntime';
import { PersonalScreenTimeRuleBuilderScreen } from './PersonalScreenTimeRuleBuilderScreen';

const mockGoBack = jest.fn();
let mockRouteParams: Record<string, unknown> = { entry: 'inventory' };
const mockSaveMoney = jest.fn();
const mockLoadMoneySnapshot = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return { ...actual, useNavigation: () => ({ goBack: mockGoBack }), useRoute: () => ({ params: mockRouteParams }) };
});

jest.mock('../../../services/appleEcosystem/screenTimeProtection', () => ({
  presentScreenTimeActivityPicker: jest.fn(),
  requestScreenTimeAuthorization: jest.fn(),
  transferScreenTimeActivitySelection: jest.fn(),
}));

jest.mock('../../../services/screenTimeProtectionRuntime', () => ({
  activatePersonalCompositeScreenTimeRule: jest.fn(async () => true),
  deactivatePersonalCompositeScreenTimeRule: jest.fn(async () => true),
  reconcileScreenTimeRestrictions: jest.fn(async () => []),
}));

jest.mock('../../../capabilities/money/runtime/moneyAppControlStorage', () => ({
  saveMoneyAppControlSettings: (...args: unknown[]) => mockSaveMoney(...args),
}));
jest.mock('../../../capabilities/money/runtime/moneyAppControlRuntime', () => ({ reconcileLatestMoneyAppControls: jest.fn(async () => undefined) }));
jest.mock('../../../capabilities/money/data/moneyRepository', () => ({
  createMoneyRepository: () => ({ loadSnapshot: (...args: unknown[]) => mockLoadMoneySnapshot(...args) }),
}));
jest.mock('../../../services/analytics/useAnalytics', () => ({ useAnalytics: () => ({ capture: jest.fn() }) }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'rule-uuid' }));
jest.mock('expo-device', () => ({ isDevice: true }));
jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = jest.requireActual('react-native');
  return () => <View testID="time-picker" />;
});
jest.mock('../../../ui/KwiltSwitch', () => {
  const { Pressable } = jest.requireActual('react-native');
  return { KwiltSwitch: ({ accessibilityLabel, onPress, value }: { accessibilityLabel: string; onPress: () => void; value: boolean }) => (
    <Pressable accessibilityRole="switch" accessibilityLabel={accessibilityLabel} accessibilityState={{ checked: value }} onPress={onPress} />
  ) };
});
jest.mock('../../../ui/BottomDrawer', () => {
  const { Pressable, ScrollView, Text, View } = jest.requireActual('react-native');
  return {
    BottomDrawer: ({ visible, children, footer }: { visible: boolean; children: ReactNode; footer?: { primaryAction?: { label: string; onPress: () => void } } }) => visible ? (
      <View testID="rule-builder-drawer">
        {children}
        {footer?.primaryAction ? <Pressable accessibilityRole="button" onPress={footer.primaryAction.onPress}><Text>{footer.primaryAction.label}</Text></Pressable> : null}
      </View>
    ) : null,
    BottomDrawerScrollView: ScrollView,
  };
});
jest.mock('../../activities/DurationPicker', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  return { DurationPicker: ({ onChangeMinutes }: { onChangeMinutes: (minutes: number) => void }) => (
    <Pressable accessibilityRole="button" accessibilityLabel="Set daily use to 15 minutes" onPress={() => onChangeMinutes(15)}><Text>15 minutes</Text></Pressable>
  ) };
});

describe('PersonalScreenTimeRuleBuilderScreen composite composer', () => {
  beforeEach(() => {
    resetAllStores();
    mockGoBack.mockReset();
    mockRouteParams = { entry: 'inventory' };
    (presentScreenTimeActivityPicker as jest.Mock).mockReset().mockResolvedValue(null);
    (requestScreenTimeAuthorization as jest.Mock).mockReset().mockResolvedValue('approved');
    (transferScreenTimeActivitySelection as jest.Mock).mockReset().mockResolvedValue(true);
    (activatePersonalCompositeScreenTimeRule as jest.Mock).mockReset().mockResolvedValue(true);
    (deactivatePersonalCompositeScreenTimeRule as jest.Mock).mockReset().mockResolvedValue(true);
    mockSaveMoney.mockReset().mockImplementation(async (updater) => updater({ authorizationStatus: 'approved', policies: {}, lastUpdated: null }));
    mockLoadMoneySnapshot.mockReset().mockResolvedValue({
      categories: [{ id: 'shopping', sourceId: 'category-shopping', name: 'Shopping', planRole: 'flexible' }],
    });
    useAppStore.setState({ screenTimeProtection: { ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS, authorizationStatus: 'approved' } });
  });

  it('starts with one self-explanatory app-selection action and no setup helper copy', () => {
    const screen = renderWithProviders(<PersonalScreenTimeRuleBuilderScreen />);
    expect(screen.getByText('Which apps should this rule manage?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Apps and categories' })).toBeTruthy();
    expect(screen.queryByText(/private app and category picker/i)).toBeNull();
    expect(screen.getByText('1 of 2')).toBeTruthy();
    expect(screen.queryByText('Rule behavior')).toBeNull();
  });

  it('automatically advances from Apple selection into one sentence-shaped composer', async () => {
    (presentScreenTimeActivityPicker as jest.Mock).mockResolvedValueOnce({
      selectedApps: [], selectedCategories: [{ token: 'social', label: 'Social' }],
    });
    const screen = renderWithProviders(<PersonalScreenTimeRuleBuilderScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Apps and categories' }));
    expect(await screen.findByText('Build a rule for')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Change apps and categories. Social' })).toBeTruthy();
    expect(screen.getByText('2 of 2')).toBeTruthy();
    expect(screen.getByText('Rule behavior')).toBeTruthy();
    expect(screen.getByRole('button', { name: '＋ Add condition' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Rule outcome: Allow access' })).toBeTruthy();
    expect(screen.queryByText('Then')).toBeNull();
    expect(screen.queryByText('Make Social available')).toBeNull();
    expect(screen.getByRole('button', { name: 'Add rule' }).props.accessibilityState.disabled).toBe(true);
    expect(screen.queryByText('What will happen')).toBeNull();
    expect(screen.queryByText('When')).toBeNull();
  });

  it('builds and saves Social after 5 PM AND under 15 minutes as one aggregate', async () => {
    (presentScreenTimeActivityPicker as jest.Mock).mockResolvedValueOnce({
      selectedApps: [], selectedCategories: [{ token: 'social', label: 'Social' }],
    });
    const screen = renderWithProviders(<PersonalScreenTimeRuleBuilderScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Apps and categories' }));
    await screen.findByRole('button', { name: 'Change apps and categories. Social' });

    fireEvent.press(screen.getByRole('button', { name: '＋ Add condition' }));
    fireEvent.press(screen.getByRole('radio', { name: 'Time of day' }));
    expect(screen.getByRole('button', { name: 'Condition: Time' })).toBeTruthy();
    expect(screen.getByText('5:00 PM')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: '＋ Add condition' }));
    fireEvent.press(screen.getByRole('radio', { name: 'Daily use' }));
    expect(screen.getByRole('button', { name: 'Change AND connector' })).toBeTruthy();
    expect(screen.getByText('15 min')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Rule outcome: Allow access' }));
    fireEvent.press(screen.getByRole('radio', { name: 'Pause access' }));
    expect(screen.getByRole('button', { name: 'Rule outcome: Pause access' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Rule outcome: Pause access' }));
    fireEvent.press(screen.getByRole('radio', { name: 'Allow access' }));

    fireEvent.press(screen.getByRole('button', { name: 'Change AND connector' }));
    fireEvent.press(screen.getByRole('radio', { name: 'Any condition (OR)' }));
    expect(screen.getByRole('button', { name: 'Change OR connector' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Change OR connector' }));
    fireEvent.press(screen.getByRole('radio', { name: 'All conditions (AND)' }));

    fireEvent.press(screen.getByRole('button', { name: 'Add rule' }));
    await waitFor(() => expect(useAppStore.getState().screenTimeProtection.personalCompositeRules).toEqual([
      expect.objectContaining({
        connector: 'all', outcome: 'available',
        selectedCategories: [{ token: 'social', label: 'Social' }],
        conditions: [
          expect.objectContaining({ type: 'time_of_day', operator: 'after', minuteOfDay: 1020 }),
          expect.objectContaining({ type: 'daily_usage', operator: 'below', minutes: 15 }),
        ],
      }),
    ]));
    expect(activatePersonalCompositeScreenTimeRule).toHaveBeenCalledWith(expect.objectContaining({
      rule: expect.objectContaining({ connector: 'all', conditions: expect.any(Array) }),
    }));
  });

  it('offers Budget with the full condition list and adds the chosen budget predicate', async () => {
    (presentScreenTimeActivityPicker as jest.Mock).mockResolvedValueOnce({
      selectedApps: [], selectedCategories: [{ token: 'social', label: 'Social' }],
    });
    const screen = renderWithProviders(<PersonalScreenTimeRuleBuilderScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Apps and categories' }));
    await screen.findByRole('button', { name: 'Change apps and categories. Social' });
    fireEvent.press(screen.getByRole('button', { name: '＋ Add condition' }));
    fireEvent.press(screen.getByRole('radio', { name: 'Budget' }));
    fireEvent.press(await screen.findByRole('radio', { name: 'Shopping' }));
    fireEvent.press(screen.getByRole('radio', { name: '95% of this budget is used' }));
    expect(screen.getByText('Shopping')).toBeTruthy();
    expect(screen.getByText('95% used')).toBeTruthy();
  });

  it('reconstructs an editable composite, keeps enabled top-level, and deletes without reviving legacy state', async () => {
    const saved = {
      id: 'social-evening', selectionId: 'social-evening', selectedApps: [],
      selectedCategories: [{ token: 'social', label: 'Social' }], enabled: true,
      setupCompleted: true, connector: 'all' as const, outcome: 'available' as const,
      conditions: [{ id: 'after-five', type: 'time_of_day' as const, operator: 'after' as const, minuteOfDay: 1020 }],
      lastUpdated: '2026-08-27T20:00:00.000Z',
    };
    useAppStore.setState({ screenTimeProtection: {
      ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS, authorizationStatus: 'approved', personalCompositeRules: [saved],
    } });
    mockRouteParams = { entry: 'inventory', ruleId: saved.id };
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const screen = renderWithProviders(<PersonalScreenTimeRuleBuilderScreen />);
    expect(screen.getByText('Build a rule for')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Change apps and categories. Social' })).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'Rule enabled' })).toBeTruthy();
    expect(screen.queryByText('Rule status')).toBeNull();
    expect(screen.queryByText('Rule management')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Delete rule' }));
    const actions = alert.mock.calls.at(-1)?.[2] ?? [];
    await act(async () => { actions.find((action) => action.text === 'Delete rule')?.onPress?.(); });
    await waitFor(() => expect(useAppStore.getState().screenTimeProtection.personalCompositeRules).toEqual([]));
    expect(useAppStore.getState().screenTimeProtection.personalRules).toEqual([]);
  });

  it('uses the page back button to revisit app selection before leaving the flow', async () => {
    (presentScreenTimeActivityPicker as jest.Mock).mockResolvedValueOnce({ selectedApps: [{ token: 'games', label: 'Games' }], selectedCategories: [] });
    const screen = renderWithProviders(<PersonalScreenTimeRuleBuilderScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Apps and categories' }));
    await screen.findByRole('button', { name: 'Change apps and categories. Games' });
    fireEvent.press(screen.getByRole('button', { name: 'Go back from Add rule' }));
    expect(screen.getByText('Which apps should this rule manage?')).toBeTruthy();
    expect(mockGoBack).not.toHaveBeenCalled();
    fireEvent.press(screen.getByRole('button', { name: 'Go back from Add rule' }));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});

import { act, fireEvent, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Alert } from 'react-native';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { resetAllStores } from '../../../test/storeFixtures';
import { useAppStore } from '../../../store/useAppStore';
import { useEntitlementsStore } from '../../../store/useEntitlementsStore';
import { usePaywallStore } from '../../../store/usePaywallStore';
import { DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS } from '../../../services/screenTimeProtection';
import {
  consumeLastPersonalCompositeActivationFailure,
  presentScreenTimeActivityPicker,
  requestScreenTimeAuthorization,
} from '../../../services/appleEcosystem/screenTimeProtection';
import {
  activatePersonalCompositeScreenTimeRule,
  deactivatePersonalCompositeScreenTimeRule,
} from '../../../services/screenTimeProtectionRuntime';
import { PersonalScreenTimeRuleBuilderScreen } from './PersonalScreenTimeRuleBuilderScreen';

const mockGoBack = jest.fn();
let mockRouteParams: Record<string, unknown> = { entry: 'inventory' };
const mockLoadMoneySnapshot = jest.fn();
const mockCapture = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return { ...actual, useNavigation: () => ({ goBack: mockGoBack }), useRoute: () => ({ params: mockRouteParams }) };
});

jest.mock('../../../services/appleEcosystem/screenTimeProtection', () => ({
  consumeLastPersonalCompositeActivationFailure: jest.fn(),
  presentScreenTimeActivityPicker: jest.fn(),
  requestScreenTimeAuthorization: jest.fn(),
}));

jest.mock('../../../services/screenTimeProtectionRuntime', () => ({
  activatePersonalCompositeScreenTimeRule: jest.fn(async () => true),
  deactivatePersonalCompositeScreenTimeRule: jest.fn(async () => true),
  reconcileScreenTimeRestrictions: jest.fn(async () => []),
}));

jest.mock('../../../capabilities/money/data/moneyRepository', () => ({
  createMoneyRepository: () => ({ loadSnapshot: (...args: unknown[]) => mockLoadMoneySnapshot(...args) }),
}));
jest.mock('../../../services/analytics/useAnalytics', () => ({ useAnalytics: () => ({ capture: mockCapture }) }));
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
jest.mock('../../../ui/DropdownMenu', () => {
  const React = require('react');
  const { Pressable, Text, View } = jest.requireActual('react-native');
  const MenuContext = React.createContext({ open: false, setOpen: (_open: boolean) => undefined });
  return {
    DropdownMenu: ({ children }: { children: ReactNode }) => {
      const [open, setOpen] = React.useState(false);
      return <MenuContext.Provider value={{ open, setOpen }}><View>{children}</View></MenuContext.Provider>;
    },
    DropdownMenuTrigger: ({ accessibilityLabel, children }: { accessibilityLabel: string; children: ReactNode }) => {
      const menu = React.useContext(MenuContext);
      return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={() => menu.setOpen(!menu.open)}>{children}</Pressable>;
    },
    DropdownMenuContent: ({ children }: { children: ReactNode }) => {
      const menu = React.useContext(MenuContext);
      return menu.open ? <View>{children}</View> : null;
    },
    DropdownMenuItem: ({ disabled, label, onPress }: { disabled?: boolean; label: string; onPress: () => void }) => {
      const menu = React.useContext(MenuContext);
      return <Pressable accessibilityRole="menuitem" accessibilityLabel={label} disabled={disabled} onPress={() => { menu.setOpen(false); onPress(); }}><Text>{label}</Text></Pressable>;
    },
    DropdownMenuSeparator: () => <View />,
  };
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
    (consumeLastPersonalCompositeActivationFailure as jest.Mock).mockReset().mockReturnValue(null);
    (activatePersonalCompositeScreenTimeRule as jest.Mock).mockReset().mockResolvedValue(true);
    (deactivatePersonalCompositeScreenTimeRule as jest.Mock).mockReset().mockResolvedValue(true);
    mockLoadMoneySnapshot.mockReset().mockResolvedValue({
      categories: [{ id: 'shopping', sourceId: 'category-shopping', name: 'Shopping', planRole: 'flexible' }],
    });
    mockCapture.mockReset();
    useAppStore.setState({ screenTimeProtection: { ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS, authorizationStatus: 'approved' } });
    useEntitlementsStore.setState({ isPro: true });
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
    expect(await screen.findByText('Rule behavior')).toBeTruthy();
    expect(requestScreenTimeAuthorization).toHaveBeenCalledTimes(1);
    expect((requestScreenTimeAuthorization as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
      (presentScreenTimeActivityPicker as jest.Mock).mock.invocationCallOrder[0],
    );
    expect(screen.getByRole('button', { name: 'Change apps and categories. Social' })).toBeTruthy();
    expect(screen.getByText('2 of 2')).toBeTruthy();
    expect(screen.getByText('to')).toBeTruthy();
    expect(screen.getByText('When')).toBeTruthy();
    expect(screen.getByRole('button', { name: '＋ Add condition' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Rule outcome: Allow access' })).toBeTruthy();
    expect(screen.queryByText('Build a rule for')).toBeNull();
    expect(screen.queryByText('Then')).toBeNull();
    expect(screen.queryByText('Make Social available')).toBeNull();
    expect(screen.getByRole('button', { name: 'Add rule' }).props.accessibilityState.disabled).toBe(true);
    expect(screen.queryByText('What will happen')).toBeNull();
  });

  it('lets Free build a basic rule and preserves the draft when another condition asks for Pro', async () => {
    useEntitlementsStore.setState({ isPro: false });
    (presentScreenTimeActivityPicker as jest.Mock).mockResolvedValueOnce({
      selectedApps: [], selectedCategories: [{ token: 'social', label: 'Social' }],
    });
    const screen = renderWithProviders(<PersonalScreenTimeRuleBuilderScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Apps and categories' }));
    await screen.findByRole('button', { name: 'Change apps and categories. Social' });
    fireEvent.press(screen.getByRole('button', { name: '＋ Add condition' }));
    fireEvent.press(screen.getByRole('radio', { name: 'Time of day' }));
    fireEvent.press(screen.getByRole('button', { name: '＋ Add condition' }));
    expect(usePaywallStore.getState()).toMatchObject({
      visible: true,
      reason: 'pro_advanced_screen_time_rules',
      source: 'screen_time_add_condition',
      currentResumeIntent: expect.objectContaining({ kind: 'screen_time_add_condition' }),
    });
    expect(screen.getByRole('button', { name: 'Condition: Time' })).toBeTruthy();

    act(() => {
      usePaywallStore.getState().setUpsellContext({
        reason: 'pro_advanced_screen_time_rules',
        source: 'screen_time_add_condition',
      });
      usePaywallStore.getState().close();
      usePaywallStore.getState().completeUpgrade();
      useEntitlementsStore.setState({ isPro: true });
    });

    expect(await screen.findByRole('radio', { name: 'Time of day' })).toBeTruthy();
    expect(mockCapture).toHaveBeenCalledWith('upgrade_intent_resumed', {
      kind: 'screen_time_add_condition',
      source: 'screen_time',
    });
  });

  it('turns Money context into a prefilled budget sentence in the same composer', async () => {
    mockRouteParams = {
      entry: 'contextual',
      suggestedBudgetCondition: {
        categorySourceId: 'category-shopping', categoryName: 'Shopping', preset: 'when_hot',
      },
    };
    (presentScreenTimeActivityPicker as jest.Mock).mockResolvedValueOnce({
      selectedApps: [{ token: 'amazon', label: 'Amazon' }], selectedCategories: [],
    });
    const screen = renderWithProviders(<PersonalScreenTimeRuleBuilderScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Apps and categories' }));

    expect(await screen.findByRole('button', { name: 'Change apps and categories. Amazon' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Rule outcome: Pause access' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Condition: Shopping' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Value: ahead of month' })).toBeTruthy();
  });

  it('keeps Apple private selections concrete by showing the picker count instead of a generic target', async () => {
    (presentScreenTimeActivityPicker as jest.Mock).mockResolvedValueOnce({
      selectedApps: [], selectedCategories: [{ token: 'native:categories', label: '13 categories' }],
    });
    const screen = renderWithProviders(<PersonalScreenTimeRuleBuilderScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Apps and categories' }));
    expect(await screen.findByRole('button', { name: 'Change apps and categories. 13 categories' })).toBeTruthy();
    expect(screen.queryByText('your selected category')).toBeNull();
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
    expect(screen.getByRole('button', { name: 'Value: 5:00 PM' })).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: '＋ Add condition' }));
    fireEvent.press(screen.getByRole('radio', { name: 'Daily use' }));
    expect(screen.getByRole('button', { name: 'Change AND connector' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Value: 15 min' })).toBeTruthy();

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
    expect(requestScreenTimeAuthorization).toHaveBeenCalledTimes(1);
    expect((requestScreenTimeAuthorization as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
      (activatePersonalCompositeScreenTimeRule as jest.Mock).mock.invocationCallOrder[0],
    );
  });

  it('shows Apple’s exact monitor-limit recovery instead of the generic confirmation error', async () => {
    (presentScreenTimeActivityPicker as jest.Mock).mockResolvedValueOnce({
      selectedApps: [], selectedCategories: [{ token: 'social', label: 'Social' }],
    });
    (activatePersonalCompositeScreenTimeRule as jest.Mock).mockResolvedValueOnce(false);
    (consumeLastPersonalCompositeActivationFailure as jest.Mock).mockReturnValueOnce({
      code: 'monitoring_excessive_activities',
      message: 'The calling process is monitoring too many activities.',
      monitoredActivityCount: 20,
    });
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const screen = renderWithProviders(<PersonalScreenTimeRuleBuilderScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Apps and categories' }));
    await screen.findByRole('button', { name: 'Change apps and categories. Social' });
    fireEvent.press(screen.getByRole('button', { name: '＋ Add condition' }));
    fireEvent.press(screen.getByRole('radio', { name: 'Time of day' }));
    fireEvent.press(screen.getByRole('button', { name: 'Add rule' }));

    await waitFor(() => expect(alert).toHaveBeenCalledWith(
      'Couldn’t turn on this rule',
      'Apple still has too many old Screen Time schedules for Kwilt. Turn Kwilt off and back on under Settings → Screen Time → Apps With Screen Time Access, then try again.',
    ));
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
    expect(screen.getByRole('button', { name: 'Condition: Shopping' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Value: 95% used' })).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Condition: Shopping' }));
    expect(await screen.findByText('Choose a budget')).toBeTruthy();
    fireEvent.press(screen.getByRole('radio', { name: 'Shopping' }));
    fireEvent.press(screen.getByRole('radio', { name: '95% of this budget is used' }));

    fireEvent.press(screen.getByRole('button', { name: 'Value: 95% used' }));
    expect(screen.getByText('Budget condition')).toBeTruthy();
    fireEvent.press(screen.getByRole('radio', { name: 'This budget is fully used' }));
    expect(screen.getByRole('button', { name: 'Value: fully used' })).toBeTruthy();
  });

  it('keeps lifecycle actions out of the composer and deletes from the object menu', async () => {
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
    expect(screen.queryByText('Build a rule for')).toBeNull();
    expect(screen.getByText('Rule behavior')).toBeTruthy();
    expect(screen.getByText('When')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Change apps and categories. Social' })).toBeTruthy();
    expect(screen.queryByRole('switch', { name: 'Rule enabled' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Delete rule' })).toBeNull();
    expect(screen.queryByText('Rule status')).toBeNull();
    expect(screen.queryByText('Rule management')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Rule actions' }));
    expect(screen.getByRole('menuitem', { name: 'Turn off rule' })).toBeTruthy();
    fireEvent.press(screen.getByRole('menuitem', { name: 'Delete rule' }));
    const actions = alert.mock.calls.at(-1)?.[2] ?? [];
    await act(async () => { actions.find((action) => action.text === 'Delete rule')?.onPress?.(); });
    await waitFor(() => expect(useAppStore.getState().screenTimeProtection.personalCompositeRules).toEqual([]));
    expect(useAppStore.getState().screenTimeProtection.personalRules).toEqual([]);
  });

  it('turns a saved rule off immediately from the object menu', async () => {
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
    const screen = renderWithProviders(<PersonalScreenTimeRuleBuilderScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Rule actions' }));
    fireEvent.press(screen.getByRole('menuitem', { name: 'Turn off rule' }));

    await waitFor(() => expect(useAppStore.getState().screenTimeProtection.personalCompositeRules[0]?.enabled).toBe(false));
    expect(deactivatePersonalCompositeScreenTimeRule).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
  });

  it('edits the real-step operator directly from the sentence', () => {
    const saved = {
      id: 'social-real-step', selectionId: 'social-real-step', selectedApps: [],
      selectedCategories: [{ token: 'social', label: 'Social' }], enabled: true,
      setupCompleted: true, connector: 'all' as const, outcome: 'available' as const,
      conditions: [{ id: 'real', type: 'real_step_complete' as const, operator: 'is' as const }],
      lastUpdated: '2026-08-27T20:00:00.000Z',
    };
    useAppStore.setState({ screenTimeProtection: {
      ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS, authorizationStatus: 'approved', personalCompositeRules: [saved],
    } });
    mockRouteParams = { entry: 'inventory', ruleId: saved.id };
    const screen = renderWithProviders(<PersonalScreenTimeRuleBuilderScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Operator: is' }));
    fireEvent.press(screen.getByRole('radio', { name: 'is not' }));
    expect(screen.getByRole('button', { name: 'Operator: is not' })).toBeTruthy();
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

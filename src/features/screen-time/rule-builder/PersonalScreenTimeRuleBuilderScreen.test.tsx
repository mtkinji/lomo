import { fireEvent, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { resetAllStores } from '../../../test/storeFixtures';
import { useAppStore } from '../../../store/useAppStore';
import {
  DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
  createPersonalScreenTimeRule,
} from '../../../services/screenTimeProtection';
import {
  presentScreenTimeActivityPicker,
  requestScreenTimeAuthorization,
} from '../../../services/appleEcosystem/screenTimeProtection';
import { colors, typography } from '../../../theme';
import { PersonalScreenTimeRuleBuilderScreen } from './PersonalScreenTimeRuleBuilderScreen';

const mockGoBack = jest.fn();
let mockRouteParams: Record<string, unknown> = { entry: 'inventory' };
const mockBottomDrawerProps: Array<Record<string, unknown>> = [];

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: mockGoBack }),
    useRoute: () => ({ params: mockRouteParams }),
  };
});

jest.mock('../../../services/appleEcosystem/screenTimeProtection', () => ({
  presentScreenTimeActivityPicker: jest.fn(),
  requestScreenTimeAuthorization: jest.fn(),
}));

jest.mock('../../../ui/BottomDrawer', () => {
  const { ScrollView, View } = jest.requireActual('react-native');
  return {
    BottomDrawer: ({ children, bottomAccessory, ...props }: Record<string, unknown> & {
      children?: React.ReactNode;
      bottomAccessory?: React.ReactNode;
    }) => {
      mockBottomDrawerProps.push(props);
      return (
        <View testID="rule-builder-drawer">
          {children}
          {bottomAccessory}
        </View>
      );
    },
    BottomDrawerScrollView: ScrollView,
  };
});

jest.mock('../../../services/screenTimeProtectionRuntime', () => ({
  reconcileScreenTimeRestrictions: jest.fn(async () => []),
}));

jest.mock('expo-crypto', () => ({ randomUUID: () => 'rule-uuid' }));

jest.mock('../../../services/analytics/useAnalytics', () => ({
  useAnalytics: () => ({ capture: jest.fn() }),
}));

describe('PersonalScreenTimeRuleBuilderScreen', () => {
  beforeEach(() => {
    resetAllStores();
    mockGoBack.mockReset();
    mockBottomDrawerProps.length = 0;
    mockRouteParams = { entry: 'inventory' };
    (presentScreenTimeActivityPicker as jest.Mock).mockReset().mockResolvedValue(null);
    (requestScreenTimeAuthorization as jest.Mock).mockReset().mockResolvedValue('approved');
    useAppStore.setState({
      screenTimeProtection: {
        ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
        authorizationStatus: 'approved',
      },
    });
  });

  it('starts in a dismissable progressive drawer with one touch target', () => {
    const screen = renderWithProviders(<PersonalScreenTimeRuleBuilderScreen />);

    expect(mockBottomDrawerProps.at(-1)).toMatchObject({
      visible: true,
      snapPoints: ['82%'],
      presentation: 'modal',
      dismissable: true,
      dismissOnBackdropPress: true,
    });

    const question = screen.getByText('Which apps should this rule manage?');
    expect(StyleSheet.flatten(question.props.style)).toMatchObject({
      fontFamily: typography.titleMd.fontFamily,
      fontSize: typography.titleMd.fontSize,
      lineHeight: typography.titleMd.lineHeight,
      color: colors.textPrimary,
    });
    expect(screen.getByText('Apps and categories')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Apps and categories' })).toBeTruthy();
    expect(screen.getByTestId('rule-choice-icon-layers', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText('Open the Screen Time picker')).toBeNull();
    expect(screen.getByRole('button', { name: 'Close rule setup' })).toBeTruthy();
    expect(screen.getByLabelText('Rule setup progress').props.accessibilityValue)
      .toEqual({ min: 1, max: 3, now: 1 });
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
    expect(screen.queryByText('Rule behavior')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add rule' })).toBeNull();
  });

  it('requests personal Screen Time authorization before opening a Chat-authored selection', async () => {
    useAppStore.setState({
      screenTimeProtection: {
        ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
        authorizationStatus: 'notDetermined',
      },
    });
    mockRouteParams = {
      entry: 'contextual', suggestedKind: 'daily_limit', suggestedLimitMinutes: 10,
      suggestedAppLabel: 'Instagram',
    };
    const screen = renderWithProviders(<PersonalScreenTimeRuleBuilderScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Apps and categories' }));

    await waitFor(() => expect(requestScreenTimeAuthorization).toHaveBeenCalledTimes(1));
    expect(presentScreenTimeActivityPicker).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().screenTimeProtection.authorizationStatus).toBe('approved');
  });

  it('uses contextual Focus intent and skips the behavior question', async () => {
    mockRouteParams = {
      entry: 'contextual',
      suggestedKind: 'focus',
      setupIntent: 'focus_sessions',
      entrySurface: 'focus_drawer',
    };
    (presentScreenTimeActivityPicker as jest.Mock).mockResolvedValueOnce({
      selectedApps: [{ token: 'instagram', label: 'Instagram' }],
      selectedCategories: [{ token: 'social', label: 'Social' }],
    });
    const screen = renderWithProviders(<PersonalScreenTimeRuleBuilderScreen />);

    expect(screen.getByText('Which apps should pause during Focus?')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Apps and categories' }));

    expect(await screen.findByText('Instagram + 1 will pause while Focus is running.')).toBeTruthy();
    expect(screen.getByText('Your rule is ready.')).toBeTruthy();
    expect(screen.queryByText('When should Instagram + 1 be available?')).toBeNull();
    expect(screen.getByText('Pause until Focus ends')).toBeTruthy();
    expect(screen.getByLabelText('Rule setup progress').props.accessibilityValue)
      .toEqual({ min: 1, max: 2, now: 2 });
  });

  it('carries a Chat-authored daily allowance through native app selection and save', async () => {
    mockRouteParams = {
      entry: 'contextual', suggestedKind: 'daily_limit', suggestedLimitMinutes: 10,
      suggestedAppLabel: 'Instagram', setupIntent: 'settings_discovery', entrySurface: 'settings',
    };
    (presentScreenTimeActivityPicker as jest.Mock).mockResolvedValueOnce({
      selectedApps: [{ token: 'instagram', label: 'Instagram' }], selectedCategories: [],
    });
    const screen = renderWithProviders(<PersonalScreenTimeRuleBuilderScreen />);

    expect(screen.getByText('Choose Instagram in Screen Time')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Apps and categories' }));
    expect(await screen.findByText('Instagram will pause after 10 minutes of use each day.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Add rule' }));

    await waitFor(() => expect(useAppStore.getState().screenTimeProtection.personalRules).toEqual([
      expect.objectContaining({
        kind: 'daily_limit', limitMinutes: 10, reset: 'daily', enabled: true,
        selectedApps: [{ token: 'instagram', label: 'Instagram' }],
      }),
    ]));
  });

  it('asks what should happen after an inventory target is selected', async () => {
    (presentScreenTimeActivityPicker as jest.Mock).mockResolvedValueOnce({
      selectedApps: [{ token: 'games', label: 'Games' }],
      selectedCategories: [],
    });
    const screen = renderWithProviders(<PersonalScreenTimeRuleBuilderScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Apps and categories' }));

    expect(await screen.findByText('When should Games be available?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'After a to-do, progress update, or Focus' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'After Focus ends' })).toBeTruthy();
    expect(screen.getByTestId('rule-choice-icon-checklist', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId('rule-choice-icon-focus', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText('Apps unlock when you complete any one of these in Kwilt.')).toBeNull();
    expect(screen.queryByText('Apps stay paused while Focus is running.')).toBeNull();
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.getByRole('button', { name: 'Change apps' })).toBeTruthy();
    expect(screen.getByLabelText('Rule setup progress').props.accessibilityValue)
      .toEqual({ min: 1, max: 3, now: 2 });
    expect(screen.queryByRole('button', { name: 'Add rule' })).toBeNull();
  });

  it('creates the selected rule only after review', async () => {
    (presentScreenTimeActivityPicker as jest.Mock).mockResolvedValueOnce({
      selectedApps: [{ token: 'games', label: 'Games' }],
      selectedCategories: [],
    });
    const screen = renderWithProviders(<PersonalScreenTimeRuleBuilderScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Apps and categories' }));
    fireEvent.press(await screen.findByText('After a to-do, progress update, or Focus'));
    expect(screen.getByText('Games will unlock after you complete a to-do, record progress, or finish Focus.')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Add rule' }));

    await waitFor(() => expect(useAppStore.getState().screenTimeProtection.personalRules).toEqual([
      expect.objectContaining({
        kind: 'real_step',
        enabled: true,
        setupCompleted: true,
        selectedApps: [{ token: 'games', label: 'Games' }],
      }),
    ]));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('offers a behavior even when another rule already uses that condition', async () => {
    useAppStore.setState({
      screenTimeProtection: {
        ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
        authorizationStatus: 'approved',
        personalRules: [createPersonalScreenTimeRule({
          kind: 'focus',
          selectedApps: [{ token: 'social', label: 'Social' }],
          selectedCategories: [],
          enabled: true,
          setupCompleted: true,
        })],
      },
    });
    (presentScreenTimeActivityPicker as jest.Mock).mockResolvedValueOnce({
      selectedApps: [{ token: 'games', label: 'Games' }],
      selectedCategories: [],
    });
    const screen = renderWithProviders(<PersonalScreenTimeRuleBuilderScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Apps and categories' }));

    expect(await screen.findByText('After a to-do, progress update, or Focus')).toBeTruthy();
    expect(screen.getByText('After Focus ends')).toBeTruthy();
  });

  it('saves a second same-kind rule under an independent picker identity', async () => {
    useAppStore.setState({
      screenTimeProtection: {
        ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
        authorizationStatus: 'approved',
        personalRules: [createPersonalScreenTimeRule({
          id: 'focus-social', selectionId: 'focus-social', kind: 'focus',
          selectedApps: [{ token: 'social', label: 'Social' }], selectedCategories: [],
          enabled: true, setupCompleted: true,
        })],
      },
    });
    (presentScreenTimeActivityPicker as jest.Mock).mockResolvedValueOnce({
      selectedApps: [{ token: 'games', label: 'Games' }], selectedCategories: [],
    });
    const screen = renderWithProviders(<PersonalScreenTimeRuleBuilderScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Apps and categories' }));
    fireEvent.press(await screen.findByText('After Focus ends'));
    fireEvent.press(screen.getByRole('button', { name: 'Add rule' }));

    await waitFor(() => expect(useAppStore.getState().screenTimeProtection.personalRules).toEqual([
      expect.objectContaining({ id: 'focus-social', selectionId: 'focus-social' }),
      expect.objectContaining({
        id: 'personal_rule_rule-uuid', selectionId: 'personal_rule_rule-uuid',
        kind: 'focus', selectedApps: [{ token: 'games', label: 'Games' }],
      }),
    ]));
    expect(presentScreenTimeActivityPicker).toHaveBeenCalledWith(
      expect.anything(),
      { selectionId: 'personal_rule_rule-uuid' },
    );
  });

  it('stays on the apps question when the picker is cancelled', async () => {
    const screen = renderWithProviders(<PersonalScreenTimeRuleBuilderScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Apps and categories' }));

    await waitFor(() => expect(presentScreenTimeActivityPicker).toHaveBeenCalled());
    expect(screen.getByText('Which apps should this rule manage?')).toBeTruthy();
    expect(screen.queryByText(/When should .* be available/)).toBeNull();
  });

  it('stays on the apps question when the picker returns an empty selection', async () => {
    (presentScreenTimeActivityPicker as jest.Mock).mockResolvedValueOnce({
      selectedApps: [],
      selectedCategories: [],
    });
    const screen = renderWithProviders(<PersonalScreenTimeRuleBuilderScreen />);

    fireEvent.press(screen.getByRole('button', { name: 'Apps and categories' }));

    await waitFor(() => expect(presentScreenTimeActivityPicker).toHaveBeenCalled());
    expect(screen.getByText('Which apps should this rule manage?')).toBeTruthy();
    expect(screen.queryByText(/When should .* be available/)).toBeNull();
  });
});

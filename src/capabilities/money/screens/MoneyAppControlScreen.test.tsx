import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { MoneyAppControlScreen } from './MoneyAppControlScreen';

const mockSave = jest.fn();
const mockReconcile = jest.fn(async (_snapshot: unknown, _settings?: unknown) => undefined);
const mockNavigateWhenReady = jest.fn();

jest.mock('../data/MoneyDataContext', () => ({
  useMoneyData: () => ({
    snapshot: {
      categories: [{ id: 'shopping', sourceId: 'shopping', name: 'Shopping' }],
    },
  }),
}));

jest.mock('../runtime/moneyAppControlStorage', () => ({
  useMoneyAppControlSettings: () => ({
    loaded: true,
    settings: {
      authorizationStatus: 'approved',
      lastUpdated: null,
      policies: {
        shopping: {
          enabled: true,
          preset: 'at_95_percent',
          unlockWindowMinutes: 20,
          selectedApps: [{ token: 'shopping-app', label: 'Shopping' }],
          selectedCategories: [],
          lastReview: null,
        },
      },
    },
    save: (...args: unknown[]) => mockSave(...args),
  }),
}));

jest.mock('../runtime/moneyAppControlRuntime', () => ({
  reconcileMoneyAppControls: (snapshot: unknown, settings?: unknown) => mockReconcile(snapshot, settings),
}));

jest.mock('../../../services/appleEcosystem/screenTimeProtection', () => ({
  getScreenTimeAuthorizationStatus: jest.fn(async () => 'approved'),
  presentScreenTimeActivityPicker: jest.fn(),
  requestScreenTimeAuthorization: jest.fn(),
}));

jest.mock('../../../ui/BottomDrawer', () => {
  const { View } = jest.requireActual('react-native');
  return {
    BottomDrawer: ({ children, visible }: { children: React.ReactNode; visible: boolean }) => visible ? <View>{children}</View> : null,
    BottomDrawerScrollView: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
  };
});

jest.mock('../../../services/analytics/useAnalytics', () => ({
  useAnalytics: () => ({ capture: jest.fn() }),
}));

jest.mock('../../../navigation/rootNavigationRef', () => ({
  navigateWhenReady: (...args: unknown[]) => mockNavigateWhenReady(...args),
}));

describe('MoneyAppControlScreen rule detail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    mockSave.mockImplementation(async (updater) => updater({
      authorizationStatus: 'approved',
      lastUpdated: null,
      policies: {
        shopping: {
          enabled: true,
          preset: 'at_95_percent',
          unlockWindowMinutes: 20,
          selectedApps: [{ token: 'shopping-app', label: 'Shopping' }],
          selectedCategories: [],
          lastReview: null,
        },
      },
    }));
  });

  it('separates status and lifecycle from editable rule details', () => {
    const screen = renderWithProviders(<MoneyAppControlScreen
      navigation={{ goBack: jest.fn(), navigate: jest.fn() } as never}
      route={{ key: 'shopping-rule', name: 'MoneyAppControl', params: { categoryId: 'shopping' } } as never}
    />);

    expect(screen.getByText('Rule status')).toBeTruthy();
    expect(screen.getByText('Rule details')).toBeTruthy();
    expect(screen.getByText('Rule management')).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'Rule enabled' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Rule behavior' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Budget' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete rule' })).toBeTruthy();
  });

  it('edits When to pause with radio choices rather than navigation rows', async () => {
    const screen = renderWithProviders(<MoneyAppControlScreen
      navigation={{ goBack: jest.fn(), navigate: jest.fn() } as never}
      route={{ key: 'shopping-rule', name: 'MoneyAppControl', params: { categoryId: 'shopping' } } as never}
    />);

    expect(screen.getByText('Edit rule')).toBeTruthy();
    expect(screen.queryByText('Budget condition')).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'When to pause' }));

    expect(screen.getByText('Choose the budget condition that pauses these apps.')).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.getByRole('radio', { name: 'When 95% of this budget is used' }).props.accessibilityState.checked).toBe(true);
    expect(screen.queryByRole('button', { name: 'When this budget is fully used' })).toBeNull();
    fireEvent.press(screen.getByRole('radio', { name: 'When this budget is fully used' }));

    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
    const saved = await mockSave.mock.results[0].value;
    expect(saved.policies.shopping.preset).toBe('when_over');
  });

  it('opens the budget picker from the Budget field', () => {
    const navigate = jest.fn();
    const screen = renderWithProviders(<MoneyAppControlScreen
      navigation={{ goBack: jest.fn(), navigate } as never}
      route={{ key: 'shopping-rule', name: 'MoneyAppControl', params: { categoryId: 'shopping' } } as never}
    />);

    fireEvent.press(screen.getByRole('button', { name: 'Budget' }));

    expect(navigate).toHaveBeenCalledWith('MoneyAppControlBudgetPicker', {
      sourceSelectionId: 'money_shopping',
      selectedApps: [{ token: 'shopping-app', label: 'Shopping' }],
      selectedCategories: [],
      replacingMoneyCategoryId: 'shopping',
    });
  });

  it('uses a deliberate replacement flow when Rule behavior changes domains', async () => {
    const screen = renderWithProviders(<MoneyAppControlScreen
      navigation={{ goBack: jest.fn(), navigate: jest.fn() } as never}
      route={{ key: 'shopping-rule', name: 'MoneyAppControl', params: { categoryId: 'shopping' } } as never}
    />);

    fireEvent.press(screen.getByRole('button', { name: 'Rule behavior' }));
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(screen.getByRole('radio', { name: 'Based on a budget' }).props.accessibilityState.checked).toBe(true);
    fireEvent.press(screen.getByRole('radio', { name: 'During Focus' }));

    const actions = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2] ?? [];
    await act(async () => {
      actions.find((action: { text?: string }) => action.text === 'Continue')?.onPress?.();
    });
    expect(mockNavigateWhenReady).toHaveBeenCalledWith('Settings', {
      screen: 'SettingsScreenTimeRuleBuilder',
      params: expect.objectContaining({
        suggestedKind: 'focus',
        sourceSelectionId: 'money_shopping',
        replacingMoneyCategoryId: 'shopping',
      }),
    });
  });

  it('deletes the rule from the lifecycle section after confirmation', async () => {
    const goBack = jest.fn();
    const screen = renderWithProviders(<MoneyAppControlScreen
      navigation={{ goBack, navigate: jest.fn() } as never}
      route={{ key: 'shopping-rule', name: 'MoneyAppControl', params: { categoryId: 'shopping' } } as never}
    />);

    fireEvent.press(screen.getByRole('button', { name: 'Delete rule' }));
    const actions = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2] ?? [];
    await act(async () => {
      actions.find((action: { text?: string }) => action.text === 'Delete rule')?.onPress?.();
    });

    await waitFor(() => expect(goBack).toHaveBeenCalled());
    const saved = await mockSave.mock.results[0].value;
    expect(saved.policies.shopping).toBeUndefined();
    expect(mockReconcile).toHaveBeenCalled();
  });
});

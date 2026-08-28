import { fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { moneyAppControlSelectionId } from '../domain/moneyAppControl';
import { transferScreenTimeActivitySelection } from '../../../services/appleEcosystem/screenTimeProtection';
import { MoneyAppControlBudgetPickerScreen } from './MoneyAppControlBudgetPickerScreen';
import { useAppStore } from '../../../store/useAppStore';
import {
  DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
  createPersonalScreenTimeRule,
} from '../../../services/screenTimeProtection';
import { deactivatePersonalScreenTimeRule } from '../../../services/screenTimeProtectionRuntime';

const mockSave = jest.fn();
const mockNavigate = jest.fn();
let mockSnapshot: {
  categories: Array<{
    id: string;
    sourceId: string;
    name: string;
    planRole: 'flexible' | 'protected';
  }>;
} | null;

jest.mock('../data/MoneyDataContext', () => ({
  useMoneyData: () => ({ snapshot: mockSnapshot, status: mockSnapshot ? 'ready' : 'loading' }),
}));

jest.mock('../runtime/moneyAppControlStorage', () => ({
  useMoneyAppControlSettings: () => ({
    settings: { authorizationStatus: 'approved', policies: {}, lastUpdated: null },
    loaded: true,
    save: (...args: unknown[]) => mockSave(...args),
  }),
}));

jest.mock('../../../services/appleEcosystem/screenTimeProtection', () => ({
  transferScreenTimeActivitySelection: jest.fn(),
}));

jest.mock('../../../services/screenTimeProtectionRuntime', () => ({
  deactivatePersonalScreenTimeRule: jest.fn(async () => true),
}));

function budget(id: string, name: string, planRole: 'flexible' | 'protected' = 'flexible') {
  return { id, sourceId: id, name, planRole };
}

const route = {
  key: 'budget-picker',
  name: 'MoneyAppControlBudgetPicker',
  params: {
    sourceSelectionId: 'personal_rule_rule-uuid',
    selectedApps: [{ token: 'games', label: 'Games' }],
    selectedCategories: [{ token: 'social', label: 'Social' }],
  },
};

describe('MoneyAppControlBudgetPickerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSnapshot = {
      categories: [
        budget('restaurants', 'Restaurants'),
        budget('housing', 'Housing', 'protected'),
      ],
    };
    (transferScreenTimeActivitySelection as jest.Mock).mockResolvedValue(true);
    (deactivatePersonalScreenTimeRule as jest.Mock).mockResolvedValue(true);
    mockSave.mockImplementation(async (updater) => updater({
      authorizationStatus: 'approved', policies: {}, lastUpdated: null,
    }));
  });

  it('retires the previous personal rule only after its selection becomes a disabled budget draft', async () => {
    const previousRule = createPersonalScreenTimeRule({
      id: 'focus-games', selectionId: 'focus-games', kind: 'focus',
      selectedApps: [{ token: 'games', label: 'Games' }], selectedCategories: [],
      enabled: true, setupCompleted: true,
    });
    useAppStore.setState({
      screenTimeProtection: {
        ...DEFAULT_SCREEN_TIME_PROTECTION_SETTINGS,
        authorizationStatus: 'approved',
        personalRules: [previousRule],
      },
    });
    const replacementRoute = {
      ...route,
      params: { ...route.params, sourceSelectionId: 'focus-games', replacingPersonalRuleId: 'focus-games' },
    } as never;
    const screen = renderWithProviders(<MoneyAppControlBudgetPickerScreen
      navigation={{ goBack: jest.fn(), navigate: mockNavigate } as never}
      route={replacementRoute as never}
    />);

    fireEvent.press(screen.getByRole('button', { name: 'Restaurants' }));

    await waitFor(() => expect(deactivatePersonalScreenTimeRule).toHaveBeenCalledWith(previousRule));
    expect(useAppStore.getState().screenTimeProtection.personalRules).toEqual([]);
    expect(mockNavigate).toHaveBeenCalledWith('MoneyAppControl', {
      categoryId: 'restaurants', source: 'screen-time-rule-builder',
    });
  });

  it('shows a dedicated ordinary budget picker with eligible budgets only', () => {
    const screen = renderWithProviders(<MoneyAppControlBudgetPickerScreen
      navigation={{ goBack: jest.fn(), navigate: mockNavigate } as never}
      route={route as never}
    />);

    expect(screen.getByText('Choose a budget')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Go back from Choose a budget' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Restaurants' })).toBeTruthy();
    expect(screen.queryByText('Housing')).toBeNull();
    expect(screen.queryByText('Got it')).toBeNull();
  });

  it('transfers the Apple selection, saves a disabled draft, and opens its editor', async () => {
    const screen = renderWithProviders(<MoneyAppControlBudgetPickerScreen
      navigation={{ goBack: jest.fn(), navigate: mockNavigate } as never}
      route={route as never}
    />);

    fireEvent.press(screen.getByRole('button', { name: 'Restaurants' }));

    await waitFor(() => expect(transferScreenTimeActivitySelection).toHaveBeenCalledWith({
      sourceSelectionId: 'personal_rule_rule-uuid',
      targetSelectionId: moneyAppControlSelectionId('restaurants'),
    }));
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(await mockSave.mock.results[0].value).toEqual(expect.objectContaining({
      policies: {
        restaurants: expect.objectContaining({
          enabled: false,
          preset: 'always_review',
          selectedApps: [{ token: 'games', label: 'Games' }],
          selectedCategories: [{ token: 'social', label: 'Social' }],
        }),
      },
    }));
    expect(mockNavigate).toHaveBeenCalledWith('MoneyAppControl', {
      categoryId: 'restaurants',
      source: 'screen-time-rule-builder',
    });
  });

  it('moves a saved budget rule instead of leaving a second rule behind', async () => {
    const moveRoute = {
      ...route,
      params: { ...route.params, sourceSelectionId: 'money_shopping', replacingMoneyCategoryId: 'shopping' },
    } as never;
    mockSave.mockImplementation(async (updater) => updater({
      authorizationStatus: 'approved',
      policies: {
        shopping: {
          enabled: true, preset: 'at_95_percent', unlockWindowMinutes: 20,
          selectedApps: [{ token: 'games', label: 'Games' }], selectedCategories: [], lastReview: null,
        },
      },
      lastUpdated: null,
    }));
    const screen = renderWithProviders(<MoneyAppControlBudgetPickerScreen
      navigation={{ goBack: jest.fn(), navigate: mockNavigate } as never}
      route={moveRoute as never}
    />);

    fireEvent.press(screen.getByRole('button', { name: 'Restaurants' }));

    await waitFor(() => expect(mockSave).toHaveBeenCalledTimes(1));
    const saved = await mockSave.mock.results[0].value;
    expect(saved.policies.shopping).toBeUndefined();
    expect(saved.policies.restaurants).toEqual(expect.objectContaining({ enabled: false }));
  });
});

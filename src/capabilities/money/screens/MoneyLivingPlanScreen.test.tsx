import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { BudgetSettingsSurface } from './MoneyLivingPlanScreen';

const mockGetLivingPlanSettings = jest.fn();
const mockRestoreDefaultBudgetCategories = jest.fn();
const mockReconcileLivingPlan = jest.fn();
const mockClient = {
  auth: { getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } } })) },
};

jest.mock('../../../services/backend/supabaseClient', () => ({
  getSupabaseClient: () => mockClient,
}));
jest.mock('../data/livingPlanRepository', () => ({
  getLivingPlanSettings: (...args: unknown[]) => mockGetLivingPlanSettings(...args),
  restoreDefaultBudgetCategories: (...args: unknown[]) => mockRestoreDefaultBudgetCategories(...args),
  saveLivingTargetIntent: jest.fn(async () => undefined),
  savePlanningBasisOverride: jest.fn(async () => undefined),
}));
jest.mock('../runtime/livingPlanReconciliation', () => ({
  reconcileLivingPlan: (...args: unknown[]) => mockReconcileLivingPlan(...args),
}));
jest.mock('../components/MoneyWeeklyCheckRow', () => {
  const { Text } = require('react-native');
  return { MoneyWeeklyCheckRow: () => <Text>Weekly check</Text> };
});

const settings = {
  target: { livingPercent: 70, provenance: 'settings', updatedAtIso: '2026-08-21T12:00:00Z' },
  planningBasis: { monthlyBasisCents: 500_000, provenance: 'user_set', updatedAtIso: '2026-08-21T12:00:00Z' },
  promotionEnabled: true,
  active: null,
  receipts: [],
};

describe('BudgetSettingsSurface', () => {
  beforeEach(() => {
    mockGetLivingPlanSettings.mockReset().mockResolvedValue(settings);
    mockRestoreDefaultBudgetCategories.mockReset().mockResolvedValue({ createdCategoryCount: 2, categoryIds: ['one', 'two'] });
    mockReconcileLivingPlan.mockReset();
    mockClient.auth.getUser.mockClear();
    jest.restoreAllMocks();
  });

  it('composes plan, category recovery, privacy, and access into one Budget page', async () => {
    const onOpenPrivacyLock = jest.fn();
    const onOpenHouseholdAccess = jest.fn();
    const screen = renderWithProviders(
      <BudgetSettingsSurface
        onBack={jest.fn()}
        onOpenHouseholdAccess={onOpenHouseholdAccess}
        onOpenPrivacyLock={onOpenPrivacyLock}
        onOpenReceipt={jest.fn()}
      />,
    );

    expect(screen.getByText('Budget')).toBeTruthy();
    expect(screen.queryByText('Money plan')).toBeNull();
    expect(screen.getByText('Living target')).toBeTruthy();
    expect(screen.getByText('Categories')).toBeTruthy();
    expect(screen.getByText('Restore default categories')).toBeTruthy();
    expect(screen.getByText('Privacy & access')).toBeTruthy();

    fireEvent.press(screen.getByText('Privacy lock'));
    fireEvent.press(screen.getByText('Household access'));
    expect(onOpenPrivacyLock).toHaveBeenCalledTimes(1);
    expect(onOpenHouseholdAccess).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText('70%')).toBeTruthy());
  });

  it('confirms additive restoration and reports the receipt', async () => {
    const alert = jest.spyOn(Alert, 'alert');
    const screen = renderWithProviders(
      <BudgetSettingsSurface
        onBack={jest.fn()}
        onOpenHouseholdAccess={jest.fn()}
        onOpenPrivacyLock={jest.fn()}
        onOpenReceipt={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByText('Restore default categories'));
    expect(alert).toHaveBeenCalledWith(
      'Restore default categories?',
      expect.stringContaining('existing categories, names, amounts, and transaction assignments stay unchanged'),
      expect.any(Array),
    );
    const actions = alert.mock.calls[0][2];
    const restore = actions?.find((action) => action.text === 'Restore');
    await act(async () => { await restore?.onPress?.(); });

    expect(mockRestoreDefaultBudgetCategories).toHaveBeenCalledWith(mockClient);
    expect(screen.getByText('2 default categories were restored.')).toBeTruthy();
  });
});

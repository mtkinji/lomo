import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { MoneyCategoryDetailScreen } from './MoneyCategoryDetailScreen';
import { projectMoneySnapshot } from '../data/moneySnapshot';
import type { CategorySettingsRequest } from '../domain/categorySettingsCommand';

const mockMoney = {
  userId: '10000000-0000-4000-8000-000000000001', snapshot: {} as ReturnType<typeof projectMoneySnapshot>, status: 'ready', savingCategory: false,
  refresh: jest.fn(), previewCategoryPlanAmount: jest.fn(), updateCategoryPlan: jest.fn(), renameCategory: jest.fn(), updateCategoryCover: jest.fn(),
  loadCategorySettingsRequest: jest.fn(), saveCategorySettingsRequest: jest.fn(),
};
jest.mock('expo-crypto', () => {
  let next = 0;
  return { ...jest.requireActual('expo-crypto'), randomUUID: () => `10000000-0000-4000-8000-${(++next).toString(16).padStart(12, '0')}` };
});
jest.mock('../data/MoneyDataContext', () => ({ useMoneyData: () => mockMoney }));
jest.mock('@react-navigation/native', () => ({ ...jest.requireActual('@react-navigation/native'), useIsFocused: () => true }));
jest.mock('../../../ui/BottomDrawer', () => {
  const { View } = require('react-native');
  return { BottomDrawer: ({ visible, children, bottomAccessory, dismissable = true }: { visible: boolean; children: React.ReactNode; bottomAccessory?: React.ReactNode; dismissable?: boolean }) => visible ? <View testID="settings-drawer" accessibilityState={{ disabled: !dismissable }}>{children}{bottomAccessory}</View> : null,
    BottomDrawerScrollView: View };
});
const sourceId = '10000000-0000-4000-8000-000000000002';
const version = '2026-11-01T10:00:00Z';
function tree() {
  return <MoneyCategoryDetailScreen {...({ navigation: { getParent: () => undefined, goBack: jest.fn(), navigate: jest.fn() },
    route: { key: 'category', name: 'MoneyCategoryDetail', params: { categoryId: 'household' } } } as unknown as Parameters<typeof MoneyCategoryDetailScreen>[0])} />;
}
beforeEach(() => {
  jest.clearAllMocks();
  mockMoney.snapshot = projectMoneySnapshot({
    categories: [{ id: sourceId, slug: 'household', legacy_budget_id: null, name: 'Household', description: null, accent_color: null, sort_order: 0, updated_at: version }],
    plans: [{ category_id: sourceId, base_budget_cents: 50000, rollover_enabled: false, plan_role: 'flexible', updated_at: version }],
    transactions: [], accounts: [], connections: [],
  });
  mockMoney.loadCategorySettingsRequest.mockResolvedValue(null);
  mockMoney.previewCategoryPlanAmount.mockResolvedValue(null);
  mockMoney.saveCategorySettingsRequest.mockResolvedValue({ outcome: 'confirmed', receipt: {} });
});
describe('category settings screen save', () => {
  it('saves name, amount and role together through one request and closes only after confirmation', async () => {
    const screen = renderWithProviders(tree());
    fireEvent.press(screen.getByLabelText('Open Household settings'));
    await waitFor(() => expect(screen.getByLabelText('Name').props.editable).toBe(true));
    fireEvent.changeText(screen.getByLabelText('Name'), 'Family supplies');
    fireEvent.changeText(screen.getByLabelText('Monthly amount'), '600.00');
    fireEvent.press(screen.getByText('Protected'));
    fireEvent.press(screen.getByText('Save changes'));
    await waitFor(() => { const error = screen.queryByRole('alert'); if (error) throw new Error(String(error.props.children)); expect(mockMoney.saveCategorySettingsRequest).toHaveBeenCalledTimes(1); });
    expect(mockMoney.saveCategorySettingsRequest.mock.calls[0][0]).toMatchObject({ actorUserId: mockMoney.userId,
      categoryId: sourceId, expectedCategoryUpdatedAt: version, expectedPlanUpdatedAt: version,
      settings: { name: 'Family supplies', budgetCents: 60000, planRole: 'protected', rolloverEnabled: false } });
    expect(mockMoney.updateCategoryPlan).not.toHaveBeenCalled(); expect(mockMoney.renameCategory).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByLabelText('Name')).toBeNull());
  });
  it('restores a pending request and checks it without editing or recomputing its preview', async () => {
    const pending = { schemaVersion: 1, actorUserId: mockMoney.userId, categoryId: sourceId, requestId: '10000000-0000-4000-8000-000000000003',
      expectedCategoryUpdatedAt: version, expectedPlanUpdatedAt: version, governance: null,
      settings: { name: 'Pending supplies', budgetCents: 70000, fundingRhythm: 'monthly', rolloverEnabled: false, rolloverPolicy: null,
        planRole: 'protected', expectedNeedCents: null, expectedNeedDueMonth: null } } satisfies CategorySettingsRequest;
    mockMoney.loadCategorySettingsRequest.mockResolvedValue(pending);
    mockMoney.saveCategorySettingsRequest.mockResolvedValue({ outcome: 'unknown', message: 'Check this save again.' });
    const screen = renderWithProviders(tree()); fireEvent.press(screen.getByLabelText('Open Household settings'));
    await screen.findByDisplayValue('Pending supplies');
    expect(screen.getByLabelText('Name').props.editable).toBe(false);
    fireEvent.press(screen.getByText('Check save'));
    await waitFor(() => expect(mockMoney.saveCategorySettingsRequest).toHaveBeenCalledWith(pending));
    expect(mockMoney.previewCategoryPlanAmount).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('Pending supplies')).toBeTruthy();
    await screen.findByText('Check this save again.');
  });
  it('retains the rejected draft and its original versions when a background snapshot changes', async () => {
    mockMoney.saveCategorySettingsRequest.mockResolvedValue({ outcome: 'rejected', message: 'The category changed since you reviewed it.' });
    const screen = renderWithProviders(tree()); fireEvent.press(screen.getByLabelText('Open Household settings'));
    await waitFor(() => expect(screen.getByLabelText('Name').props.editable).toBe(true));
    fireEvent.changeText(screen.getByLabelText('Name'), 'My draft');
    mockMoney.snapshot = { ...mockMoney.snapshot, categories: mockMoney.snapshot.categories.map((item) => ({ ...item, name: 'Other adult edit', categoryUpdatedAt: '2026-11-01T11:00:00Z' })) };
    screen.rerender(tree()); fireEvent.press(screen.getByText('Save changes'));
    await screen.findByText('The category changed since you reviewed it.');
    expect(screen.getByDisplayValue('My draft')).toBeTruthy();
    expect(screen.getByLabelText('Name').props.editable).toBe(true);
    expect(mockMoney.saveCategorySettingsRequest.mock.calls[0][0].expectedCategoryUpdatedAt).toBe(version);
  });
  it('saves reserve carry-forward without also enabling monthly rollover', async () => {
    mockMoney.snapshot = { ...mockMoney.snapshot, categories: mockMoney.snapshot.categories.map((item) => ({ ...item, fundingRhythm: 'reserve' as const })) };
    const screen = renderWithProviders(tree()); fireEvent.press(screen.getByLabelText('Open Household settings'));
    await waitFor(() => expect(screen.getByLabelText('Name').props.editable).toBe(true));
    fireEvent.press(screen.getByText('Protected')); fireEvent.press(screen.getByText('Save changes'));
    await waitFor(() => expect(mockMoney.saveCategorySettingsRequest).toHaveBeenCalledTimes(1));
    expect(mockMoney.saveCategorySettingsRequest.mock.calls[0][0].settings).toMatchObject({ fundingRhythm: 'reserve', rolloverEnabled: false,
      rolloverPolicy: { startingBalanceCents: 0 } });
  });

  it('locks native drawer dismissal and editing through preview and save, then exposes recovery', async () => {
    let finish!: (value: null) => void;
    mockMoney.previewCategoryPlanAmount.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    mockMoney.saveCategorySettingsRequest.mockResolvedValue({ outcome: 'unknown', message: 'Check the save again.' });
    const screen = renderWithProviders(tree()); fireEvent.press(screen.getByLabelText('Open Household settings'));
    await waitFor(() => expect(screen.getByLabelText('Name').props.editable).toBe(true));
    fireEvent.changeText(screen.getByLabelText('Monthly amount'), '600.00');
    fireEvent.press(screen.getByText('Save changes'));
    expect(screen.getByTestId('settings-drawer').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByLabelText('Name').props.editable).toBe(false);
    fireEvent.press(screen.getByLabelText('Close category settings'));
    expect(screen.getByLabelText('Name')).toBeTruthy();
    await act(async () => finish(null));
    await screen.findByText('Check save');
    expect(screen.getByTestId('settings-drawer').props.accessibilityState.disabled).toBe(false);
    expect(screen.getByLabelText('Name').props.editable).toBe(false);
  });
  it('ignores a delayed preview for an amount that the user has already changed', async () => {
    let finish!: (value: { outcome: 'blocked'; changes: never[] }) => void;
    mockMoney.previewCategoryPlanAmount.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; })).mockResolvedValueOnce(null);
    const screen = renderWithProviders(tree()); fireEvent.press(screen.getByLabelText('Open Household settings'));
    await waitFor(() => expect(screen.getByLabelText('Name').props.editable).toBe(true));
    fireEvent.changeText(screen.getByLabelText('Monthly amount'), '600.00');
    fireEvent(screen.getByLabelText('Monthly amount'), 'blur');
    fireEvent.changeText(screen.getByLabelText('Monthly amount'), '650.00');
    await act(async () => finish({ outcome: 'blocked', changes: [] }));
    fireEvent.press(screen.getByText('Save changes'));
    await waitFor(() => expect(mockMoney.saveCategorySettingsRequest).toHaveBeenCalledTimes(1));
    expect(mockMoney.saveCategorySettingsRequest.mock.calls[0][0].settings.budgetCents).toBe(65000);
  });

});

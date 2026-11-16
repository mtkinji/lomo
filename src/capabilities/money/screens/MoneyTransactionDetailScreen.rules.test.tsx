import { fireEvent, fireEventAsync, waitFor } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { MoneyTransactionDetailScreen } from './MoneyTransactionDetailScreen';
import { projectMoneySnapshot } from '../data/moneySnapshot';
import { snapshotPerformanceFixture } from '../../../../scripts/money/snapshot-performance-fixture';

const mockMoney = { snapshot: projectMoneySnapshot(snapshotPerformanceFixture(0, 0)), status: 'ready',
  reviewingTransactionId: null, refresh: jest.fn(), saveMerchantRule: jest.fn(), reviewTransactionMeaning: jest.fn() };
jest.mock('../data/MoneyDataContext', () => ({ useMoneyData: () => mockMoney }));
jest.mock('../../../ui/BottomDrawer', () => {
  const { View } = require('react-native');
  return { BottomDrawer: ({ visible, children, bottomAccessory }: { visible: boolean; children: React.ReactNode; bottomAccessory?: React.ReactNode }) => visible ? <View>{children}{bottomAccessory}</View> : null,
    BottomDrawerScrollView: View };
});
jest.mock('../../../ui/BottomGuide', () => {
  const { View } = require('react-native');
  return { BottomGuide: ({ visible, children }: { visible: boolean; children: React.ReactNode }) => visible ? <View>{children}</View> : null };
});
const tree = () => <MoneyTransactionDetailScreen {...({ navigation: { goBack: jest.fn(), popTo: jest.fn() },
  route: { key: 'transaction', name: 'MoneyTransactionDetail', params: { transactionId: 'transaction-0' } } } as unknown as Parameters<typeof MoneyTransactionDetailScreen>[0])} />;
function setup(transfer = false, direction: 'inflow' | 'outflow' = 'outflow') {
  const rows = snapshotPerformanceFixture(2, 0);
  rows.allocations = [];
  rows.transactions = rows.transactions.map((row, index) => ({ ...row, direction,
    merchant_name: transfer ? 'Broker' : 'Online Payment',
    name: transfer ? 'Robinhood' : `Online Payment ${12345 + index} To Taylor Example 10/${23 + index}`,
    budget_id: transfer ? null : 'category-0', money_meaning: transfer ? 'transfer' : null,
    budget_match_source: transfer ? 'excluded' : 'corrected', saved_resource_cents: 0 }));
  mockMoney.snapshot = projectMoneySnapshot(rows);
  mockMoney.saveMerchantRule.mockResolvedValue(undefined);
  mockMoney.reviewTransactionMeaning.mockResolvedValue(undefined);
  return renderWithProviders(tree());
}
beforeEach(() => jest.clearAllMocks());
it('lets a reviewed internal transfer open and save an exact rule', async () => {
  const screen = setup(true);
  await fireEventAsync.press(screen.getByText('Review rule'));
  await fireEventAsync.press(screen.getByText('Create rule'));
  expect(mockMoney.saveMerchantRule).toHaveBeenCalledWith(expect.objectContaining({ transactionId: 'transaction-0', targetKind: 'transfer', matchMode: 'exact' }));
});
it('retains a typed late-description pattern, previews its match, and submits the same words', async () => {
  const screen = setup();
  await fireEventAsync.press(screen.getByText('Review rule'));
  fireEvent.press(screen.getByText('Partial match'));
  fireEvent.changeText(screen.getByLabelText('Merchant contains'), 'Taylor Example');
  expect(screen.getByDisplayValue('Taylor Example')).toBeTruthy();
  expect(screen.getByText('Online Payment 12346 To Taylor Example 10/24')).toBeTruthy();
  await fireEventAsync.press(screen.getByText('Create rule'));
  await waitFor(() => expect(mockMoney.saveMerchantRule).toHaveBeenCalledWith(expect.objectContaining({ merchantPattern: 'Taylor Example', matchMode: 'partial' })));
});

it('offers rules for incoming internal transfers too', async () => {
  const screen = setup(true, 'inflow');
  await fireEventAsync.press(screen.getByText('Review rule'));
  await fireEventAsync.press(screen.getByText('Create rule'));
  expect(mockMoney.saveMerchantRule).toHaveBeenCalledWith(expect.objectContaining({ targetKind: 'transfer' }));
});
it('keeps the entered pattern and review open when saving fails', async () => {
  const screen = setup(true);
  mockMoney.saveMerchantRule.mockRejectedValueOnce(new Error('Rule was not confirmed'));
  await fireEventAsync.press(screen.getByText('Review rule'));
  fireEvent.press(screen.getByText('Partial match'));
  fireEvent.changeText(screen.getByLabelText('Merchant contains'), 'Broker');
  await fireEventAsync.press(screen.getByText('Create rule'));
  expect(screen.getByDisplayValue('Broker')).toBeTruthy();
  expect(screen.getAllByText('Rule was not confirmed').length).toBeGreaterThan(0);
  expect(screen.getByText('Create rule')).toBeTruthy();
});
it('dismisses a rule review without creating a rule', async () => {
  const screen = setup(true);
  await fireEventAsync.press(screen.getByText('Review rule'));
  await fireEventAsync.press(screen.getByText('Not now'));
  expect(mockMoney.saveMerchantRule).not.toHaveBeenCalled();
  expect(screen.queryByText('Create rule')).toBeNull();
});

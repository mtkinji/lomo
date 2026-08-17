import { fireEvent, render } from '@testing-library/react-native';
import { MoneyTransactionsScreen } from './MoneyTransactionsScreen';

const mockRefresh = jest.fn(async () => undefined);
const mockReconcileGovernedPlanFoundation = jest.fn(async () => undefined);
const mockReconcileConnectedActivity = jest.fn(async () => null);
const mockSnapshot = {
  accounts: [{ id: 'chase-savings', name: 'Chase Savings' }],
  categories: [],
  transactions: [] as Array<Record<string, unknown>>,
  lastSyncedAt: null,
};

jest.mock('../data/MoneyDataContext', () => ({
  useMoneyData: () => ({
    refresh: mockRefresh,
    reconcileGovernedPlanFoundation: mockReconcileGovernedPlanFoundation,
    reconcileConnectedActivity: mockReconcileConnectedActivity,
    snapshot: mockSnapshot,
  }),
}));

jest.mock('./MoneyScreenFrame', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');

  return {
    MoneyScreenFrame: ({ children, onPressBack, title }: { children?: React.ReactNode; onPressBack?: () => void; title: string }) => (
      <View>
        <Text>{title}</Text>
        {onPressBack ? (
          <Pressable accessibilityLabel={`Go back from ${title}`} onPress={onPressBack} />
        ) : (
          <View accessibilityLabel="Open navigation menu" />
        )}
        {children}
      </View>
    ),
  };
});

describe('MoneyTransactionsScreen navigation hierarchy', () => {
  beforeEach(() => {
    mockSnapshot.transactions = [];
  });

  it('replaces global navigation with back navigation for an account inventory', () => {
    const navigation = {
      goBack: jest.fn(),
      navigate: jest.fn(),
      setParams: jest.fn(),
    };
    const route = {
      key: 'account-transactions',
      name: 'MoneyTransactions' as const,
      params: { accountId: 'chase-savings' },
    };

    const { getByLabelText, queryByLabelText } = render(
      <MoneyTransactionsScreen navigation={navigation as never} route={route as never} />,
    );

    expect(queryByLabelText('Open navigation menu')).toBeNull();
    fireEvent.press(getByLabelText('Go back from Chase Savings'));
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('keeps global navigation on the top-level transactions inventory', () => {
    const navigation = {
      goBack: jest.fn(),
      navigate: jest.fn(),
      setParams: jest.fn(),
    };
    const route = {
      key: 'all-transactions',
      name: 'MoneyTransactions' as const,
      params: undefined,
    };

    const { getByLabelText, queryByLabelText } = render(
      <MoneyTransactionsScreen navigation={navigation as never} route={route as never} />,
    );

    expect(getByLabelText('Open navigation menu')).toBeTruthy();
    expect(queryByLabelText(/Go back from/)).toBeNull();
  });

  it('shows exactly the requested purchases in the focused review flow', () => {
    mockSnapshot.transactions = [
      transaction('review-me', 'Corner Market'),
      transaction('not-requested', 'Coffee Shop'),
    ];
    const navigation = { goBack: jest.fn(), navigate: jest.fn(), setParams: jest.fn() };
    const route = {
      key: 'review-purchases',
      name: 'MoneyTransactions' as const,
      params: { reviewTransactionIds: ['review-me'] },
    };

    const screen = render(<MoneyTransactionsScreen navigation={navigation as never} route={route as never} />);

    expect(screen.getByText('Review purchases')).toBeTruthy();
    expect(screen.getByText('Corner Market')).toBeTruthy();
    expect(screen.queryByText('Coffee Shop')).toBeNull();
    expect(screen.getByLabelText('Go back from Review purchases')).toBeTruthy();
    fireEvent.press(screen.getByLabelText(/Open Corner Market transaction/));
    expect(navigation.navigate).toHaveBeenCalledWith('MoneyTransactionDetail', {
      transactionId: 'review-me',
      economicRoleReview: true,
    });
  });

  it('uses the calculation evidence label for a scoped audit', () => {
    mockSnapshot.transactions = [transaction('flexible', 'Corner Market')];
    const navigation = { goBack: jest.fn(), navigate: jest.fn(), setParams: jest.fn() };
    const route = {
      key: 'flexible-spending',
      name: 'MoneyTransactions' as const,
      params: { reviewTransactionIds: ['flexible'], inventoryTitle: 'Flexible spending' },
    };

    const screen = render(<MoneyTransactionsScreen navigation={navigation as never} route={route as never} />);

    expect(screen.getByText('Flexible spending')).toBeTruthy();
    expect(screen.getByLabelText('Go back from Flexible spending')).toBeTruthy();
  });

  it('shows category truth for pending purchases instead of settlement status', () => {
    mockSnapshot.transactions = [
      { ...transaction('amazon', 'Amazon'), pending: true, categoryId: 'shopping', categoryName: 'Shopping', reviewState: 'assigned' },
      { ...transaction('unknown', 'Unknown merchant'), pending: true },
    ];
    const navigation = { goBack: jest.fn(), navigate: jest.fn(), setParams: jest.fn() };
    const route = { key: 'pending-truth', name: 'MoneyTransactions' as const, params: undefined };

    const screen = render(<MoneyTransactionsScreen navigation={navigation as never} route={route as never} />);

    expect(screen.getByText('Shopping')).toBeTruthy();
    expect(screen.getByText('Needs review')).toBeTruthy();
    expect(screen.queryByText('Pending')).toBeNull();
    expect(screen.queryByText('Not counted')).toBeNull();
    expect(screen.queryByText('Temporary hold')).toBeNull();
  });
});

function transaction(id: string, merchantName: string) {
  const today = new Date();
  const localDate = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  return {
    id, accountId: null, accountName: 'Checking', institutionName: 'Bank', merchantName,
    amountCents: 1000, direction: 'outflow', date: localDate, pending: false,
    currencyCode: 'USD', categoryId: null, categoryName: 'Needs review', reviewState: 'needs_review', moneyMeaning: null,
  };
}

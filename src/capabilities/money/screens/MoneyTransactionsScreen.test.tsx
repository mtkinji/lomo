import { act, fireEvent, render } from '@testing-library/react-native';
import { FlatList } from 'react-native';
import { MoneyTransactionsScreen } from './MoneyTransactionsScreen';

const mockRefresh = jest.fn(async () => undefined);
const mockReconcileGovernedPlanFoundation = jest.fn(async () => undefined);
const mockReconcileConnectedActivity = jest.fn(async () => null);
let mockMoneyScreenFrameOnRefresh: (() => Promise<unknown>) | undefined;
const mockSnapshot = {
  accounts: [{ id: 'chase-savings', name: 'Chase Savings' }],
  categories: [] as Array<Record<string, unknown>>,
  transactions: [] as Array<Record<string, unknown>>,
  lastSyncedAt: null as string | null,
  periodLabel: 'August 2026',
  livingLimitAnswer: { facts: { periodId: '2026-08', flexibleRoomCents: -54_047 } },
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
  const { SafeAreaProvider } = require('react-native-safe-area-context');

  return {
    MoneyScreenFrame: ({ children, headerRightElement, onPressBack, onRefresh, title }: {
      children?: React.ReactNode | ((props: import('./MoneyScreenFrame').MoneyFrameScrollProps) => React.ReactNode);
      headerRightElement?: React.ReactNode;
      onPressBack?: () => void;
      onRefresh?: () => Promise<unknown>;
      title: string;
    }) => {
      mockMoneyScreenFrameOnRefresh = onRefresh;
      return (
        <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, right: 0, bottom: 34, left: 0 } }}>
        <View>
          <Text>{title}</Text>
          {headerRightElement}
          {onPressBack ? (
            <Pressable accessibilityLabel={`Go back from ${title}`} onPress={onPressBack} />
          ) : (
            <View accessibilityLabel="Open navigation menu" />
          )}
          {typeof children === 'function' ? children({ warning: null }) : children}
        </View>
        </SafeAreaProvider>
      );
    },
  };
});

describe('MoneyTransactionsScreen navigation hierarchy', () => {
  afterEach(() => jest.restoreAllMocks());
  beforeEach(() => {
    jest.clearAllMocks();
    mockSnapshot.categories = [];
    mockSnapshot.transactions = [];
    mockSnapshot.lastSyncedAt = null;
    mockMoneyScreenFrameOnRefresh = undefined;
  });

  it('opens a large inventory without mounting thousands of offscreen transaction controls', () => {
    mockSnapshot.transactions = Array.from({ length: 4000 }, (_, index) => transaction(`large-${index}`, `Synthetic merchant ${index}`));
    const navigation = { canGoBack: () => true, goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn(), setParams: jest.fn() };
    const route = { key: 'large-inventory', name: 'MoneyTransactions' as const, params: undefined };
    const screen = render(<MoneyTransactionsScreen navigation={navigation as never} route={route as never} />);
    const mountedRows = screen.getAllByLabelText(/^Open Synthetic merchant .* transaction/);
    expect(mountedRows.length).toBeGreaterThan(0);
    expect(mountedRows.length).toBeLessThan(100);
    // Offscreen rows must remain reachable: virtualization is not a data limit.
    const list = screen.UNSAFE_getByType(FlatList);
    expect(list.props.data.filter((row: { kind: string }) => row.kind === 'transaction')
      .map((row: { transaction: { id: string } }) => row.transaction.id))
      .toEqual(mockSnapshot.transactions.map((row) => row.id));
    fireEvent.press(mountedRows[0]);
    expect(navigation.navigate).toHaveBeenCalledWith('MoneyTransactionDetail', { transactionId: 'large-0', economicRoleReview: false });
  });

  it('lets merchant and review text wrap at accessibility sizes while preserving the open action', () => {
    jest.spyOn(require('react-native'), 'useWindowDimensions').mockReturnValue({ width: 390, height: 844, scale: 3, fontScale: 2.35 });
    const merchant = 'A long merchant name that must remain readable at large text sizes';
    mockSnapshot.transactions = [transaction('large-text', merchant)];
    const navigation = { canGoBack: () => true, goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn(), setParams: jest.fn() };
    const route = { key: 'large-text', name: 'MoneyTransactions' as const, params: undefined };
    const screen = render(<MoneyTransactionsScreen navigation={navigation as never} route={route as never} />);
    expect(screen.getByText(merchant).props.numberOfLines).toBeUndefined();
    expect(screen.getByText('Needs review').props.numberOfLines).toBeUndefined();
    fireEvent.press(screen.getByLabelText(new RegExp(`Open ${merchant} transaction`)));
    expect(navigation.navigate).toHaveBeenCalledWith('MoneyTransactionDetail', { transactionId: 'large-text', economicRoleReview: false });
  });

  it('replaces global navigation with back navigation for an account inventory', () => {
    const navigation = {
      canGoBack: jest.fn(() => true),
      goBack: jest.fn(),
      navigate: jest.fn(),
      replace: jest.fn(),
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

  it('returns the full transactions inventory to Budget through local history', () => {
    const navigation = {
      canGoBack: jest.fn(() => true),
      goBack: jest.fn(),
      navigate: jest.fn(),
      replace: jest.fn(),
      setParams: jest.fn(),
    };
    const route = {
      key: 'all-transactions',
      name: 'MoneyTransactions' as const,
      params: undefined,
    };

    const { getByLabelText, getByText, queryByLabelText } = render(
      <MoneyTransactionsScreen navigation={navigation as never} route={route as never} />,
    );

    expect(queryByLabelText('Open navigation menu')).toBeNull();
    fireEvent.press(getByLabelText('Go back from Transactions'));
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(navigation.replace).not.toHaveBeenCalled();
    fireEvent.press(getByText('Connect an account'));
    expect(navigation.navigate).toHaveBeenCalledWith('MoneyAccounts');
  });

  it('falls back to Budget when Transactions was opened directly', () => {
    const navigation = {
      canGoBack: jest.fn(() => false),
      goBack: jest.fn(),
      navigate: jest.fn(),
      replace: jest.fn(),
      setParams: jest.fn(),
    };
    const route = { key: 'direct-transactions', name: 'MoneyTransactions' as const, params: undefined };

    const screen = render(<MoneyTransactionsScreen navigation={navigation as never} route={route as never} />);

    fireEvent.press(screen.getByLabelText('Go back from Transactions'));
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(navigation.replace).toHaveBeenCalledWith('MoneySummary');
  });

  it('shares the compact bank freshness stamp and pull sync contract with Budget', async () => {
    mockSnapshot.lastSyncedAt = new Date().toISOString();
    const navigation = { goBack: jest.fn(), navigate: jest.fn(), setParams: jest.fn() };
    const route = { key: 'fresh-transactions', name: 'MoneyTransactions' as const, params: undefined };

    const screen = render(<MoneyTransactionsScreen navigation={navigation as never} route={route as never} />);

    expect(screen.getByText('Just now')).toBeTruthy();
    expect(screen.getByLabelText('Bank data updated just now')).toBeTruthy();
    expect(screen.queryByText('Updated just now')).toBeNull();
    expect(mockMoneyScreenFrameOnRefresh).toBeDefined();

    await act(async () => {
      await mockMoneyScreenFrameOnRefresh?.();
    });

    expect(mockReconcileConnectedActivity).toHaveBeenCalledWith({ trigger: 'manual_sync', sync: true });
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

  it('shows an overage category once instead of repeating it under every transaction', () => {
    mockSnapshot.categories = [{
      id: 'miscellaneous', sourceId: 'miscellaneous-source', name: 'Miscellaneous',
      planRole: 'flexible', plannedCents: 10_000, spentCents: 64_047,
    }];
    mockSnapshot.transactions = [
      { ...transaction('venmo-one', 'Venmo'), date: '2026-08-12', amountCents: 47_000, categoryId: 'miscellaneous', categoryName: 'Miscellaneous', reviewState: 'assigned' },
      { ...transaction('venmo-two', 'Venmo'), date: '2026-08-13', amountCents: 17_047, categoryId: 'miscellaneous', categoryName: 'Miscellaneous', reviewState: 'assigned' },
    ];
    const navigation = { canGoBack: jest.fn(() => true), goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn(), setParams: jest.fn() };
    const route = {
      key: 'review-overages',
      name: 'MoneyTransactions' as const,
      params: { inventoryTitle: 'Review overages', overageReview: true, flexibleRoomCents: -54_047 },
    };

    const screen = render(<MoneyTransactionsScreen navigation={navigation as never} route={route as never} />);

    expect(screen.getAllByText('Miscellaneous')).toHaveLength(1);
    expect(screen.getByLabelText('Open Venmo transaction, Miscellaneous, -$470')).toBeTruthy();
    expect(screen.getByLabelText('Open Venmo transaction, Miscellaneous, -$170.47')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Open Venmo transaction, Miscellaneous, -$170.47'));
    expect(navigation.navigate).toHaveBeenCalledWith('MoneyTransactionDetail', {
      transactionId: 'venmo-two', coverageReview: true,
    });
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

  it('shows inferred provider payroll as income instead of not budgeted', () => {
    mockSnapshot.transactions = [{
      ...transaction('adobe-payroll', 'Adobe'),
      amountCents: 333_181,
      direction: 'inflow',
      categoryName: 'Income',
      reviewState: 'not_counted',
      providerCategoryPrimary: 'INCOME',
      providerCategoryDetailed: 'INCOME_SALARY',
    }];
    const navigation = { goBack: jest.fn(), navigate: jest.fn(), setParams: jest.fn() };
    const route = { key: 'income-truth', name: 'MoneyTransactions' as const, params: undefined };

    const screen = render(<MoneyTransactionsScreen navigation={navigation as never} route={route as never} />);

    expect(screen.getByText('Income')).toBeTruthy();
    expect(screen.queryByText('Not budgeted')).toBeNull();
  });

  it('shows a linked credit-card payment once as a neutral account relationship', () => {
    const today = new Date();
    const date = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
    const transferPair = {
      counterpartTransactionId: 'card-credit',
      sourceAccountName: 'Total Checking',
      destinationAccountName: 'Credit Card',
    };
    mockSnapshot.transactions = [
      {
        ...transaction('checking-payment', 'Payment to Chase card'),
        accountName: 'Total Checking', amountCents: 350_065, date, moneyMeaning: 'transfer',
        categoryName: 'Internal transfer', reviewState: 'not_counted', transferPair,
      },
      {
        ...transaction('card-credit', 'Payment Thank You'),
        accountName: 'Credit Card', amountCents: 350_065, date, direction: 'inflow', moneyMeaning: 'transfer',
        categoryName: 'Internal transfer', reviewState: 'not_counted',
        transferPair: { ...transferPair, counterpartTransactionId: 'checking-payment' },
      },
    ];
    const navigation = { canGoBack: jest.fn(() => true), goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn(), setParams: jest.fn() };
    const route = { key: 'paired-payment', name: 'MoneyTransactions' as const, params: undefined };

    const screen = render(<MoneyTransactionsScreen navigation={navigation as never} route={route as never} />);

    expect(screen.getAllByText('Credit card payment')).toHaveLength(1);
    expect(screen.getByText('Total Checking → Credit Card')).toBeTruthy();
    expect(screen.getByText('Transfer')).toBeTruthy();
    expect(screen.getByText('$3,500.65')).toBeTruthy();
    expect(screen.queryByText('Payment Thank You')).toBeNull();
    fireEvent.press(screen.getByLabelText('Open credit card payment, Total Checking to Credit Card, $3,500.65'));
    expect(navigation.navigate).toHaveBeenCalledWith('MoneyTransactionDetail', {
      transactionId: 'checking-payment',
      economicRoleReview: false,
    });
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

import { fireEvent, render } from '@testing-library/react-native';
import { MoneyTransactionsScreen } from './MoneyTransactionsScreen';

const mockRefresh = jest.fn(async () => undefined);
const mockReconcileGovernedPlanFoundation = jest.fn(async () => undefined);

jest.mock('../data/MoneyDataContext', () => ({
  useMoneyData: () => ({
    refresh: mockRefresh,
    reconcileGovernedPlanFoundation: mockReconcileGovernedPlanFoundation,
    snapshot: {
      accounts: [{ id: 'chase-savings', name: 'Chase Savings' }],
      categories: [],
      transactions: [],
      lastSyncedAt: null,
    },
  }),
}));

jest.mock('./MoneyScreenFrame', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');

  return {
    MoneyScreenFrame: ({ onPressBack, title }: { onPressBack?: () => void; title: string }) => (
      <View>
        <Text>{title}</Text>
        {onPressBack ? (
          <Pressable accessibilityLabel={`Go back from ${title}`} onPress={onPressBack} />
        ) : (
          <View accessibilityLabel="Open navigation menu" />
        )}
      </View>
    ),
  };
});

describe('MoneyTransactionsScreen navigation hierarchy', () => {
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
});

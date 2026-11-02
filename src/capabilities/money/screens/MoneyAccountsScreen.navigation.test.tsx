import { fireEvent } from '@testing-library/react-native';
import { StackActions, StackRouter } from '@react-navigation/native';
import { renderWithProviders } from '../../../test/renderWithProviders';
import { MoneyAccountsScreen } from './MoneyAccountsScreen';

jest.mock('../native/moneyPlaidLink', () => ({ startMoneyPlaidLink: jest.fn(), startMoneyPlaidRepair: jest.fn() }));
jest.mock('../data/MoneyDataContext', () => ({ useMoneyData: () => ({
  snapshot: null, status: 'loading', refresh: jest.fn(),
  reconcileConnectedActivity: jest.fn(), disconnectConnection: jest.fn(),
}) }));
jest.mock('../../../navigation/CapabilityShellContext', () => ({ useCapabilityShell: () => ({ openMenu: jest.fn() }) }));

it.each([true, false])('provides a visible return to Budget with prior summary history: %s', (hasSummary) => {
  const router = StackRouter({ initialRouteName: hasSummary ? 'MoneySummary' : 'MoneyAccounts' });
  const options = { routeNames: ['MoneySummary', 'MoneyAccounts'],
    routeParamList: { MoneySummary: undefined, MoneyAccounts: undefined },
    routeGetIdList: { MoneySummary: undefined, MoneyAccounts: undefined } };
  let state = router.getInitialState(options);
  const summaryKey = hasSummary ? state.routes[0].key : null;
  const dispatch = (action: Parameters<typeof router.getStateForAction>[1]) => {
    const nextState = router.getStateForAction(state, action, options);
    expect(nextState).not.toBeNull();
    state = router.getRehydratedState(nextState!, options);
  };
  if (hasSummary) dispatch(StackActions.push('MoneyAccounts'));
  const screen = renderWithProviders(<MoneyAccountsScreen {...({
    route: { key: state.routes[state.index].key, name: 'MoneyAccounts' },
    navigation: { navigate: jest.fn(), popTo: (name: string) => {
      dispatch(StackActions.popTo(name));
    } },
  } as unknown as Parameters<typeof MoneyAccountsScreen>[0])} />);
  fireEvent.press(screen.getByLabelText('Go back from Accounts'));
  expect(state.routes.map((route) => route.name)).toEqual(['MoneySummary']);
  if (summaryKey) expect(state.routes[0].key).toBe(summaryKey);
});

const mockOpenPaywall = jest.fn();
const mockGetState = jest.fn();

jest.mock('../../../services/paywall', () => ({ openPaywallInterstitial: (...args: unknown[]) => mockOpenPaywall(...args) }));
jest.mock('../../../store/useEntitlementsStore', () => ({ useEntitlementsStore: { getState: () => mockGetState() } }));

import { MoneyProRequiredError, assertMoneyProAccess, requestMoneyProAccess } from './moneyProAccess';

beforeEach(() => {
  mockOpenPaywall.mockReset();
  mockGetState.mockReturnValue({ isPro: false });
});

it('preserves the intended Money action and opens its contextual paywall for Free', () => {
  expect(requestMoneyProAccess('money_connect_account')).toBe(false);
  expect(mockOpenPaywall).toHaveBeenCalledWith({ reason: 'pro_money_budgets', source: 'money_connect_account' });
});

it('allows Pro and blocks non-UI bypasses for Free', () => {
  mockGetState.mockReturnValue({ isPro: true });
  expect(requestMoneyProAccess('money_mutation')).toBe(true);
  expect(assertMoneyProAccess).not.toThrow();
  mockGetState.mockReturnValue({ isPro: false });
  expect(assertMoneyProAccess).toThrow(MoneyProRequiredError);
});

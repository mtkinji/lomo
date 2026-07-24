import type { MoneyPlaidLinkResult } from './moneyPlaidLinkTypes';

export async function startMoneyPlaidLink(): Promise<MoneyPlaidLinkResult> {
  throw new Error('Plaid Link requires a native Kwilt build.');
}

import type { MoneyPlaidLinkResult, MoneyPlaidLinkSession } from './moneyPlaidLinkTypes';

export async function prepareMoneyPlaidLink(): Promise<MoneyPlaidLinkSession> {
  throw new Error('Plaid Link requires a native Kwilt build.');
}

export async function startMoneyPlaidLink(): Promise<MoneyPlaidLinkResult> {
  const session = await prepareMoneyPlaidLink();
  return session.open();
}

import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeMoneyPlaidError } from './moneyPlaidErrors';

export type MoneyPlaidLinkToken = { link_token: string; expiration?: string; request_id?: string };
export type MoneyPlaidLinkPlatform = 'ios' | 'android';
export type MoneyPlaidSyncResult = {
  connectionId: string;
  transactionCount: number;
  added: number;
  modified: number;
  removed: number;
};
export type MoneyPlaidExchangeResult = {
  connectionId: string;
  institutionName: string;
  accountCount: number;
  sync: MoneyPlaidSyncResult;
};

export async function createMoneyPlaidLinkToken(
  client: SupabaseClient,
  platform: MoneyPlaidLinkPlatform,
  connectionId?: string,
): Promise<MoneyPlaidLinkToken> {
  const { data, error } = await client.functions.invoke<MoneyPlaidLinkToken>('create-plaid-link-token', {
    body: { platform, ...(connectionId ? { connectionId } : {}) },
  });
  if (error) throw await normalizeMoneyPlaidError(error, 'link_token');
  if (!data?.link_token) throw new Error('Plaid did not return a Link token.');
  return data;
}

export async function exchangeMoneyPlaidToken(
  client: SupabaseClient,
  publicToken: string,
  metadata: unknown,
): Promise<MoneyPlaidExchangeResult> {
  const { data, error } = await client.functions.invoke<MoneyPlaidExchangeResult>('exchange-plaid-public-token', {
    body: { publicToken, metadata },
  });
  if (error) throw await normalizeMoneyPlaidError(error, 'exchange');
  if (!data?.connectionId) throw new Error('Plaid did not return a connected account.');
  return data;
}

export async function syncMoneyTransactions(client: SupabaseClient): Promise<MoneyPlaidSyncResult> {
  const { data, error } = await client.functions.invoke<{ sync: MoneyPlaidSyncResult }>('sync-plaid-transactions', { body: {} });
  if (error) throw await normalizeMoneyPlaidError(error, 'sync');
  if (!data?.sync?.connectionId) throw new Error('Plaid sync did not return a connection.');
  return data.sync;
}

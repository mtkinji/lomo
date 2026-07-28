import { FunctionsHttpError, type SupabaseClient } from '@supabase/supabase-js';
import { createMoneyPlaidLinkToken, exchangeMoneyPlaidToken, syncMoneyTransactions } from './moneyPlaidApi';

function clientWith(dataByFunction: Record<string, unknown>) {
  const invoke = jest.fn(async (name: string) => ({ data: dataByFunction[name], error: null }));
  return { client: { functions: { invoke } } as unknown as SupabaseClient, invoke };
}

describe('Money Plaid API', () => {
  it('creates a short-lived token without client-side Plaid credentials', async () => {
    const { client, invoke } = clientWith({
      'create-plaid-link-token': { link_token: 'link-sandbox-1', expiration: '2026-07-24T00:00:00Z' },
    });
    await expect(createMoneyPlaidLinkToken(client, 'ios')).resolves.toMatchObject({ link_token: 'link-sandbox-1' });
    expect(invoke).toHaveBeenCalledWith('create-plaid-link-token', { body: { platform: 'ios' } });
  });

  it('exchanges only the public token and bounded Link metadata', async () => {
    const { client, invoke } = clientWith({
      'exchange-plaid-public-token': {
        connectionId: 'connection-1', institutionName: 'Bank', accountCount: 2,
        sync: { connectionId: 'connection-1', transactionCount: 20, added: 20, modified: 0, removed: 0 },
      },
    });
    await exchangeMoneyPlaidToken(client, 'public-token', { institution: { name: 'Bank' } });
    expect(invoke).toHaveBeenCalledWith('exchange-plaid-public-token', {
      body: { publicToken: 'public-token', metadata: { institution: { name: 'Bank' } } },
    });
  });

  it('requests authoritative transaction sync without an access token on device', async () => {
    const { client, invoke } = clientWith({
      'sync-plaid-transactions': { sync: { connectionId: 'connection-1', transactionCount: 20, added: 0, modified: 1, removed: 0 } },
    });
    await expect(syncMoneyTransactions(client)).resolves.toMatchObject({ modified: 1 });
    expect(invoke).toHaveBeenCalledWith('sync-plaid-transactions', { body: {} });
  });

  it('preserves structured function diagnostics without leaking provider copy', async () => {
    const response = new Response(JSON.stringify({
      plaid: {
        error_code: 'INSTITUTION_DOWN',
        error_message: 'raw provider copy',
        request_id: 'request-api',
      },
    }), { status: 503, headers: { 'content-type': 'application/json' } });
    const client = {
      functions: {
        invoke: jest.fn(async () => ({ data: null, error: new FunctionsHttpError(response) })),
      },
    } as unknown as SupabaseClient;

    await expect(createMoneyPlaidLinkToken(client, 'ios')).rejects.toMatchObject({
      code: 'institution_unavailable',
      diagnosticCode: 'INSTITUTION_DOWN',
      requestId: 'request-api',
      message: 'Your bank is temporarily unavailable. Try again in a few minutes.',
    });
  });
});

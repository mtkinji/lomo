jest.mock('../utils/getEnv', () => ({
  getSupabasePublishableKey: jest.fn(() => 'publishable-key'),
}));

jest.mock('./backend/auth', () => ({
  getAccessToken: jest.fn(async () => 'access-token'),
}));

jest.mock('./backend/supabaseClient', () => ({
  resetSupabaseAuthStorage: jest.fn(async () => undefined),
  getSupabaseClient: jest.fn(() => ({
    auth: { getUser: jest.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })) },
  })),
}));

jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => '11111111-1111-4111-8111-111111111111') }));

jest.mock('./accountDeletionLocalCleanup', () => ({
  purgeDeletedAccountFromDevice: jest.fn(async () => ({ ok: true })),
}));

jest.mock('./edgeFunctions', () => ({
  getEdgeFunctionUrlCandidatesForHeaders: jest.fn(() => ['https://example.functions.supabase.co/functions/v1/account-delete']),
}));

jest.mock('./installId', () => ({
  getInstallId: jest.fn(async () => 'install-1'),
}));

import { getAccessToken } from './backend/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseClient } from './backend/supabaseClient';
import { purgeDeletedAccountFromDevice } from './accountDeletionLocalCleanup';
import { AccountDeletionClientError, deleteAccount } from './accountDeletion';

describe('deleteAccount', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
    })) as any;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('posts confirmed deletion with the signed-in user token', async () => {
    await expect(deleteAccount({ userId: 'user-1' })).resolves.toEqual({ ok: true });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/account-delete');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({
      confirm: true,
      operationId: '11111111-1111-4111-8111-111111111111',
    }));
    expect(init.headers.get('Authorization')).toBe('Bearer access-token');
    expect(init.headers.get('apikey')).toBe('publishable-key');
    expect(init.headers.get('x-kwilt-install-id')).toBe('install-1');
    expect(purgeDeletedAccountFromDevice).toHaveBeenCalledWith({ userId: 'user-1' });
  });

  it('requires a fresh signed-in session', async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    await expect(deleteAccount({ userId: 'user-1' })).rejects.toThrow('Please sign in again');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('surfaces server-side error messages', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ error: { message: 'Delete failed' } }),
    })) as any;

    await expect(deleteAccount({ userId: 'user-1' })).rejects.toThrow('Delete failed');
    expect(purgeDeletedAccountFromDevice).not.toHaveBeenCalled();
  });

  it('reuses the same persisted operation after a retryable response', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 503, text: async () => JSON.stringify({ error: { code: 'provider_unavailable', message: 'Try again' } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => JSON.stringify({ ok: true }) });

    await expect(deleteAccount({ userId: 'user-1' })).rejects.toThrow('Try again');
    await expect(deleteAccount({ userId: 'user-1' })).resolves.toEqual({ ok: true });

    const first = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    const second = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body);
    expect(first.operationId).toBe(second.operationId);
  });

  it('treats an uncertain response as complete only when Auth confirms the user is gone', async () => {
    global.fetch = jest.fn(async () => { throw new TypeError('Network request failed'); }) as any;
    (getSupabaseClient as jest.Mock).mockReturnValueOnce({
      auth: { getUser: jest.fn(async () => ({ data: { user: null }, error: { status: 401, message: 'User not found' } })) },
    });

    await expect(deleteAccount({ userId: 'user-1' })).resolves.toEqual({ ok: true });
    expect(purgeDeletedAccountFromDevice).toHaveBeenCalledWith({ userId: 'user-1' });
  });

  it('reports an indeterminate result when neither the response nor Auth can be checked', async () => {
    global.fetch = jest.fn(async () => { throw new TypeError('Network request failed'); }) as any;
    (getSupabaseClient as jest.Mock).mockReturnValueOnce({
      auth: { getUser: jest.fn(async () => { throw new TypeError('offline'); }) },
    });

    await expect(deleteAccount({ userId: 'user-1' })).rejects.toMatchObject({
      code: 'deletion_indeterminate',
      deletionConfirmed: false,
    } satisfies Partial<AccountDeletionClientError>);
    expect(purgeDeletedAccountFromDevice).not.toHaveBeenCalled();
  });

  it('distinguishes confirmed deletion from incomplete local cleanup', async () => {
    (purgeDeletedAccountFromDevice as jest.Mock).mockRejectedValueOnce(new Error('local cleanup failed'));

    await expect(deleteAccount({ userId: 'user-1' })).rejects.toMatchObject({
      code: 'local_cleanup_incomplete',
      deletionConfirmed: true,
    } satisfies Partial<AccountDeletionClientError>);
  });

  it('preserves legacy Apple access-removal guidance from the server', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true, manualAppleAccessRemovalRequired: true }),
    })) as any;

    await expect(deleteAccount({ userId: 'user-1' })).resolves.toEqual({
      ok: true,
      manualAppleAccessRemovalRequired: true,
    });
  });
});

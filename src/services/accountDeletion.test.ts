jest.mock('../utils/getEnv', () => ({
  getSupabasePublishableKey: jest.fn(() => 'publishable-key'),
}));

jest.mock('./backend/auth', () => ({
  getAccessToken: jest.fn(async () => 'access-token'),
}));

jest.mock('./backend/supabaseClient', () => ({
  resetSupabaseAuthStorage: jest.fn(async () => undefined),
}));

jest.mock('./edgeFunctions', () => ({
  getEdgeFunctionUrlCandidatesForHeaders: jest.fn(() => ['https://example.functions.supabase.co/functions/v1/account-delete']),
}));

jest.mock('./installId', () => ({
  getInstallId: jest.fn(async () => 'install-1'),
}));

import { getAccessToken } from './backend/auth';
import { resetSupabaseAuthStorage } from './backend/supabaseClient';
import { deleteAccount } from './accountDeletion';

describe('deleteAccount', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
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
    await expect(deleteAccount()).resolves.toEqual({ ok: true });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/account-delete');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ confirm: true }));
    expect(init.headers.get('Authorization')).toBe('Bearer access-token');
    expect(init.headers.get('apikey')).toBe('publishable-key');
    expect(init.headers.get('x-kwilt-install-id')).toBe('install-1');
    expect(resetSupabaseAuthStorage).toHaveBeenCalledTimes(1);
  });

  it('requires a fresh signed-in session', async () => {
    (getAccessToken as jest.Mock).mockResolvedValueOnce(null);

    await expect(deleteAccount()).rejects.toThrow('Please sign in again');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('surfaces server-side error messages', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ error: { message: 'Delete failed' } }),
    })) as any;

    await expect(deleteAccount()).rejects.toThrow('Delete failed');
    expect(resetSupabaseAuthStorage).not.toHaveBeenCalled();
  });
});

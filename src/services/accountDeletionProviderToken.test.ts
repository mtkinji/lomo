jest.mock('../utils/getEnv', () => ({ getSupabasePublishableKey: jest.fn(() => 'publishable-key') }));
jest.mock('./edgeFunctions', () => ({
  getEdgeFunctionUrlCandidatesForHeaders: jest.fn(() => ['https://example.functions.supabase.co/functions/v1/account-deletion-token-register']),
}));

import { registerAppleAccountDeletionToken } from './accountDeletionProviderToken';

describe('registerAppleAccountDeletionToken', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn(async () => ({ ok: true, status: 200, text: async () => '{"ok":true}' })) as never;
  });

  afterAll(() => { global.fetch = originalFetch; });

  it('escrows only the revocable Apple refresh token', async () => {
    await registerAppleAccountDeletionToken({
      accessToken: 'supabase-jwt',
      providerRefreshToken: 'apple-refresh-token',
    });
    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.headers.get('Authorization')).toBe('Bearer supabase-jwt');
    expect(JSON.parse(init.body)).toEqual({ token: 'apple-refresh-token', tokenKind: 'refresh_token' });
  });

  it('classifies sessions without a refresh token as legacy manual revocation', async () => {
    await expect(registerAppleAccountDeletionToken({
      accessToken: 'supabase-jwt',
      providerRefreshToken: null,
    })).resolves.toEqual({ registered: false, reason: 'missing_refresh_token' });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fails closed when a supplied refresh token cannot be escrowed', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 503, text: async () => '' })) as never;
    await expect(registerAppleAccountDeletionToken({
      accessToken: 'supabase-jwt',
      providerRefreshToken: 'apple-refresh-token',
    })).rejects.toThrow('Unable to finish secure Apple sign-in setup');
  });
});

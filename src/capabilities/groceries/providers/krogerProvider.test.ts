import { createKrogerPkceChallenge, krogerCartRecovery } from './krogerProvider';

describe('Kroger provider', () => {
  it('requires PKCE input and never retries ambiguous cart mutations', async () => {
    const challenge = await createKrogerPkceChallenge('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~abc');
    expect(challenge.method).toBe('S256');
    expect(challenge.challenge).not.toContain('=');
    expect(krogerCartRecovery({ acknowledged: false, networkOutcomeKnown: false })).toBe('check_retailer_cart');
  });
});

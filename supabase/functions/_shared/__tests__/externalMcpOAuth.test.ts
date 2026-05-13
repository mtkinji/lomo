import {
  buildAuthorizationServerMetadata,
  buildProtectedResourceMetadata,
  normalizeClientRegistration,
  normalizeOAuthScope,
  sha256Base64Url,
  verifyPkceChallenge,
} from '../externalMcpOAuth';

describe('externalMcpOAuth helpers', () => {
  describe('normalizeClientRegistration', () => {
    test('accepts an HTTPS-only Claude-style registration', () => {
      const result = normalizeClientRegistration({
        client_name: 'Claude Desktop',
        redirect_uris: ['https://claude.ai/api/mcp/auth_callback'],
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.surface).toBe('claude');
        expect(result.tokenEndpointAuthMethod).toBe('client_secret_post');
        expect(result.grantTypes).toEqual(['authorization_code', 'refresh_token']);
      }
    });

    test('accepts the Cursor custom-scheme callback', () => {
      const result = normalizeClientRegistration({
        client_name: 'Cursor',
        redirect_uris: ['cursor://anysphere.cursor-mcp/oauth/callback'],
        token_endpoint_auth_method: 'none',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.surface).toBe('custom');
        expect(result.tokenEndpointAuthMethod).toBe('none');
      }
    });

    test('rejects http or unknown custom-scheme redirect URIs', () => {
      const http = normalizeClientRegistration({
        client_name: 'Bad',
        redirect_uris: ['http://example.com/cb'],
      });
      expect(http.ok).toBe(false);
      if (!http.ok) expect(http.error).toBe('invalid_redirect_uris');

      const custom = normalizeClientRegistration({
        client_name: 'Bad',
        redirect_uris: ['myapp://callback'],
      });
      expect(custom.ok).toBe(false);
      if (!custom.ok) expect(custom.error).toBe('invalid_redirect_uris');
    });

    test('rejects a registration without a client name', () => {
      const result = normalizeClientRegistration({ redirect_uris: ['https://example.com/cb'] });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toBe('invalid_client_metadata');
    });

    test('infers chatgpt surface from name or redirect URI', () => {
      const result = normalizeClientRegistration({
        client_name: 'ChatGPT',
        redirect_uris: ['https://chatgpt.com/api/mcp/callback'],
      });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.surface).toBe('chatgpt');
    });
  });

  describe('normalizeOAuthScope', () => {
    test('defaults to the read scope', () => {
      expect(normalizeOAuthScope(null)).toBe('read');
      expect(normalizeOAuthScope('')).toBe('read');
    });

    test('normalizes supported scopes and makes write imply read', () => {
      expect(normalizeOAuthScope('read write')).toBe('read write');
      expect(normalizeOAuthScope('write')).toBe('read write');
      expect(normalizeOAuthScope('write read write')).toBe('read write');
    });

    test('rejects unknown scopes', () => {
      expect(normalizeOAuthScope('admin')).toBeNull();
      expect(normalizeOAuthScope('read delete')).toBeNull();
    });
  });

  describe('verifyPkceChallenge', () => {
    test('verifies an S256 challenge against its verifier', async () => {
      const verifier = 'this-is-a-long-enough-pkce-verifier-string';
      const challenge = await sha256Base64Url(verifier);
      expect(await verifyPkceChallenge({ verifier, challenge, method: 'S256' })).toBe(true);
      expect(await verifyPkceChallenge({ verifier: 'wrong', challenge, method: 'S256' })).toBe(false);
    });

    test('accepts the plain method for older clients but rejects mismatched values', async () => {
      expect(await verifyPkceChallenge({ verifier: 'abc', challenge: 'abc', method: 'plain' })).toBe(true);
      expect(await verifyPkceChallenge({ verifier: 'abc', challenge: 'xyz', method: 'plain' })).toBe(false);
    });

    test('rejects when either side is missing or the method is unknown', async () => {
      expect(await verifyPkceChallenge({ verifier: null, challenge: 'abc', method: 'S256' })).toBe(false);
      expect(await verifyPkceChallenge({ verifier: 'abc', challenge: null, method: 'S256' })).toBe(false);
      expect(await verifyPkceChallenge({ verifier: 'abc', challenge: 'abc', method: 'unknown' })).toBe(false);
    });
  });

  describe('discovery metadata builders', () => {
    const issuer = 'https://auth.kwilt.app/functions/v1/mcp';

    test('authorization server metadata advertises the expected endpoints and methods', () => {
      const meta = buildAuthorizationServerMetadata(issuer);
      expect(meta.issuer).toBe(issuer);
      expect(meta.authorization_endpoint).toBe(`${issuer}/authorize`);
      expect(meta.token_endpoint).toBe(`${issuer}/token`);
      expect(meta.registration_endpoint).toBe(`${issuer}/register`);
      expect(meta.revocation_endpoint).toBe(`${issuer}/revoke`);
      expect(meta.code_challenge_methods_supported).toEqual(['S256']);
      expect(meta.scopes_supported).toEqual(['read', 'write']);
      expect(meta.token_endpoint_auth_methods_supported).toEqual([
        'client_secret_post',
        'client_secret_basic',
        'none',
      ]);
    });

    test('protected resource metadata points back at the authorization server', () => {
      const meta = buildProtectedResourceMetadata(issuer);
      expect(meta.resource).toBe(issuer);
      expect(meta.authorization_servers).toEqual([issuer]);
      expect(meta.bearer_methods_supported).toEqual(['header']);
      expect(meta.scopes_supported).toEqual(['read', 'write']);
    });
  });
});

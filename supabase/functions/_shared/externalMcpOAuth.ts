type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
const SUPPORTED_OAUTH_SCOPES = ['read', 'write'] as const;
const SUPPORTED_OAUTH_SCOPES_JSON = ['read', 'write'];

export type NormalizedClientRegistration =
  | {
      ok: true;
      clientName: string;
      redirectUris: string[];
      grantTypes: string[];
      responseTypes: string[];
      tokenEndpointAuthMethod: 'client_secret_post' | 'client_secret_basic' | 'none';
      surface: 'claude' | 'chatgpt' | 'custom';
    }
  | { ok: false; error: 'invalid_client_metadata' | 'invalid_redirect_uris' };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map(asString).filter((item): item is string => !!item)));
}

function isCursorMcpCallback(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'cursor:' && url.hostname === 'anysphere.cursor-mcp' && url.pathname === '/oauth/callback';
  } catch {
    return false;
  }
}

function isAllowedRedirectUri(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:' || isCursorMcpCallback(value);
  } catch {
    return false;
  }
}

function inferSurface(clientName: string, redirectUris: string[]): 'claude' | 'chatgpt' | 'custom' {
  const haystack = [clientName, ...redirectUris].join(' ').toLowerCase();
  if (haystack.includes('claude') || haystack.includes('anthropic')) return 'claude';
  if (haystack.includes('chatgpt') || haystack.includes('openai')) return 'chatgpt';
  return 'custom';
}

export function normalizeClientRegistration(raw: unknown): NormalizedClientRegistration {
  const metadata = asRecord(raw);
  const clientName = asString(metadata?.client_name);
  if (!metadata || !clientName) return { ok: false, error: 'invalid_client_metadata' };

  const redirectUris = asStringArray(metadata.redirect_uris);
  if (redirectUris.length === 0 || redirectUris.some((uri) => !isAllowedRedirectUri(uri))) {
    return { ok: false, error: 'invalid_redirect_uris' };
  }

  const grantTypes = asStringArray(metadata.grant_types);
  const responseTypes = asStringArray(metadata.response_types);
  const rawAuthMethod = asString(metadata.token_endpoint_auth_method);
  const tokenEndpointAuthMethod =
    rawAuthMethod === 'client_secret_basic' || rawAuthMethod === 'none'
      ? rawAuthMethod
      : 'client_secret_post';

  return {
    ok: true,
    clientName: clientName.slice(0, 120),
    redirectUris,
    grantTypes: grantTypes.length > 0 ? grantTypes : ['authorization_code', 'refresh_token'],
    responseTypes: responseTypes.length > 0 ? responseTypes : ['code'],
    tokenEndpointAuthMethod,
    surface: inferSurface(clientName, redirectUris),
  };
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function sha256Base64Url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return base64Url(new Uint8Array(digest));
}

export async function verifyPkceChallenge(params: {
  verifier: string | null;
  challenge: string | null;
  method: string | null;
}): Promise<boolean> {
  if (!params.challenge) return false;
  if (!params.verifier) return false;
  if (params.method === 'S256') return (await sha256Base64Url(params.verifier)) === params.challenge;
  if (params.method === 'plain') return params.verifier === params.challenge;
  return false;
}

export function normalizeOAuthScope(raw: unknown): string | null {
  const requested = typeof raw === 'string' ? raw.split(/\s+/).filter(Boolean) : [];
  if (requested.some((scope) => !SUPPORTED_OAUTH_SCOPES.includes(scope as (typeof SUPPORTED_OAUTH_SCOPES)[number]))) {
    return null;
  }

  const scopes = new Set(requested.length > 0 ? requested : ['read']);
  scopes.add('read');
  return SUPPORTED_OAUTH_SCOPES.filter((scope) => scopes.has(scope)).join(' ');
}

export function buildAuthorizationServerMetadata(baseUrl: string): Record<string, JsonValue> {
  const issuer = baseUrl.replace(/\/+$/, '');
  return {
    issuer,
    authorization_endpoint: `${issuer}/authorize`,
    token_endpoint: `${issuer}/token`,
    registration_endpoint: `${issuer}/register`,
    revocation_endpoint: `${issuer}/revoke`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic', 'none'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: SUPPORTED_OAUTH_SCOPES_JSON,
  };
}

export function buildProtectedResourceMetadata(baseUrl: string): Record<string, JsonValue> {
  const resource = baseUrl.replace(/\/+$/, '');
  return {
    resource,
    authorization_servers: [resource],
    scopes_supported: SUPPORTED_OAUTH_SCOPES_JSON,
    bearer_methods_supported: ['header'],
    resource_documentation: 'https://kwilt.app/privacy',
  };
}

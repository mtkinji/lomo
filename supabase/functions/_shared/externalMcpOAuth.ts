type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
export const EXTERNAL_OAUTH_SCOPES = [
  'life.read',
  'life.write',
  'household.read',
  'household.write',
  'money.read',
  'money.write',
  'food.read',
  'food.write',
] as const;
export const LEGACY_SCOPE_COMPATIBILITY_REMOVAL_AT = '2026-11-30T00:00:00.000Z';

type ExternalOAuthScope = (typeof EXTERNAL_OAUTH_SCOPES)[number];

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

export function buildClientRegistrationResponse(params: {
  clientId: string;
  clientSecret: string | null;
  normalized: Extract<NormalizedClientRegistration, { ok: true }>;
  issuedAt: number;
}): Record<string, JsonValue> {
  return {
    client_id: params.clientId,
    ...(params.clientSecret ? { client_secret: params.clientSecret } : {}),
    client_name: params.normalized.clientName,
    redirect_uris: params.normalized.redirectUris,
    grant_types: params.normalized.grantTypes,
    response_types: params.normalized.responseTypes,
    token_endpoint_auth_method: params.normalized.tokenEndpointAuthMethod,
    client_id_issued_at: params.issuedAt,
  };
}

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

function isLoopbackHttpRedirect(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch {
    return false;
  }
}

function isAllowedRedirectUri(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:' || isCursorMcpCallback(value) || isLoopbackHttpRedirect(value);
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

export function normalizeRequestedOAuthScope(raw: unknown): string | null {
  const requested = typeof raw === 'string' ? raw.split(/\s+/).filter(Boolean) : [];
  if (requested.some((scope) => !EXTERNAL_OAUTH_SCOPES.includes(scope as ExternalOAuthScope))) {
    return null;
  }

  const scopes = new Set(requested.length > 0 ? requested : ['life.read']);
  for (const scope of [...scopes]) {
    if (scope.endsWith('.write')) scopes.add(scope.replace(/\.write$/, '.read'));
  }
  return EXTERNAL_OAUTH_SCOPES.filter((scope) => scopes.has(scope)).join(' ');
}

export function normalizeStoredOAuthScope(
  raw: unknown,
  options: {
    policyVersion: unknown;
    legacyScopeExpiresAt?: unknown;
    now?: Date;
  },
): string | null {
  const policyVersion = Number(options.policyVersion);
  if (policyVersion === 2) {
    if (typeof raw !== 'string' || !raw.trim()) return null;
    return normalizeRequestedOAuthScope(raw);
  }
  if (policyVersion !== 1 || typeof raw !== 'string') return null;

  const legacyScopes = Array.from(new Set(raw.split(/\s+/).filter(Boolean)));
  if (legacyScopes.length === 0 || legacyScopes.some((scope) => scope !== 'read' && scope !== 'write')) return null;
  const expiresAt = typeof options.legacyScopeExpiresAt === 'string'
    ? new Date(options.legacyScopeExpiresAt).getTime()
    : NaN;
  const removalAt = new Date(LEGACY_SCOPE_COMPATIBILITY_REMOVAL_AT).getTime();
  if (!Number.isFinite(expiresAt) || expiresAt > removalAt || (options.now ?? new Date()).getTime() >= expiresAt) return null;

  return legacyScopes.includes('write') ? 'life.read life.write' : 'life.read';
}

export function normalizeResourceIndicator(raw: unknown, expectedResource: string): string | null {
  const expected = expectedResource.replace(/\/+$/, '');
  const resource = asString(raw);
  if (!resource) return expected;
  try {
    const url = new URL(resource);
    const normalized = url.toString().replace(/\/+$/, '');
    return normalized === expected ? normalized : null;
  } catch {
    return null;
  }
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
    resource_indicators_supported: true,
    scopes_supported: [...EXTERNAL_OAUTH_SCOPES],
  };
}

export function buildProtectedResourceMetadata(baseUrl: string): Record<string, JsonValue> {
  const resource = baseUrl.replace(/\/+$/, '');
  return {
    resource,
    authorization_server: `${resource}/.well-known/oauth-authorization-server`,
    authorization_servers: [resource],
    scopes_supported: [...EXTERNAL_OAUTH_SCOPES],
    bearer_methods_supported: ['header'],
    resource_documentation: 'https://kwilt.app/privacy',
  };
}

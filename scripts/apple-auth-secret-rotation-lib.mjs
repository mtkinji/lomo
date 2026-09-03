import { createPrivateKey, sign } from 'node:crypto';

export const APPLE_MAX_CLIENT_SECRET_LIFETIME_SECONDS = 15_777_000;
export const DEFAULT_CLIENT_SECRET_LIFETIME_SECONDS = 150 * 24 * 60 * 60;
export const APPLE_AUTH_SECRET_KEY = 'SUPABASE_AUTH_EXTERNAL_APPLE_SECRET';

function requiredText(value, label) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new Error(`${label} is required`);
  return text;
}

function encodeJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export function buildAppleClientSecret({
  privateKeyPem,
  keyId,
  teamId,
  clientId,
  nowMs = Date.now(),
  lifetimeSeconds = DEFAULT_CLIENT_SECRET_LIFETIME_SECONDS,
}) {
  const key = requiredText(privateKeyPem, 'Apple private key');
  const kid = requiredText(keyId, 'Apple key ID');
  const issuer = requiredText(teamId, 'Apple team ID');
  const subject = requiredText(clientId, 'Apple client ID');
  if (!Number.isInteger(lifetimeSeconds) || lifetimeSeconds <= 0) {
    throw new Error('Apple client-secret lifetime must be a positive integer');
  }
  if (lifetimeSeconds > APPLE_MAX_CLIENT_SECRET_LIFETIME_SECONDS) {
    throw new Error('Apple client-secret lifetime exceeds Apple maximum');
  }

  const issuedAtSeconds = Math.floor(nowMs / 1000);
  const expiresAtSeconds = issuedAtSeconds + lifetimeSeconds;
  const headerPart = encodeJson({ alg: 'ES256', kid });
  const payloadPart = encodeJson({
    iss: issuer,
    iat: issuedAtSeconds,
    exp: expiresAtSeconds,
    aud: 'https://appleid.apple.com',
    sub: subject,
  });
  const signingInput = `${headerPart}.${payloadPart}`;
  const signaturePart = sign('sha256', Buffer.from(signingInput), {
    key: createPrivateKey(key),
    dsaEncoding: 'ieee-p1363',
  }).toString('base64url');

  return {
    clientSecret: `${signingInput}.${signaturePart}`,
    issuedAt: new Date(issuedAtSeconds * 1000).toISOString(),
    expiresAt: new Date(expiresAtSeconds * 1000).toISOString(),
  };
}

export async function validateAppleClientSecret({
  clientSecret,
  clientId,
  fetchImpl = fetch,
}) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: `kwilt-rotation-preflight-${Date.now()}`,
    client_id: requiredText(clientId, 'Apple client ID'),
    client_secret: requiredText(clientSecret, 'Apple client secret'),
  });
  const response = await fetchImpl('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  const result = await readJson(response);

  // The authorization code is intentionally invalid. Apple returning invalid_grant
  // proves the client ID and signed client secret passed validation first.
  if (response.status === 400 && result.error === 'invalid_grant') return;
  throw new Error(`Apple client-secret preflight failed (${response.status}, ${result.error ?? 'unknown_error'})`);
}

export async function updateSupabaseAppleSecret({
  accessToken,
  projectRef,
  clientId,
  clientSecret,
  fetchImpl = fetch,
}) {
  const expectedClientId = requiredText(clientId, 'Apple client ID');
  const response = await fetchImpl(
    `https://api.supabase.com/v1/projects/${encodeURIComponent(requiredText(projectRef, 'Supabase project ref'))}/config/auth`,
    {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${requiredText(accessToken, 'Supabase access token')}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        external_apple_secret: requiredText(clientSecret, 'Apple client secret'),
      }),
    },
  );
  const result = await readJson(response);
  if (!response.ok) {
    throw new Error(`Supabase Apple provider update failed (${response.status})`);
  }
  if (result.external_apple_enabled !== true || result.external_apple_client_id !== expectedClientId) {
    throw new Error('Supabase Apple provider verification failed after rotation');
  }
}

export async function updateSupabaseEdgeFunctionSecrets({
  accessToken,
  projectRef,
  clientId,
  clientSecret,
  deletionHashSecret,
  deletionTokenEncryptionSecret,
  fetchImpl = fetch,
}) {
  const url = `https://api.supabase.com/v1/projects/${encodeURIComponent(requiredText(projectRef, 'Supabase project ref'))}/secrets`;
  const authorization = `Bearer ${requiredText(accessToken, 'Supabase access token')}`;
  const currentResponse = await fetchImpl(url, {
    method: 'GET',
    headers: { authorization },
  });
  const current = await readJson(currentResponse);
  if (!currentResponse.ok || !Array.isArray(current)) {
    throw new Error(`Supabase Edge Function secret inventory failed (${currentResponse.status})`);
  }
  const currentNames = new Set(current.map((secret) => secret?.name).filter(Boolean));
  const secrets = [
    { name: 'APPLE_AUTH_CLIENT_ID', value: requiredText(clientId, 'Apple client ID') },
    { name: 'APPLE_AUTH_CLIENT_SECRET', value: requiredText(clientSecret, 'Apple client secret') },
  ];
  if (!currentNames.has('ACCOUNT_DELETION_HASH_SECRET')) {
    secrets.push({
      name: 'ACCOUNT_DELETION_HASH_SECRET',
      value: requiredText(deletionHashSecret, 'Account deletion hash secret'),
    });
  }
  if (!currentNames.has('ACCOUNT_DELETION_TOKEN_ENCRYPTION_SECRET')) {
    secrets.push({
      name: 'ACCOUNT_DELETION_TOKEN_ENCRYPTION_SECRET',
      value: requiredText(deletionTokenEncryptionSecret, 'Account deletion token encryption secret'),
    });
  }
  const response = await fetchImpl(
    url,
    {
      method: 'POST',
      headers: {
        authorization,
        'content-type': 'application/json',
      },
      body: JSON.stringify(secrets),
    },
  );
  if (!response.ok) {
    throw new Error(`Supabase Edge Function secret update failed (${response.status})`);
  }
}

export async function recordAppleSecretRotation({
  monitorUrl,
  monitorSecret,
  expiresAt,
  fetchImpl = fetch,
}) {
  const response = await fetchImpl(requiredText(monitorUrl, 'Secret monitor URL'), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${requiredText(monitorSecret, 'Secret monitor credential')}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      action: 'record_rotation',
      secretKey: APPLE_AUTH_SECRET_KEY,
      expiresAt: requiredText(expiresAt, 'Apple secret expiry'),
    }),
  });
  const result = await readJson(response);
  if (!response.ok || result.ok !== true || result.recorded !== true) {
    throw new Error(`Secret-monitor rotation record failed (${response.status})`);
  }
}

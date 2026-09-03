import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  APPLE_MAX_CLIENT_SECRET_LIFETIME_SECONDS,
  buildAppleClientSecret,
  recordAppleSecretRotation,
  updateSupabaseEdgeFunctionSecrets,
  updateSupabaseAppleSecret,
  validateAppleClientSecret,
} from './apple-auth-secret-rotation-lib.mjs';

const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });

test('buildAppleClientSecret creates a valid ES256 JWT with a bounded expiry', () => {
  const nowMs = Date.parse('2026-07-28T15:13:42.000Z');
  const result = buildAppleClientSecret({
    privateKeyPem,
    keyId: 'KEY1234567',
    teamId: 'TEAM123456',
    clientId: 'com.example.auth',
    nowMs,
    lifetimeSeconds: 150 * 24 * 60 * 60,
  });

  const [headerPart, payloadPart, signaturePart] = result.clientSecret.split('.');
  assert.deepEqual(JSON.parse(Buffer.from(headerPart, 'base64url').toString('utf8')), {
    alg: 'ES256',
    kid: 'KEY1234567',
  });
  assert.deepEqual(JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')), {
    iss: 'TEAM123456',
    iat: Math.floor(nowMs / 1000),
    exp: Math.floor(nowMs / 1000) + 150 * 24 * 60 * 60,
    aud: 'https://appleid.apple.com',
    sub: 'com.example.auth',
  });
  assert.equal(
    verify(
      'sha256',
      Buffer.from(`${headerPart}.${payloadPart}`),
      { key: publicKey, dsaEncoding: 'ieee-p1363' },
      Buffer.from(signaturePart, 'base64url'),
    ),
    true,
  );
  assert.equal(result.expiresAt, '2026-12-25T15:13:42.000Z');
});

test('buildAppleClientSecret refuses an expiry beyond Apple maximum', () => {
  assert.throws(
    () =>
      buildAppleClientSecret({
        privateKeyPem,
        keyId: 'KEY1234567',
        teamId: 'TEAM123456',
        clientId: 'com.example.auth',
        lifetimeSeconds: APPLE_MAX_CLIENT_SECRET_LIFETIME_SECONDS + 1,
      }),
    /exceeds Apple maximum/,
  );
});

test('validateAppleClientSecret accepts invalid_grant as proof of valid client identity', async () => {
  const fetchImpl = async (_url, options) => {
    assert.equal(options.method, 'POST');
    assert.match(String(options.body), /client_id=com\.example\.auth/);
    return new Response(JSON.stringify({ error: 'invalid_grant' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  };

  await validateAppleClientSecret({
    clientSecret: 'header.payload.signature',
    clientId: 'com.example.auth',
    fetchImpl,
  });
});

test('updateSupabaseAppleSecret changes only the Apple secret and verifies provider identity', async () => {
  let requestBody;
  const fetchImpl = async (url, options) => {
    assert.equal(url, 'https://api.supabase.com/v1/projects/project-ref/config/auth');
    assert.equal(options.method, 'PATCH');
    assert.equal(options.headers.authorization, 'Bearer management-token');
    requestBody = JSON.parse(options.body);
    return new Response(
      JSON.stringify({
        external_apple_enabled: true,
        external_apple_client_id: 'com.example.auth',
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };

  await updateSupabaseAppleSecret({
    accessToken: 'management-token',
    projectRef: 'project-ref',
    clientId: 'com.example.auth',
    clientSecret: 'header.payload.signature',
    fetchImpl,
  });

  assert.deepEqual(requestBody, { external_apple_secret: 'header.payload.signature' });
});

test('updateSupabaseEdgeFunctionSecrets keeps Apple deletion revocation synchronized', async () => {
  let requestBody;
  let requestCount = 0;
  const fetchImpl = async (url, options) => {
    assert.equal(url, 'https://api.supabase.com/v1/projects/project-ref/secrets');
    assert.equal(options.headers.authorization, 'Bearer management-token');
    requestCount += 1;
    if (options.method === 'GET') {
      return new Response(JSON.stringify([{ name: 'CALENDAR_TOKEN_SECRET' }]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    assert.equal(options.method, 'POST');
    requestBody = JSON.parse(options.body);
    return new Response('{}', { status: 201, headers: { 'content-type': 'application/json' } });
  };

  await updateSupabaseEdgeFunctionSecrets({
    accessToken: 'management-token',
    projectRef: 'project-ref',
    clientId: 'com.example.auth',
    clientSecret: 'header.payload.signature',
    deletionHashSecret: 'hash-secret',
    deletionTokenEncryptionSecret: 'token-secret',
    fetchImpl,
  });

  assert.equal(requestCount, 2);
  assert.deepEqual(requestBody, [
    { name: 'APPLE_AUTH_CLIENT_ID', value: 'com.example.auth' },
    { name: 'APPLE_AUTH_CLIENT_SECRET', value: 'header.payload.signature' },
    { name: 'ACCOUNT_DELETION_HASH_SECRET', value: 'hash-secret' },
    { name: 'ACCOUNT_DELETION_TOKEN_ENCRYPTION_SECRET', value: 'token-secret' },
  ]);
});

test('updateSupabaseEdgeFunctionSecrets never rotates existing deletion encryption material', async () => {
  let requestBody;
  const fetchImpl = async (_url, options) => {
    if (options.method === 'GET') {
      return new Response(JSON.stringify([
        { name: 'ACCOUNT_DELETION_HASH_SECRET' },
        { name: 'ACCOUNT_DELETION_TOKEN_ENCRYPTION_SECRET' },
      ]), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    requestBody = JSON.parse(options.body);
    return new Response('{}', { status: 201, headers: { 'content-type': 'application/json' } });
  };

  await updateSupabaseEdgeFunctionSecrets({
    accessToken: 'management-token',
    projectRef: 'project-ref',
    clientId: 'com.example.auth',
    clientSecret: 'header.payload.signature',
    deletionHashSecret: 'must-not-replace-hash-secret',
    deletionTokenEncryptionSecret: 'must-not-replace-token-secret',
    fetchImpl,
  });

  assert.deepEqual(requestBody, [
    { name: 'APPLE_AUTH_CLIENT_ID', value: 'com.example.auth' },
    { name: 'APPLE_AUTH_CLIENT_SECRET', value: 'header.payload.signature' },
  ]);
});

test('rotation orchestration supplies one-time deletion secret material to the Edge Function secret sync', async () => {
  const source = await readFile(new URL('./rotate-apple-auth-secret.mjs', import.meta.url), 'utf8');
  assert.match(
    source,
    /updateSupabaseEdgeFunctionSecrets\(\{[\s\S]*?deletionHashSecret:\s*randomBytes\(32\)\.toString\('hex'\)[\s\S]*?deletionTokenEncryptionSecret:\s*randomBytes\(32\)\.toString\('hex'\)[\s\S]*?\}\)/,
  );
  const authUpdateCall = source.match(/updateSupabaseAppleSecret\(\{([\s\S]*?)\}\);/)?.[1] ?? '';
  assert.doesNotMatch(authUpdateCall, /deletionHashSecret/);
});

test('recordAppleSecretRotation authenticates the narrow monitor callback', async () => {
  let requestBody;
  const fetchImpl = async (url, options) => {
    assert.equal(url, 'https://auth.kwilt.app/functions/v1/secrets-expiry-monitor');
    assert.equal(options.headers.authorization, 'Bearer cron-secret');
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({ ok: true, recorded: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  await recordAppleSecretRotation({
    monitorUrl: 'https://auth.kwilt.app/functions/v1/secrets-expiry-monitor',
    monitorSecret: 'cron-secret',
    expiresAt: '2026-12-25T15:13:42.000Z',
    fetchImpl,
  });

  assert.deepEqual(requestBody, {
    action: 'record_rotation',
    secretKey: 'SUPABASE_AUTH_EXTERNAL_APPLE_SECRET',
    expiresAt: '2026-12-25T15:13:42.000Z',
  });
});

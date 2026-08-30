#!/usr/bin/env node

import crypto from 'node:crypto';

const HELP = `
Kwilt external MCP smoke test

Required:
  MCP_BASE_URL
    Example: https://auth.kwilt.app/functions/v1/mcp

Modes:
  1. Full OAuth smoke:
     SUPABASE_USER_JWT=<signed-in Kwilt user JWT> npm run mcp:smoke

     Exercises:
       metadata -> dynamic client registration -> authorize/approve -> token -> tools/list -> list_arcs
       Add MCP_SMOKE_WRITE=1 to prove safe completion, idempotent replay, reviewed-write staging, then revoke.

  2. MCP bearer-token smoke:
     MCP_ACCESS_TOKEN=<issued MCP access token> npm run mcp:smoke

     Exercises:
       metadata -> tools/list -> list_arcs

Optional:
  MCP_SMOKE_REDIRECT_URI
    Default: https://example.com/kwilt-mcp-smoke/callback
  MCP_SMOKE_WRITE=1
    Creates one clearly labeled smoke To-do, replays that exact request without duplicating it,
    stages (but does not apply) a Goal proposal for review, then revokes the test token.
`;

const EXPECTED_CAPABILITY_SCOPES = [
  'life.read',
  'life.write',
  'household.read',
  'household.write',
  'money.read',
  'money.write',
  'food.read',
  'food.write',
];

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing ${name}. Run with --help for usage.`);
  return value;
}

function optionalEnv(name, fallback = '') {
  return process.env[name]?.trim() || fallback;
}

function normalizeBaseUrl(raw) {
  return raw.replace(/\/+$/, '');
}

function base64Url(buffer) {
  return Buffer.from(buffer).toString('base64url');
}

function makePkcePair() {
  const verifier = base64Url(crypto.randomBytes(32));
  const challenge = base64Url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

async function requestJson(url, init = {}) {
  const response = await fetch(url, init);
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`${init.method ?? 'GET'} ${url} returned non-JSON (${response.status}): ${text.slice(0, 200)}`);
    }
  }
  if (!response.ok) {
    throw new Error(`${init.method ?? 'GET'} ${url} failed (${response.status}): ${JSON.stringify(payload)}`);
  }
  return payload;
}

async function mcpCall(baseUrl, token, method, params = undefined, id = method) {
  const payload = {
    jsonrpc: '2.0',
    id,
    method,
    ...(params === undefined ? {} : { params }),
  };
  const response = await requestJson(baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (response?.error) throw new Error(`MCP ${method} failed: ${JSON.stringify(response.error)}`);
  return response.result;
}

async function mcpNotify(baseUrl, token, method, params = undefined) {
  const payload = {
    jsonrpc: '2.0',
    method,
    ...(params === undefined ? {} : { params }),
  };
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`MCP notification ${method} failed (${response.status}): ${text.slice(0, 200)}`);
  }
  if (text.trim()) {
    throw new Error(`MCP notification ${method} returned a body (${response.status}): ${text.slice(0, 200)}`);
  }
}

async function registerClient(baseUrl, redirectUri) {
  return requestJson(`${baseUrl}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'Kwilt MCP smoke test',
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'client_secret_post',
    }),
  });
}

async function approveAndExchange(baseUrl, client, redirectUri, userJwt, scope) {
  const { verifier, challenge } = makePkcePair();
  const state = `smoke_${base64Url(crypto.randomBytes(12))}`;

  const approval = await requestJson(`${baseUrl}/authorize/approve`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userJwt}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: client.client_id,
      redirect_uri: redirectUri,
      response_type: 'code',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
      scope,
      resource: baseUrl,
    }),
  });

  const redirectTo = approval?.redirect_to;
  if (!redirectTo) throw new Error(`Approval response missing redirect_to: ${JSON.stringify(approval)}`);
  const callback = new URL(redirectTo);
  const code = callback.searchParams.get('code');
  const returnedState = callback.searchParams.get('state');
  if (!code) throw new Error(`Approval redirect missing code: ${redirectTo}`);
  if (returnedState !== state) throw new Error(`State mismatch: expected ${state}, got ${returnedState}`);

  return requestJson(`${baseUrl}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: client.client_id,
      client_secret: client.client_secret,
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
      resource: baseUrl,
    }),
  });
}

async function revokeToken(baseUrl, token) {
  await requestJson(`${baseUrl}/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token }),
  });
}

async function expectRevoked(baseUrl, token) {
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'post_revoke', method: 'initialize' }),
  });
  if (response.status !== 401) {
    throw new Error(`Expected post-revoke 401, got ${response.status}: ${await response.text()}`);
  }
}

async function runWriteSmoke(baseUrl, token) {
  const suffix = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const idempotencyPrefix = `mcp-smoke-${suffix}`;

  const captureArgs = {
    idempotency_key: `${idempotencyPrefix}:capture_activity`,
    title: `MCP smoke To-do ${suffix} — safe to delete`,
    notes: 'Controlled external action-contract validation.',
    tags: ['smoke-test'],
  };
  const capture = await mcpCall(baseUrl, token, 'tools/call', {
    name: 'capture_activity',
    arguments: captureArgs,
  }, 'capture_activity');
  const captureResult = capture.structuredContent ?? capture.structured_content ?? capture;
  const firstResult = captureResult.result_references?.[0]?.id;
  if (captureResult.status !== 'completed' || !captureResult.receipt_id || !firstResult) {
    throw new Error(`capture_activity did not complete safely: ${JSON.stringify(captureResult)}`);
  }
  console.log('capture_activity completed with a receipt');

  const replay = await mcpCall(baseUrl, token, 'tools/call', {
    name: 'capture_activity',
    arguments: captureArgs,
  }, 'capture_activity_replay');
  const replayResult = replay.structuredContent ?? replay.structured_content ?? replay;
  const replayReference = replayResult.result_references?.[0]?.id;
  const same_result = replayReference === firstResult;
  if (replayResult.status !== 'completed' || replayResult.idempotent_replay !== true || !same_result) {
    throw new Error(`capture_activity replay was not idempotent: ${JSON.stringify(replayResult)}`);
  }
  console.log('capture_activity replay returned the same result without a duplicate');

  const proposal = await mcpCall(baseUrl, token, 'tools/call', {
    name: 'create_goal',
    arguments: {
      idempotency_key: `${idempotencyPrefix}:create_goal_proposal`,
      title: `MCP smoke Goal ${suffix} — do not approve`,
      description: 'Controlled proposal proving consequential external writes await Kwilt review.',
      status: 'planned',
    },
  }, 'create_goal_proposal');
  const proposalResult = proposal.structuredContent ?? proposal.structured_content ?? proposal;
  if (proposalResult.status !== 'proposed' || proposalResult.confirmation?.state !== 'pending') {
    throw new Error(`create_goal did not stop for review: ${JSON.stringify(proposalResult)}`);
  }
  if (proposalResult.receipt_id) {
    throw new Error(`create_goal proposal unexpectedly included a completion receipt: ${JSON.stringify(proposalResult)}`);
  }
  console.log('create_goal staged a pending review without applying the Goal');
}

async function run() {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(HELP.trim());
    return;
  }

  const baseUrl = normalizeBaseUrl(requiredEnv('MCP_BASE_URL'));
  const redirectUri = optionalEnv('MCP_SMOKE_REDIRECT_URI', 'https://example.com/kwilt-mcp-smoke/callback');
  const userJwt = optionalEnv('SUPABASE_USER_JWT');
  let accessToken = optionalEnv('MCP_ACCESS_TOKEN');
  const writeSmoke = optionalEnv('MCP_SMOKE_WRITE') === '1';

  console.log(`MCP smoke base: ${baseUrl}`);
  const metadata = await requestJson(`${baseUrl}/.well-known/oauth-authorization-server`);
  console.log(`metadata ok: issuer=${metadata.issuer}`);
  if (metadata.resource_indicators_supported !== true) {
    throw new Error('metadata did not advertise resource_indicators_supported=true');
  }
  const missingScopes = EXPECTED_CAPABILITY_SCOPES.filter((scope) => !metadata.scopes_supported?.includes(scope));
  if (missingScopes.length > 0) {
    throw new Error(`metadata scopes_supported missing ${missingScopes.join(', ')}: ${JSON.stringify(metadata.scopes_supported)}`);
  }

  const protectedResource = await requestJson(`${baseUrl}/.well-known/oauth-protected-resource`);
  if (protectedResource.resource !== baseUrl) {
    throw new Error(`protected resource mismatch: expected ${baseUrl}, got ${protectedResource.resource}`);
  }
  console.log(`protected resource ok: resource=${protectedResource.resource}`);

  if (!accessToken) {
    if (!userJwt) {
      throw new Error('Set MCP_ACCESS_TOKEN for tool smoke, or SUPABASE_USER_JWT for full OAuth smoke.');
    }
    const client = await registerClient(baseUrl, redirectUri);
    console.log(`registered client: ${client.client_id}`);
    const tokenResponse = await approveAndExchange(
      baseUrl,
      client,
      redirectUri,
      userJwt,
      writeSmoke ? 'life.read life.write' : 'life.read',
    );
    accessToken = tokenResponse.access_token;
    if (!accessToken) throw new Error(`Token response missing access_token: ${JSON.stringify(tokenResponse)}`);
    console.log(`token ok: expires_in=${tokenResponse.expires_in} scope=${tokenResponse.scope ?? 'unknown'}`);
  }

  const init = await mcpCall(baseUrl, accessToken, 'initialize');
  console.log(`initialize ok: ${init.serverInfo?.name ?? 'unknown server'}`);
  await mcpNotify(baseUrl, accessToken, 'notifications/initialized');
  console.log('notifications/initialized ok');

  const tools = await mcpCall(baseUrl, accessToken, 'tools/list');
  const toolNames = tools.tools?.map((tool) => tool.name) ?? [];
  console.log(`tools/list ok: ${toolNames.join(', ')}`);
  if (!toolNames.includes('kwilt_profile_read')) throw new Error('tools/list did not include kwilt_profile_read');
  if (!toolNames.includes('kwilt_arcs_list')) throw new Error('tools/list did not include kwilt_arcs_list');

  const currentAccount = await mcpCall(
    baseUrl,
    accessToken,
    'tools/call',
    { name: 'get_current_account', arguments: {} },
    'get_current_account',
  );
  console.log(`get_current_account ok: ${JSON.stringify(currentAccount.structuredContent ?? currentAccount).slice(0, 500)}`);

  const listArcs = await mcpCall(
    baseUrl,
    accessToken,
    'tools/call',
    { name: 'list_arcs', arguments: { limit: 5 } },
    'list_arcs',
  );
  console.log(`list_arcs ok: ${JSON.stringify(listArcs.structuredContent ?? listArcs).slice(0, 500)}`);

  if (writeSmoke) {
    if (!toolNames.includes('kwilt_arcs_create')) throw new Error('tools/list did not include write tools for life.read life.write scope');
    await runWriteSmoke(baseUrl, accessToken);
    await revokeToken(baseUrl, accessToken);
    await expectRevoked(baseUrl, accessToken);
    console.log('revoke ok: post-revoke call returned 401');
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

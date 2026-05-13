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

  2. MCP bearer-token smoke:
     MCP_ACCESS_TOKEN=<issued MCP access token> npm run mcp:smoke

     Exercises:
       metadata -> tools/list -> list_arcs

Optional:
  MCP_SMOKE_REDIRECT_URI
    Default: https://example.com/kwilt-mcp-smoke/callback
`;

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

async function approveAndExchange(baseUrl, client, redirectUri, userJwt) {
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
      scope: 'read',
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
    }),
  });
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

  console.log(`MCP smoke base: ${baseUrl}`);
  const metadata = await requestJson(`${baseUrl}/.well-known/oauth-authorization-server`);
  console.log(`metadata ok: issuer=${metadata.issuer}`);

  if (!accessToken) {
    if (!userJwt) {
      throw new Error('Set MCP_ACCESS_TOKEN for tool smoke, or SUPABASE_USER_JWT for full OAuth smoke.');
    }
    const client = await registerClient(baseUrl, redirectUri);
    console.log(`registered client: ${client.client_id}`);
    const tokenResponse = await approveAndExchange(baseUrl, client, redirectUri, userJwt);
    accessToken = tokenResponse.access_token;
    if (!accessToken) throw new Error(`Token response missing access_token: ${JSON.stringify(tokenResponse)}`);
    console.log(`token ok: expires_in=${tokenResponse.expires_in}`);
  }

  const init = await mcpCall(baseUrl, accessToken, 'initialize');
  console.log(`initialize ok: ${init.serverInfo?.name ?? 'unknown server'}`);

  const tools = await mcpCall(baseUrl, accessToken, 'tools/list');
  const toolNames = tools.tools?.map((tool) => tool.name) ?? [];
  console.log(`tools/list ok: ${toolNames.join(', ')}`);
  if (!toolNames.includes('list_arcs')) throw new Error('tools/list did not include list_arcs');

  const listArcs = await mcpCall(
    baseUrl,
    accessToken,
    'tools/call',
    { name: 'list_arcs', arguments: { limit: 5 } },
    'list_arcs',
  );
  console.log(`list_arcs ok: ${JSON.stringify(listArcs.structuredContent ?? listArcs).slice(0, 500)}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

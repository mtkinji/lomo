import { readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROVIDER_CASES = [
  'instacart-list-link',
  'instacart-nearby-retailers',
  'kroger-locations',
  'kroger-products',
  'kroger-cart-add',
];

const STATUSES = new Set(['proceed', 'plain_handoff_only', 'blocked_by_access', 'failed']);

export function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value?.startsWith('--')) continue;
    const key = value.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) result[key] = true;
    else { result[key] = next; index += 1; }
  }
  return result;
}

function finiteCount(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function latencyBucket(value) {
  const milliseconds = Number(value);
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return 'unknown';
  if (milliseconds < 500) return 'under_500ms';
  if (milliseconds < 2000) return '500ms_to_2s';
  return 'over_2s';
}

function safeErrorClass(value) {
  const text = typeof value === 'string' ? value : 'none';
  return /^[a-z0-9_]{1,80}$/.test(text) ? text : 'redacted_error';
}

export function redactProviderObservation(provider, raw) {
  return {
    provider,
    operation: provider,
    status: STATUSES.has(raw?.status) ? raw.status : 'failed',
    counts: {
      returned: finiteCount(raw?.counts?.returned),
      accepted: finiteCount(raw?.counts?.accepted),
    },
    latencyBucket: latencyBucket(raw?.latencyMs),
    capabilityFlags: {
      authenticated: Boolean(raw?.capabilityFlags?.authenticated),
      productEvidence: Boolean(raw?.capabilityFlags?.productEvidence),
      cartMutation: Boolean(raw?.capabilityFlags?.cartMutation),
      checkout: false,
      couponActivation: false,
    },
    errorClass: safeErrorClass(raw?.errorClass),
  };
}

async function fixtureObservations(fixtureDir) {
  return Promise.all(PROVIDER_CASES.map(async (provider) => {
    const raw = JSON.parse(await readFile(resolve(fixtureDir, `${provider}.json`), 'utf8'));
    return redactProviderObservation(provider, raw);
  }));
}

function requireEnv(names) {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`blocked_by_access:${missing.join(',')}`);
}

async function requestJson(url, init) {
  const startedAt = Date.now();
  const response = await fetch(url, init);
  let body = {};
  try { body = await response.json(); } catch { body = {}; }
  return { response, body, latencyMs: Date.now() - startedAt };
}

async function krogerClientToken() {
  requireEnv(['KROGER_CLIENT_ID', 'KROGER_CLIENT_SECRET']);
  const credentials = Buffer.from(`${process.env.KROGER_CLIENT_ID}:${process.env.KROGER_CLIENT_SECRET}`).toString('base64');
  const result = await requestJson('https://api.kroger.com/v1/connect/oauth2/token', {
    method: 'POST',
    headers: { authorization: `Basic ${credentials}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials&scope=product.compact',
  });
  if (!result.response.ok || typeof result.body?.access_token !== 'string') throw new Error('provider_auth_failed');
  return result.body.access_token;
}

async function liveObservation(provider) {
  try {
    if (provider.startsWith('instacart-')) {
      requireEnv(['INSTACART_DEVELOPER_PLATFORM_API_KEY']);
      const endpoint = provider === 'instacart-nearby-retailers'
        ? 'https://connect.dev.instacart.tools/idp/v1/retailers?postal_code=84101&country_code=US'
        : 'https://connect.dev.instacart.tools/idp/v1/products/products_link';
      const result = await requestJson(endpoint, {
        method: provider === 'instacart-list-link' ? 'POST' : 'GET',
        headers: { authorization: `Bearer ${process.env.INSTACART_DEVELOPER_PLATFORM_API_KEY}`, 'content-type': 'application/json' },
        ...(provider === 'instacart-list-link' ? { body: JSON.stringify({ title: 'Kwilt feasibility list', line_items: [{ name: 'test item', quantity: 1, unit: 'each' }] }) } : {}),
      });
      return redactProviderObservation(provider, {
        status: result.response.ok ? 'proceed' : result.response.status === 401 || result.response.status === 403 ? 'blocked_by_access' : 'failed',
        counts: { returned: Array.isArray(result.body?.retailers) ? result.body.retailers.length : result.response.ok ? 1 : 0, accepted: result.response.ok ? 1 : 0 },
        latencyMs: result.latencyMs, capabilityFlags: { authenticated: result.response.ok },
        errorClass: result.response.ok ? 'none' : `http_${result.response.status}`,
      });
    }
    if (provider === 'kroger-cart-add') {
      requireEnv(['KROGER_CUSTOMER_ACCESS_TOKEN', 'KROGER_TEST_UPC']);
      const result = await requestJson('https://api.kroger.com/v1/cart/add', {
        method: 'PUT', headers: { authorization: `Bearer ${process.env.KROGER_CUSTOMER_ACCESS_TOKEN}`, 'content-type': 'application/json' },
        body: JSON.stringify({ items: [{ upc: process.env.KROGER_TEST_UPC, quantity: 1 }] }),
      });
      return redactProviderObservation(provider, {
        status: result.response.ok ? 'proceed' : result.response.status === 401 || result.response.status === 403 ? 'blocked_by_access' : 'failed',
        counts: { returned: 0, accepted: result.response.ok ? 1 : 0 }, latencyMs: result.latencyMs,
        capabilityFlags: { authenticated: result.response.ok, cartMutation: result.response.ok },
        errorClass: result.response.ok ? 'none' : `http_${result.response.status}`,
      });
    }
    const token = await krogerClientToken();
    const endpoint = provider === 'kroger-locations'
      ? 'https://api.kroger.com/v1/locations?filter.zipCode.near=84101&filter.limit=3'
      : 'https://api.kroger.com/v1/products?filter.term=milk&filter.locationId=00000000&filter.limit=3';
    const result = await requestJson(endpoint, { headers: { authorization: `Bearer ${token}`, accept: 'application/json' } });
    return redactProviderObservation(provider, {
      status: result.response.ok ? 'proceed' : result.response.status === 401 || result.response.status === 403 ? 'blocked_by_access' : 'failed',
      counts: { returned: Array.isArray(result.body?.data) ? result.body.data.length : 0, accepted: 0 }, latencyMs: result.latencyMs,
      capabilityFlags: { authenticated: result.response.ok, productEvidence: provider === 'kroger-products' && result.response.ok },
      errorClass: result.response.ok ? 'none' : `http_${result.response.status}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'provider_error';
    return redactProviderObservation(provider, {
      status: message.startsWith('blocked_by_access:') ? 'blocked_by_access' : 'failed',
      errorClass: message.startsWith('blocked_by_access:') ? 'missing_credentials' : message,
    });
  }
}

function assertLiveOutputPath(output) {
  const root = resolve('docs/delivery-evidence/food/feasibility');
  const target = resolve(output);
  const pathFromRoot = relative(root, target);
  if (pathFromRoot.startsWith('..') || isAbsolute(pathFromRoot)) {
    throw new Error('Live feasibility output must be under docs/delivery-evidence/food/feasibility/.');
  }
}

export async function runProviderFeasibility(args) {
  if (!args.output || typeof args.output !== 'string') throw new Error('--output is required');
  let observations;
  if (args['fixture-dir']) {
    observations = await fixtureObservations(args['fixture-dir']);
  } else {
    assertLiveOutputPath(args.output);
    requireEnv([
      'INSTACART_DEVELOPER_PLATFORM_API_KEY', 'KROGER_CLIENT_ID', 'KROGER_CLIENT_SECRET',
      'KROGER_CUSTOMER_ACCESS_TOKEN', 'KROGER_TEST_UPC',
    ]);
    observations = await Promise.all(PROVIDER_CASES.map(liveObservation));
  }
  const report = { schemaVersion: 1, mode: args['fixture-dir'] ? 'fixture' : 'live', observations };
  await writeFile(resolve(args.output), `${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runProviderFeasibility(parseArgs(process.argv.slice(2))).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'Food feasibility failed'}\n`);
    process.exitCode = 1;
  });
}

#!/usr/bin/env node
/**
 * Create a Kwilt Pro code via the Supabase Edge Function.
 *
 * Required env:
 * - AI_PROXY_BASE_URL (ends with `/ai-chat`)
 * - KWILT_PRO_CODE_ADMIN_SECRET (matches the function env var)
 *
 * Optional env:
 * - SUPABASE_PUBLISHABLE_KEY (or SUPABASE_ANON_KEY) to satisfy the Edge gateway
 *
 * Usage:
 *   AI_PROXY_BASE_URL=... KWILT_PRO_CODE_ADMIN_SECRET=... node scripts/create-pro-code.mjs
 *   node scripts/create-pro-code.mjs --maxUses 3 --expiresAt 2026-02-01T00:00:00Z --note "affiliate batch"
 */

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--maxUses') out.maxUses = Number(argv[i + 1]);
    if (a === '--expiresAt') out.expiresAt = String(argv[i + 1]);
    if (a === '--note') out.note = String(argv[i + 1]);
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

const aiBase = (process.env.AI_PROXY_BASE_URL ?? '').trim().replace(/\/+$/, '');
if (!aiBase || !aiBase.endsWith('/ai-chat')) {
  console.error('Missing/invalid AI_PROXY_BASE_URL (expected to end with `/ai-chat`).');
  process.exit(1);
}

const secret = (process.env.KWILT_PRO_CODE_ADMIN_SECRET ?? '').trim();
if (!secret) {
  console.error('Missing KWILT_PRO_CODE_ADMIN_SECRET.');
  process.exit(1);
}

const base = `${aiBase.slice(0, -'/ai-chat'.length)}/pro-codes`;
const url = `${base}/create`;

const headers = {
  'Content-Type': 'application/json',
  'x-kwilt-admin-secret': secret,
  'x-kwilt-client': 'kwilt-admin-script',
};

const apikey =
  (process.env.SUPABASE_PUBLISHABLE_KEY ?? '').trim() ||
  (process.env.SUPABASE_ANON_KEY ?? '').trim() ||
  (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
if (apikey) headers.apikey = apikey;

const body = {
  ...(Number.isFinite(args.maxUses) ? { maxUses: Math.max(1, Math.floor(args.maxUses)) } : {}),
  ...(typeof args.expiresAt === 'string' && args.expiresAt.trim() ? { expiresAt: args.expiresAt.trim() } : {}),
  ...(typeof args.note === 'string' && args.note.trim() ? { note: args.note.trim() } : {}),
};

const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
const data = await res.json().catch(() => null);
if (!res.ok) {
  if (res.status === 404) {
    console.error(
      'Failed to create code: HTTP 404 (pro-codes function not found). Did you deploy it?\n' +
        'Try:\n' +
        '  npx supabase db push\n' +
        '  npx supabase functions deploy pro-codes --project-ref <your-project-ref>\n',
    );
    process.exit(1);
  }
  const msg = data?.error?.message ? String(data.error.message) : `HTTP ${res.status}`;
  console.error(`Failed to create code: ${msg}`);
  process.exit(1);
}

console.log(data?.code ? String(data.code) : '(no code returned)');





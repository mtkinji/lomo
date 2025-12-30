// Kwilt Pro codes (install-based, pre-account)
//
// Routes:
// - POST /redeem  -> { ok, alreadyRedeemed }
// - POST /status  -> { isPro, expiresAt? }
// - POST /create  -> { code } (admin-only via header secret)
//
// Called via:
//   https://<project-ref>.functions.supabase.co/functions/v1/pro-codes/<route>

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-kwilt-install-id, x-kwilt-client, x-kwilt-admin-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: JsonValue, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    },
  });
}

function getSupabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizeCode(input: string): string {
  // Accept codes with spaces/dashes; normalize to lowercase alphanumerics + dashes removed.
  return input.trim().replace(/\s+/g, '').replace(/-/g, '').toLowerCase();
}

function randomProCode(): string {
  // Human-friendly-ish: 20 chars, grouped 5-5-5-5.
  // Not stored plaintext; server hashes it via SQL fn on insert (or we hash client-side on redeem).
  const raw = crypto.randomUUID().replace(/-/g, '');
  const token = raw.slice(0, 20).toUpperCase();
  return `${token.slice(0, 5)}-${token.slice(5, 10)}-${token.slice(10, 15)}-${token.slice(15, 20)}`;
}

async function isProForQuotaKey(admin: any, quotaKey: string): Promise<{ isPro: boolean; expiresAt: string | null }> {
  const { data, error } = await admin
    .from('kwilt_pro_entitlements')
    .select('is_pro, expires_at')
    .eq('quota_key', quotaKey)
    .maybeSingle();
  if (error || !data) return { isPro: false, expiresAt: null };
  const isPro = Boolean((data as any).is_pro);
  const expiresAt = typeof (data as any).expires_at === 'string' ? ((data as any).expires_at as string) : null;
  if (!isPro) return { isPro: false, expiresAt };
  if (expiresAt && Number.isFinite(Date.parse(expiresAt)) && Date.parse(expiresAt) < Date.now()) {
    return { isPro: false, expiresAt };
  }
  return { isPro: true, expiresAt };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json(405, { error: { message: 'Method not allowed', code: 'method_not_allowed' } });
  }

  const url = new URL(req.url);
  const fullPath = url.pathname;
  const marker = '/pro-codes';
  const idx = fullPath.indexOf(marker);
  const route = idx >= 0 ? fullPath.slice(idx + marker.length) : fullPath;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return json(503, { error: { message: 'Pro codes service unavailable', code: 'provider_unavailable' } });
  }

  const installId = (req.headers.get('x-kwilt-install-id') ?? '').trim();
  const quotaKey = installId ? `install:${installId}` : '';

  if (route === '/status') {
    if (!installId) {
      return json(400, { error: { message: 'Missing x-kwilt-install-id', code: 'bad_request' } });
    }
    const status = await isProForQuotaKey(admin, quotaKey);
    return json(200, { isPro: status.isPro, expiresAt: status.expiresAt });
  }

  if (route === '/redeem') {
    if (!installId) {
      return json(400, { error: { message: 'Missing x-kwilt-install-id', code: 'bad_request' } });
    }
    const body = await req.json().catch(() => null);
    const raw = typeof body?.code === 'string' ? body.code : '';
    const code = normalizeCode(raw);
    if (!code) {
      return json(400, { error: { message: 'Missing code', code: 'bad_request' } });
    }

    const { data, error } = await admin.rpc('kwilt_redeem_pro_code', {
      p_code: code,
      p_quota_key: quotaKey,
    });

    if (error) {
      return json(503, { error: { message: 'Unable to redeem code', code: 'provider_unavailable' } });
    }

    // Supabase RPC returns rows for table returns; accept either array or object.
    const row = Array.isArray(data) ? data[0] : data;
    const ok = Boolean(row?.ok);
    const alreadyRedeemed = Boolean(row?.already_redeemed);
    const message = typeof row?.message === 'string' ? row.message : null;
    if (!ok) {
      return json(400, { error: { message: message ?? 'Invalid code', code: 'bad_request' } });
    }

    return json(200, { ok: true, alreadyRedeemed });
  }

  if (route === '/create') {
    // Admin-only: require a shared secret header (NOT the service role key).
    const required = (Deno.env.get('KWILT_PRO_CODE_ADMIN_SECRET') ?? '').trim();
    const provided = (req.headers.get('x-kwilt-admin-secret') ?? '').trim();
    if (!required || provided !== required) {
      return json(401, { error: { message: 'Unauthorized', code: 'unauthorized' } });
    }

    const body = await req.json().catch(() => ({}));
    const maxUsesRaw = typeof body?.maxUses === 'number' ? body.maxUses : 1;
    const maxUses = Number.isFinite(maxUsesRaw) ? Math.max(1, Math.floor(maxUsesRaw)) : 1;
    const expiresAt = typeof body?.expiresAt === 'string' ? body.expiresAt : null;
    const note = typeof body?.note === 'string' ? body.note : null;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const code = randomProCode();
      const normalized = normalizeCode(code);
      const { data: hashData, error: hashErr } = await admin.rpc('kwilt_hash_pro_code', { p_code: normalized });
      const codeHash = typeof hashData === 'string' ? hashData : null;
      if (hashErr || !codeHash) {
        return json(503, { error: { message: 'Unable to create code', code: 'provider_unavailable' } });
      }

      const { error } = await admin.from('kwilt_pro_codes').insert({
        code_hash: codeHash,
        max_uses: maxUses,
        expires_at: expiresAt,
        note,
      });
      if (!error) {
        return json(200, { code });
      }
    }

    return json(500, { error: { message: 'Unable to create code', code: 'server_error' } });
  }

  return json(404, { error: { message: 'Not found', code: 'not_found' } });
});





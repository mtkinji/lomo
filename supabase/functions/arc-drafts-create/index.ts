// Anonymous ArcDraft creation (marketing site "Try Arc" survey)
//
// Route:
// - POST /arc-drafts-create -> { draftId, token, expiresAt }
//
// Notes:
// - Does NOT require auth (verify_jwt=false)
// - Uses service role to write the draft row
// - Token is a one-time secret used later to claim the draft in-app

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-kwilt-install-id, x-kwilt-client',
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

function firstIpFromForwardedFor(raw: string): string {
  const first = raw.split(',')[0]?.trim() ?? '';
  return first;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function validatePayload(payload: unknown): { ok: true; payload: Record<string, unknown> } | { ok: false } {
  if (!isPlainObject(payload)) return { ok: false };
  // Minimal schema gates (keep permissive; deeper validation lives in clients).
  if (payload.version !== 1) return { ok: false };
  const dream = typeof payload.dream === 'string' ? payload.dream.trim() : '';
  if (!dream || dream.length > 4000) return { ok: false };
  const requiredStringFields = ['domainId', 'proudMomentId', 'motivationId', 'roleModelTypeId'];
  for (const k of requiredStringFields) {
    const v = payload[k];
    if (typeof v !== 'string' || !v.trim()) return { ok: false };
  }
  const admired = payload.admiredQualityIds;
  if (!Array.isArray(admired) || admired.length < 1 || admired.length > 3) return { ok: false };
  if (!admired.every((x) => typeof x === 'string' && x.trim().length > 0)) return { ok: false };
  const whyNowId = payload.whyNowId;
  if (!(whyNowId === null || typeof whyNowId === 'string')) return { ok: false };
  return { ok: true, payload };
}

function randomToken(): string {
  // 64 hex-ish chars (2 UUIDs without hyphens). Not a hash; this is a secret.
  return `${crypto.randomUUID().replace(/-/g, '')}${crypto.randomUUID().replace(/-/g, '')}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json(405, { error: { message: 'Method not allowed', code: 'method_not_allowed' } });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return json(503, { error: { message: 'ArcDraft service unavailable', code: 'provider_unavailable' } });
  }

  // Lightweight abuse cap: max N draft creations/day per IP (best-effort).
  // If you need stronger controls, add CAPTCHA on the marketing site and/or a dedicated rate limiter.
  const DRAFTS_PER_DAY_CAP = 50;
  let ipHash: string | null = null;
  try {
    const forwardedFor = (req.headers.get('x-forwarded-for') ?? '').trim();
    const ip = forwardedFor ? firstIpFromForwardedFor(forwardedFor) : '';
    if (ip) {
      ipHash = await sha256Hex(ip);
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await admin
        .from('arc_drafts')
        .select('id', { count: 'exact', head: true })
        .eq('ip_hash', ipHash)
        .gte('created_at', since);
      if (typeof count === 'number' && count >= DRAFTS_PER_DAY_CAP) {
        return json(429, { error: { message: 'Too many drafts today', code: 'rate_limited' } });
      }
    }
  } catch {
    // best-effort only
  }

  const body = await req.json().catch(() => null);
  const validated = validatePayload(body?.payload);
  if (!validated.ok) {
    return json(400, { error: { message: 'Invalid payload', code: 'bad_request' } });
  }

  const expiresDays = 7;
  const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString();

  const token = randomToken();
  const claimTokenHash = await sha256Hex(token);

  const { data, error } = await admin
    .from('arc_drafts')
    .insert({
      payload: validated.payload,
      expires_at: expiresAt,
      claim_token_hash: claimTokenHash,
      ip_hash: ipHash,
    })
    .select('id')
    .single();

  if (error || !data?.id) {
    return json(500, { error: { message: 'Unable to create draft', code: 'server_error' } });
  }

  return json(200, { draftId: data.id, token, expiresAt });
});



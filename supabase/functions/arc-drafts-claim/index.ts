// ArcDraft claim (in-app, auth-backed)
//
// Route:
// - POST /arc-drafts-claim -> { payload, expiresAt }
//
// Notes:
// - Requires Authorization: Bearer <supabase access token>
// - Uses service role to validate token + atomically mark draft as claimed

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

function requireBearerToken(req: Request): string | null {
  const auth = (req.headers.get('authorization') ?? '').trim();
  const m = /^bearer\\s+(.+)$/i.exec(auth);
  return m?.[1]?.trim() ?? null;
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
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

  const token = requireBearerToken(req);
  if (!token) {
    return json(401, { error: { message: 'Missing Authorization bearer token', code: 'unauthorized' } });
  }

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  const userId = userData?.user?.id ?? null;
  if (userErr || !userId) {
    return json(401, { error: { message: 'Invalid auth token', code: 'unauthorized' } });
  }

  const body = await req.json().catch(() => null);
  const draftId = typeof body?.draftId === 'string' ? body.draftId.trim() : '';
  const claimToken = typeof body?.token === 'string' ? body.token.trim() : '';
  if (!draftId || !claimToken) {
    return json(400, { error: { message: 'Missing draftId/token', code: 'bad_request' } });
  }

  const claimTokenHash = await sha256Hex(claimToken);
  const nowIso = new Date().toISOString();

  // Atomic claim: only succeeds if token matches, draft is unclaimed, and not expired.
  const { data, error } = await admin
    .from('arc_drafts')
    .update({
      claimed_by_user_id: userId,
      claimed_at: nowIso,
    })
    .eq('id', draftId)
    .eq('claim_token_hash', claimTokenHash)
    .is('claimed_by_user_id', null)
    .gt('expires_at', nowIso)
    .select('payload, expires_at')
    .maybeSingle();

  if (error) {
    return json(500, { error: { message: 'Unable to claim draft', code: 'server_error' } });
  }

  if (!data) {
    return json(404, { error: { message: 'Draft not found or not claimable', code: 'not_found' } });
  }

  return json(200, { payload: data.payload as JsonValue, expiresAt: data.expires_at });
});



// Friend invite acceptance
//
// Route:
// - POST /friend-invite-accept { code } -> { friendshipId, status }
//
// Notes:
// - Requires Authorization: Bearer <supabase access token>
// - Delegates the complete state transition to one authenticated atomic RPC

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

function getSupabaseForUser(token: string) {
  const url = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !publishableKey) return null;
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

function requireBearerToken(req: Request): string | null {
  const auth = (req.headers.get('authorization') ?? '').trim();
  const m = /^bearer\s+(.+)$/i.exec(auth);
  return m?.[1]?.trim() ?? null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json(405, { error: { message: 'Method not allowed', code: 'method_not_allowed' } });
  }

  const token = requireBearerToken(req);
  if (!token) {
    return json(401, { error: { message: 'Missing Authorization bearer token', code: 'unauthorized' } });
  }

  const supabase = getSupabaseForUser(token);
  if (!supabase) {
    return json(503, { error: { message: 'Friend service unavailable', code: 'provider_unavailable' } });
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user?.id) {
    return json(401, { error: { message: 'Invalid auth token', code: 'unauthorized' } });
  }

  // Parse request body
  const body = await req.json().catch(() => ({}));
  const code = typeof body?.code === 'string' ? body.code.trim() : '';

  if (!code) {
    return json(400, { error: { message: 'Missing invite code', code: 'bad_request' } });
  }

  const { data, error } = await supabase.rpc('accept_kwilt_friend_invite', { p_code: code });
  if (error) {
    const safe = String(error.message ?? '').toLowerCase();
    if (safe.includes('invite_expired')) {
      return json(410, { error: { message: 'This invite has expired', code: 'expired' } });
    }
    if (safe.includes('invite_exhausted')) {
      return json(410, { error: { message: 'This invite is no longer available', code: 'exhausted' } });
    }
    if (safe.includes('invite_not_found')) {
      return json(404, { error: { message: 'Invite not found', code: 'not_found' } });
    }
    if (safe.includes('self_friend_not_allowed')) {
      return json(400, { error: { message: "You can't accept your own invite", code: 'self_friend' } });
    }
    if (safe.includes('invite_unavailable')) {
      return json(403, { error: { message: 'This invite is unavailable', code: 'unavailable' } });
    }
    return json(400, { error: { message: 'Unable to accept this invite', code: 'accept_failed' } });
  }

  const result = data && typeof data === 'object' && !Array.isArray(data)
    ? data as Record<string, JsonValue>
    : {};

  return json(200, {
    friendshipId: typeof result.friendshipId === 'string' ? result.friendshipId : null,
    status: 'active',
    replayed: result.replayed === true,
  });
});

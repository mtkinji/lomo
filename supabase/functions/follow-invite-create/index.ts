// Follow invite creation (Duolingo-style follower graph)
//
// Route:
// - POST /follow-invite-create -> { id, code, createdAt, expiresAt, uses, maxUses }
//
// Notes:
// - Requires Authorization: Bearer <supabase access token>
// - Creates a follow invite that can be shared via link
// - Uses existing kwilt_invites table with entity_type = 'follow'

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

function randomInviteCode(): string {
  const raw = crypto.randomUUID().replace(/-/g, '');
  return raw.slice(0, 12);
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

  const admin = getSupabaseAdmin();
  if (!admin) {
    return json(503, { error: { message: 'Follow invite service unavailable', code: 'provider_unavailable' } });
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

  const body = await req.json().catch(() => ({}));
  const expiresInDays = typeof body?.expiresInDays === 'number' ? body.expiresInDays : 7;
  const maxUses = typeof body?.maxUses === 'number' ? body.maxUses : 1;

  const safeExpiresInDays = Math.max(1, Math.min(30, expiresInDays));
  const safeMaxUses = Math.max(1, Math.min(25, maxUses));
  const expiresAt = new Date(Date.now() + safeExpiresInDays * 24 * 60 * 60 * 1000).toISOString();

  // Rate limiting: max 25 follow invites per day per user (best-effort)
  const INVITES_PER_DAY_CAP = 25;
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from('kwilt_invites')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', userId)
      .eq('entity_type', 'follow')
      .gte('created_at', since);
    if (typeof count === 'number' && count >= INVITES_PER_DAY_CAP) {
      return json(429, { error: { message: 'Too many follow invites today', code: 'rate_limited' } });
    }
  } catch {
    // best-effort
  }

  // Fetch user profile for invite payload (best-effort)
  let inviterName: string | null = null;
  let inviterAvatarUrl: string | null = null;
  try {
    const { data: profile } = await admin
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', userId)
      .maybeSingle();
    if (profile) {
      inviterName = profile.display_name;
      inviterAvatarUrl = profile.avatar_url;
    }
  } catch {
    // best-effort
  }

  // Create invite row (entity_id is the followed user's id; i.e. inviter's user id)
  let inviteCode = '';
  let inviteId = '';
  let createdAt = '';
  for (let attempt = 0; attempt < 6; attempt += 1) {
    inviteCode = randomInviteCode();
    const { data, error } = await admin
      .from('kwilt_invites')
      .insert({
        entity_type: 'follow',
        entity_id: userId,
        created_by: userId,
        code: inviteCode,
        expires_at: expiresAt,
        max_uses: safeMaxUses,
        payload: {
          inviterName,
          inviterAvatarUrl,
        },
      })
      .select('id, created_at')
      .single();
    if (!error && data) {
      inviteId = data.id;
      createdAt = data.created_at;
      break;
    }
    inviteCode = '';
  }

  if (!inviteCode || !inviteId) {
    return json(500, { error: { message: 'Unable to create follow invite', code: 'server_error' } });
  }

  return json(200, {
    id: inviteId,
    code: inviteCode,
    createdAt,
    expiresAt,
    uses: 0,
    maxUses: safeMaxUses,
  });
});



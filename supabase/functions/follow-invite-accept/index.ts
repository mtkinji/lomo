// Follow invite acceptance (Duolingo-style follower graph)
//
// Route:
// - POST /follow-invite-accept { code } -> { followedUserId, status }
//
// Notes:
// - Requires Authorization: Bearer <supabase access token>
// - Accepting a follow invite creates an asymmetric follow: accepter follows inviter

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
    return json(503, { error: { message: 'Follow service unavailable', code: 'provider_unavailable' } });
  }

  const token = requireBearerToken(req);
  if (!token) {
    return json(401, { error: { message: 'Missing Authorization bearer token', code: 'unauthorized' } });
  }

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  const followerId = userData?.user?.id ?? null;
  if (userErr || !followerId) {
    return json(401, { error: { message: 'Invalid auth token', code: 'unauthorized' } });
  }

  const body = await req.json().catch(() => ({}));
  const code = typeof body?.code === 'string' ? body.code.trim() : '';
  if (!code) {
    return json(400, { error: { message: 'Missing invite code', code: 'bad_request' } });
  }

  const { data: invite, error: inviteErr } = await admin
    .from('kwilt_invites')
    .select('id, entity_type, entity_id, expires_at, max_uses, uses')
    .eq('code', code)
    .eq('entity_type', 'follow')
    .maybeSingle();

  if (inviteErr || !invite) {
    return json(404, { error: { message: 'Invite not found', code: 'not_found' } });
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return json(410, { error: { message: 'Invite has expired', code: 'expired' } });
  }
  if (invite.uses >= invite.max_uses) {
    return json(410, { error: { message: 'Invite has been used', code: 'exhausted' } });
  }

  const followedId = invite.entity_id; // inviter's user id

  if (followedId === followerId) {
    return json(400, { error: { message: "You can't follow yourself", code: 'self_follow' } });
  }

  // Block checks (best-effort)
  try {
    const { data: blockedByTarget } = await admin
      .from('kwilt_blocks')
      .select('id')
      .eq('blocker_id', followedId)
      .eq('blocked_id', followerId)
      .maybeSingle();
    if (blockedByTarget) {
      return json(403, { error: { message: 'Unable to follow this user', code: 'blocked' } });
    }
  } catch {
    // best-effort
  }

  // Create follow row (idempotent)
  const { error: insertErr } = await admin
    .from('kwilt_follows')
    .upsert(
      {
        follower_id: followerId,
        followed_id: followedId,
        status: 'active',
      },
      { onConflict: 'follower_id,followed_id' },
    );

  if (insertErr) {
    console.error('Failed to create follow:', insertErr);
    return json(500, { error: { message: 'Failed to follow user', code: 'server_error' } });
  }

  await admin
    .from('kwilt_invites')
    .update({ uses: invite.uses + 1 })
    .eq('id', invite.id);

  return json(200, {
    followedUserId: followedId,
    status: 'following',
    message: 'You are now following this user!',
  });
});



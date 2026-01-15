// Friend invite acceptance
//
// Route:
// - POST /friend-invite-accept { code } -> { friendshipId, status }
//
// Notes:
// - Requires Authorization: Bearer <supabase access token>
// - Creates or updates a friendship between inviter and accepter
// - Friendships are stored with user_a < user_b for deduplication

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
    return json(503, { error: { message: 'Friend service unavailable', code: 'provider_unavailable' } });
  }

  const token = requireBearerToken(req);
  if (!token) {
    return json(401, { error: { message: 'Missing Authorization bearer token', code: 'unauthorized' } });
  }

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  const accepterId = userData?.user?.id ?? null;
  if (userErr || !accepterId) {
    return json(401, { error: { message: 'Invalid auth token', code: 'unauthorized' } });
  }

  // Parse request body
  const body = await req.json().catch(() => ({}));
  const code = typeof body?.code === 'string' ? body.code.trim() : '';

  if (!code) {
    return json(400, { error: { message: 'Missing invite code', code: 'bad_request' } });
  }

  // Look up the invite
  const { data: invite, error: inviteErr } = await admin
    .from('kwilt_invites')
    .select('id, entity_type, entity_id, created_by, expires_at, max_uses, uses, payload')
    .eq('code', code)
    .eq('entity_type', 'friendship')
    .maybeSingle();

  if (inviteErr || !invite) {
    return json(404, { error: { message: 'Invite not found', code: 'not_found' } });
  }

  // Validate invite
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return json(410, { error: { message: 'Invite has expired', code: 'expired' } });
  }

  if (invite.uses >= invite.max_uses) {
    return json(410, { error: { message: 'Invite has been used', code: 'exhausted' } });
  }

  // entity_id is the inviter's user ID
  const inviterId = invite.entity_id;

  // Can't friend yourself
  if (inviterId === accepterId) {
    return json(400, { error: { message: "You can't add yourself as a friend", code: 'self_friend' } });
  }

  // Normalize user pair (smaller UUID first)
  const userA = inviterId < accepterId ? inviterId : accepterId;
  const userB = inviterId < accepterId ? accepterId : inviterId;

  // Check for existing friendship
  const { data: existing } = await admin
    .from('kwilt_friendships')
    .select('id, status')
    .eq('user_a', userA)
    .eq('user_b', userB)
    .maybeSingle();

  let friendshipId: string;
  let status: string;

  if (existing) {
    // Friendship already exists
    if (existing.status === 'active') {
      return json(200, {
        friendshipId: existing.id,
        status: 'already_friends',
        message: 'You are already friends!',
      });
    }

    if (existing.status === 'blocked') {
      return json(403, { error: { message: 'Unable to add this friend', code: 'blocked' } });
    }

    // Pending - just return the existing friendship
    friendshipId = existing.id;
    status = 'pending';
  } else {
    // Create new friendship (pending until inviter confirms)
    // Actually, since the inviter created the invite, we can make it active immediately
    const { data: newFriendship, error: createErr } = await admin
      .from('kwilt_friendships')
      .insert({
        user_a: userA,
        user_b: userB,
        status: 'active', // Active immediately since inviter explicitly shared the link
        initiated_by: inviterId,
        accepted_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (createErr || !newFriendship) {
      console.error('Failed to create friendship:', createErr);
      return json(500, { error: { message: 'Failed to create friendship', code: 'server_error' } });
    }

    friendshipId = newFriendship.id;
    status = 'active';
  }

  // Increment invite uses
  await admin
    .from('kwilt_invites')
    .update({ uses: invite.uses + 1 })
    .eq('id', invite.id);

  return json(200, {
    friendshipId,
    status,
    message: status === 'active' ? 'You are now friends!' : 'Friend request sent',
  });
});


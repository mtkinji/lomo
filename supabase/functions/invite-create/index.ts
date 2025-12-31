// Invite creation for shared goals (auth-backed)
//
// Route:
// - POST /invite-create  -> { inviteCode, inviteUrl, entityType, entityId, payload }
//
// Notes:
// - Requires Authorization: Bearer <supabase access token>
// - Uses service role to write rows + emit feed events

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
    return json(503, { error: { message: 'Invite service unavailable', code: 'provider_unavailable' } });
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
  const entityType = typeof body?.entityType === 'string' ? body.entityType.trim() : '';
  const entityId = typeof body?.entityId === 'string' ? body.entityId.trim() : '';
  const kind = typeof body?.kind === 'string' ? body.kind.trim() : 'buddy';
  const goalTitle = typeof body?.goalTitle === 'string' ? body.goalTitle.trim() : '';

  if (entityType !== 'goal' || !entityId) {
    return json(400, { error: { message: 'Invalid entityType/entityId', code: 'bad_request' } });
  }

  const maxUses = kind === 'squad' ? 5 : 1;
  const expiresDays = kind === 'squad' ? 14 : 14;
  const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString();

  // Ensure inviter is a member (co_owner) so the entity has a canonical membership.
  // (Idempotent insert.)
  await admin.from('kwilt_memberships').upsert(
    {
      entity_type: 'goal',
      entity_id: entityId,
      user_id: userId,
      role: 'co_owner',
      status: 'active',
    },
    { onConflict: 'entity_type,entity_id,user_id' },
  );

  // Create invite row (retry on collision).
  let inviteCode = '';
  for (let attempt = 0; attempt < 6; attempt += 1) {
    inviteCode = randomInviteCode();
    const { error } = await admin.from('kwilt_invites').insert({
      entity_type: 'goal',
      entity_id: entityId,
      created_by: userId,
      code: inviteCode,
      expires_at: expiresAt,
      max_uses: maxUses,
      payload: {
        kind,
        goalTitle: goalTitle || null,
      },
    });
    if (!error) break;
    inviteCode = '';
  }

  if (!inviteCode) {
    return json(500, { error: { message: 'Unable to create invite', code: 'server_error' } });
  }

  // Emit a lightweight feed event (members-only).
  await admin.from('kwilt_feed_events').insert({
    entity_type: 'goal',
    entity_id: entityId,
    actor_id: userId,
    type: 'invite_created',
    payload: { kind },
  });

  // Redirect endpoint is hosted; clients can also share the raw scheme link.
  // We return a scheme link because it's always valid in-app and doesn't depend
  // on universal links being configured yet.
  const inviteUrl = `kwilt://invite?code=${encodeURIComponent(inviteCode)}`;

  return json(200, {
    inviteCode,
    inviteUrl,
    entityType: 'goal',
    entityId,
    payload: { kind, goalTitle: goalTitle || null, expiresAt, maxUses },
  });
});



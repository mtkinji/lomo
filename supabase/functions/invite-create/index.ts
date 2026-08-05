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

function getSupabaseForUser(token: string) {
  const url = Deno.env.get('SUPABASE_URL');
  const publishableKey =
    (Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '').trim();
  if (!url || !publishableKey) return null;
  return createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
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
  const rawKind = typeof body?.kind === 'string' ? body.kind.trim() : '';
  // Backward compatible: accept legacy kinds but map to the unified behavior.
  // We intentionally avoid distinguishing "buddy" vs "squad" in vNext UX.
  const kind = rawKind === 'people' || rawKind === 'squad' || rawKind === 'buddy' ? 'people' : 'people';
  const goalTitle = typeof body?.goalTitle === 'string' ? body.goalTitle.trim() : '';
  const goalImageUrl = typeof body?.goalImageUrl === 'string' ? body.goalImageUrl.trim() : '';
  const recipientKind =
    body?.recipient?.kind === 'friend' || body?.recipient?.kind === 'household'
      ? body.recipient.kind
      : null;
  const recipientRelationshipId =
    typeof body?.recipient?.relationshipId === 'string'
      ? body.recipient.relationshipId.trim()
      : '';

  const safeGoalImageUrl = (() => {
    if (!goalImageUrl) return null;
    try {
      const u = new URL(goalImageUrl);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
      return u.toString();
    } catch {
      return null;
    }
  })();

  if (entityType !== 'goal' || !entityId) {
    return json(400, { error: { message: 'Invalid entityType/entityId', code: 'bad_request' } });
  }

  if (body?.recipient != null) {
    if (!recipientKind || !recipientRelationshipId) {
      return json(400, { error: { message: 'Invalid recipient', code: 'bad_request' } });
    }

    const supabase = getSupabaseForUser(token);
    if (!supabase) {
      return json(503, { error: { message: 'Invite service unavailable', code: 'provider_unavailable' } });
    }
    const { data, error } = await supabase.rpc('create_kwilt_targeted_goal_invite', {
      p_entity_id: entityId,
      p_goal_title: goalTitle,
      p_goal_image_url: safeGoalImageUrl,
      p_recipient_kind: recipientKind,
      p_relationship_id: recipientRelationshipId,
    });
    if (error) {
      const safe = String(error.message ?? '').toLowerCase();
      if (safe.includes('goal_owner_required')) {
        return json(403, { error: { message: 'Only the goal owner can invite partners', code: 'forbidden' } });
      }
      if (safe.includes('recipient_already_has_access')) {
        return json(409, { error: { message: 'This person already has access', code: 'already_has_access' } });
      }
      if (safe.includes('invite_rate_limited')) {
        return json(429, { error: { message: 'Too many invites today', code: 'rate_limited' } });
      }
      if (safe.includes('recipient_unavailable') || safe.includes('invalid_recipient_kind')) {
        return json(404, { error: { message: 'This person is unavailable', code: 'recipient_unavailable' } });
      }
      return json(400, { error: { message: 'Unable to create this invitation', code: 'create_failed' } });
    }

    const result = data && typeof data === 'object' && !Array.isArray(data)
      ? data as Record<string, JsonValue>
      : {};
    const inviteCode = typeof result.inviteCode === 'string' ? result.inviteCode : '';
    if (!inviteCode) {
      return json(503, { error: { message: 'Unable to create invite', code: 'provider_unavailable' } });
    }
    return json(200, {
      inviteCode,
      inviteUrl: `kwilt://invite?code=${encodeURIComponent(inviteCode)}`,
      entityType: 'goal',
      entityId,
      payload: result.payload ?? { kind, goalTitle: goalTitle || null, goalImageUrl: safeGoalImageUrl },
      targeted: true,
      reused: result.reused === true,
    });
  }

  const maxUses = 25;
  const expiresDays = 14;
  const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString();

  // Lightweight abuse cap: max N invites/day per user.
  // (We count invites created in the last 24h; this is approximate but good enough.)
  const INVITES_PER_DAY_CAP = 50;
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from('kwilt_invites')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', userId)
      .gte('created_at', since);
    if (typeof count === 'number' && count >= INVITES_PER_DAY_CAP) {
      return json(429, { error: { message: 'Too many invites today', code: 'rate_limited' } });
    }
  } catch {
    // best-effort only
  }

  const { data: existingMembership, error: existingMembershipErr } = await admin
    .from('kwilt_memberships')
    .select('role, status')
    .eq('entity_type', 'goal')
    .eq('entity_id', entityId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existingMembershipErr) {
    return json(503, { error: { message: 'Unable to verify membership', code: 'provider_unavailable' } });
  }

  const existingRole = ((existingMembership as any)?.role ?? '').toString().toLowerCase();
  if (existingRole && existingRole !== 'owner' && existingRole !== 'co_owner') {
    return json(403, { error: { message: 'Only the goal owner can invite partners', code: 'forbidden' } });
  }
  if (!existingRole) {
    const { data: ownedGoal, error: ownedGoalErr } = await admin
      .from('kwilt_goals')
      .select('id')
      .eq('user_id', userId)
      .eq('id', entityId)
      .maybeSingle();
    if (ownedGoalErr) {
      return json(503, { error: { message: 'Unable to verify goal owner', code: 'provider_unavailable' } });
    }
    if (!ownedGoal) {
      return json(403, { error: { message: 'Only the goal owner can invite partners', code: 'forbidden' } });
    }
  }

  // Ensure inviter is the canonical goal owner.
  // (Idempotent insert.)
  await admin.from('kwilt_memberships').upsert(
    {
      entity_type: 'goal',
      entity_id: entityId,
      user_id: userId,
      role: 'owner',
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
        goalImageUrl: safeGoalImageUrl,
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
    payload: { kind, goalTitle: goalTitle || null, goalImageUrl: safeGoalImageUrl, expiresAt, maxUses },
  });
});


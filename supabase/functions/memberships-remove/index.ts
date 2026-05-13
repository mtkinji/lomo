// Remove a partner from a shared entity (auth-backed)
//
// Route:
// - POST /memberships-remove -> { ok, entityType, entityId, userId }
//
// Notes:
// - Requires Authorization: Bearer <supabase access token>
// - Only an owner can remove another active non-owner member.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-kwilt-install-id, x-kwilt-client',
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

function isOwnerRole(role: unknown): boolean {
  const value = String(role ?? '').toLowerCase();
  // `co_owner` is legacy creator data. Treat it as owner for permissions only.
  return value === 'owner' || value === 'co_owner';
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
    return json(503, { error: { message: 'Membership service unavailable', code: 'provider_unavailable' } });
  }

  const token = requireBearerToken(req);
  if (!token) {
    return json(401, { error: { message: 'Missing Authorization bearer token', code: 'unauthorized' } });
  }

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  const requesterId = userData?.user?.id ?? null;
  if (userErr || !requesterId) {
    return json(401, { error: { message: 'Invalid auth token', code: 'unauthorized' } });
  }

  const body = await req.json().catch(() => null);
  const entityType = typeof body?.entityType === 'string' ? body.entityType.trim() : '';
  const entityId = typeof body?.entityId === 'string' ? body.entityId.trim() : '';
  const targetUserId = typeof body?.userId === 'string' ? body.userId.trim() : '';
  if (!entityType || !entityId || !targetUserId) {
    return json(400, { error: { message: 'Missing entityType/entityId/userId', code: 'bad_request' } });
  }
  if (targetUserId === requesterId) {
    return json(400, { error: { message: 'Use leave instead of removing yourself', code: 'bad_request' } });
  }

  const { data: requesterOwnedGoal } =
    entityType === 'goal'
      ? await admin
          .from('kwilt_goals')
          .select('id')
          .eq('user_id', requesterId)
          .eq('id', entityId)
          .maybeSingle()
      : { data: null };

  const { data: requesterMembership, error: requesterErr } = await admin
    .from('kwilt_memberships')
    .select('id, role, status')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('user_id', requesterId)
    .eq('status', 'active')
    .maybeSingle();

  if (requesterErr || !requesterMembership || (!requesterOwnedGoal && !isOwnerRole((requesterMembership as any).role))) {
    return json(403, { error: { message: 'Only the goal owner can remove partners', code: 'forbidden' } });
  }

  const { data: targetMembership, error: targetErr } = await admin
    .from('kwilt_memberships')
    .select('id, role, status')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('user_id', targetUserId)
    .eq('status', 'active')
    .maybeSingle();

  if (targetErr || !targetMembership) {
    return json(404, { error: { message: 'Partner not found', code: 'not_found' } });
  }

  const { data: targetOwnedGoal } =
    entityType === 'goal'
      ? await admin
          .from('kwilt_goals')
          .select('id')
          .eq('user_id', targetUserId)
          .eq('id', entityId)
          .maybeSingle()
      : { data: null };

  if (String((targetMembership as any).role ?? '').toLowerCase() === 'owner' || targetOwnedGoal) {
    return json(409, { error: { message: 'Goal owner cannot be removed', code: 'owner_cannot_be_removed' } });
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await admin
    .from('kwilt_memberships')
    .update({ status: 'left', left_at: now, updated_at: now })
    .eq('id', (targetMembership as any).id);

  if (updateErr) {
    return json(503, { error: { message: 'Unable to remove partner', code: 'provider_unavailable' } });
  }

  // Emit feed event (best-effort). Actor is the owner who removed access.
  await admin.from('kwilt_feed_events').insert({
    entity_type: entityType,
    entity_id: entityId,
    actor_id: requesterId,
    type: 'member_left',
    payload: { removedUserId: targetUserId },
  });

  return json(200, { ok: true, entityType, entityId, userId: targetUserId });
});


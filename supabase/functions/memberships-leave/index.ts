// Leave a shared entity (auth-backed)
//
// Route:
// - POST /memberships-leave  -> { ok, entityType, entityId }
//
// Notes:
// - Requires Authorization: Bearer <supabase access token>
// - Uses service role to update membership + emit feed events

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
  const userId = userData?.user?.id ?? null;
  if (userErr || !userId) {
    return json(401, { error: { message: 'Invalid auth token', code: 'unauthorized' } });
  }

  const body = await req.json().catch(() => null);
  const entityType = typeof body?.entityType === 'string' ? body.entityType.trim() : '';
  const entityId = typeof body?.entityId === 'string' ? body.entityId.trim() : '';
  if (!entityType || !entityId) {
    return json(400, { error: { message: 'Missing entityType/entityId', code: 'bad_request' } });
  }

  // Verify current membership.
  const { data: membership, error: membershipErr } = await admin
    .from('kwilt_memberships')
    .select('id, role, status')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('user_id', userId)
    .maybeSingle();

  if (membershipErr || !membership) {
    return json(403, { error: { message: 'Not a member', code: 'forbidden' } });
  }

  if ((membership as any).status === 'left') {
    return json(200, { ok: true, entityType, entityId });
  }

  // Avoid leaving an entity without any active "owner" semantics.
  // Today we primarily assign `co_owner` (not `owner`) for shared goals, but keep a safe guardrail anyway.
  const role = ((membership as any).role ?? '').toString();
  if (role === 'owner') {
    const { count } = await admin
      .from('kwilt_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('status', 'active');
    if (typeof count === 'number' && count > 1) {
      return json(409, { error: { message: 'Owner cannot leave while others are members', code: 'owner_cannot_leave' } });
    }
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await admin
    .from('kwilt_memberships')
    .update({ status: 'left', left_at: now, updated_at: now })
    .eq('id', (membership as any).id);

  if (updateErr) {
    return json(503, { error: { message: 'Unable to leave goal', code: 'provider_unavailable' } });
  }

  // Emit feed event (best-effort).
  await admin.from('kwilt_feed_events').insert({
    entity_type: entityType,
    entity_id: entityId,
    actor_id: userId,
    type: 'member_left',
    payload: {},
  });

  return json(200, { ok: true, entityType, entityId });
});



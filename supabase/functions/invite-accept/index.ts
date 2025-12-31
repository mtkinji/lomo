// Invite acceptance for shared goals (auth-backed)
//
// Route:
// - POST /invite-accept  -> { ok, entityType, entityId, payload }
//
// Notes:
// - Requires Authorization: Bearer <supabase access token>
// - Uses service role to validate code and create membership + feed events

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
  const inviteCode = typeof body?.inviteCode === 'string' ? body.inviteCode.trim() : '';
  if (!inviteCode) {
    return json(400, { error: { message: 'Missing inviteCode', code: 'bad_request' } });
  }

  const { data: invite, error: inviteErr } = await admin
    .from('kwilt_invites')
    .select('entity_type, entity_id, expires_at, max_uses, uses, payload, created_by')
    .eq('code', inviteCode)
    .maybeSingle();

  if (inviteErr || !invite) {
    return json(404, { error: { message: 'Invite not found', code: 'not_found' } });
  }

  const entityType = (invite as any).entity_type as string;
  const entityId = (invite as any).entity_id as string;
  const expiresAt = (invite as any).expires_at as string | null;
  const maxUses = (invite as any).max_uses as number;
  const uses = (invite as any).uses as number;
  const payload = ((invite as any).payload ?? {}) as Record<string, unknown>;

  if (entityType !== 'goal' || !entityId) {
    return json(500, { error: { message: 'Invite misconfigured', code: 'server_error' } });
  }

  // Idempotency: if the user already has an active membership for this goal,
  // treat "accept" as successful even if the invite has expired or been consumed.
  // This makes re-opening old invite links safe and avoids confusing UX.
  try {
    const { data: existingMembership } = await admin
      .from('kwilt_memberships')
      .select('status')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('user_id', userId)
      .maybeSingle();
    if (existingMembership?.status === 'active') {
      return json(200, { ok: true, entityType, entityId, payload });
    }
  } catch {
    // best-effort only; proceed with normal checks
  }

  if (expiresAt && Date.parse(expiresAt) < Date.now()) {
    return json(410, { error: { message: 'Invite expired', code: 'invite_expired' } });
  }
  if (typeof uses === 'number' && typeof maxUses === 'number' && uses >= maxUses) {
    return json(409, { error: { message: 'Invite already used', code: 'invite_consumed' } });
  }

  // Create membership (idempotent) first.
  const { error: memberErr } = await admin.from('kwilt_memberships').upsert(
    {
      entity_type: entityType,
      entity_id: entityId,
      user_id: userId,
      role: 'co_owner',
      status: 'active',
    },
    { onConflict: 'entity_type,entity_id,user_id' },
  );

  if (memberErr) {
    return json(503, { error: { message: 'Unable to join goal', code: 'provider_unavailable' } });
  }

  // Increment uses optimistically (do not fail the join if this increments fails).
  await admin
    .from('kwilt_invites')
    .update({ uses: (uses ?? 0) + 1 })
    .eq('code', inviteCode);

  // Emit feed event.
  await admin.from('kwilt_feed_events').insert({
    entity_type: entityType,
    entity_id: entityId,
    actor_id: userId,
    type: 'member_joined',
    payload: {},
  });

  return json(200, { ok: true, entityType, entityId, payload });
});



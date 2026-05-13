// No-download text reply for shared-goal invite recipients.
//
// Route:
// - POST /share-web-reply -> { ok, entityId, targetEventId, replyEventId }
//
// The invite code is the access token. This endpoint records a short reply
// on the inviter's latest check-in without requiring the recipient to install
// Kwilt first. Pairs with share-web-cheer for the no-install partner support
// loop.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-kwilt-client',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_REPLY_LENGTH = 280;
const MAX_NAME_LENGTH = 80;

function json(status: number, body: JsonValue) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json(405, { error: { message: 'Method not allowed', code: 'method_not_allowed' } });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return json(503, {
      error: { message: 'Reply service unavailable', code: 'provider_unavailable' },
    });
  }

  const body = await req.json().catch(() => null);
  const inviteCode = typeof body?.inviteCode === 'string' ? body.inviteCode.trim() : '';
  const rawText = typeof body?.text === 'string' ? body.text : '';
  const text = rawText.trim().slice(0, MAX_REPLY_LENGTH);
  const senderName =
    typeof body?.senderName === 'string' ? body.senderName.trim().slice(0, MAX_NAME_LENGTH) : '';

  if (!inviteCode) {
    return json(400, { error: { message: 'Missing inviteCode', code: 'bad_request' } });
  }
  if (text.length === 0) {
    return json(400, { error: { message: 'Reply cannot be empty', code: 'bad_request' } });
  }

  const { data: invite } = await admin
    .from('kwilt_invites')
    .select('entity_type, entity_id, expires_at, max_uses, uses')
    .eq('code', inviteCode)
    .maybeSingle();

  if (!invite) {
    return json(404, { error: { message: 'Invite not found', code: 'not_found' } });
  }

  const entityType = (invite as any).entity_type as string;
  const entityId = (invite as any).entity_id as string;
  const expiresAt = (invite as any).expires_at as string | null;
  const maxUses = (invite as any).max_uses as number;
  const uses = (invite as any).uses as number;

  if (entityType !== 'goal' || !entityId) {
    return json(500, { error: { message: 'Invite misconfigured', code: 'server_error' } });
  }
  if (expiresAt && Date.parse(expiresAt) < Date.now()) {
    return json(410, { error: { message: 'Invite expired', code: 'invite_expired' } });
  }
  if (typeof uses === 'number' && typeof maxUses === 'number' && uses >= maxUses) {
    return json(409, { error: { message: 'Invite already used', code: 'invite_consumed' } });
  }

  const { data: latestEvents } = await admin
    .from('kwilt_feed_events')
    .select('id')
    .eq('entity_type', 'goal')
    .eq('entity_id', entityId)
    .eq('type', 'checkin_submitted')
    .order('created_at', { ascending: false })
    .limit(1);

  const targetEventId =
    Array.isArray(latestEvents) && typeof latestEvents[0]?.id === 'string'
      ? latestEvents[0].id
      : null;

  if (!targetEventId) {
    return json(409, { error: { message: 'No check-in to reply to yet', code: 'no_checkin' } });
  }

  const { data: inserted, error: insertError } = await admin
    .from('kwilt_feed_events')
    .insert({
      entity_type: 'goal',
      entity_id: entityId,
      actor_id: null,
      type: 'checkin_reply',
      payload: {
        targetEventId,
        text,
        webReply: true,
        senderName: senderName || null,
      },
    })
    .select('id')
    .single();

  if (insertError || !inserted) {
    return json(503, {
      error: { message: 'Unable to send reply', code: 'provider_unavailable' },
    });
  }

  return json(200, {
    ok: true,
    entityId,
    targetEventId,
    replyEventId: inserted.id,
  });
});

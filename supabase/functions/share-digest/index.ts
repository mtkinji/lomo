// Weekly accountability digest for shared goals.
//
// Intended usage: scheduled GET/POST from Supabase Cron. Sends a lightweight
// email to goal owners with recent check-ins and cheers. It is live by default
// when deployed, but `KWILT_SHARE_DIGEST_EMAIL_ENABLED=false` disables sends.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendEmailViaResend } from '../_shared/emailSend.ts';
import { buildSharedGoalDigestEmail } from '../_shared/emailTemplates.ts';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-kwilt-client',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

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

function enabled() {
  const raw = (Deno.env.get('KWILT_SHARE_DIGEST_EMAIL_ENABLED') ?? '').trim().toLowerCase();
  return raw !== '0' && raw !== 'false' && raw !== 'off';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json(405, { error: { message: 'Method not allowed', code: 'method_not_allowed' } });
  }
  if (!enabled()) {
    return json(200, { ok: true, skipped: 'kill_switch' });
  }

  const admin = getSupabaseAdmin();
  const resendKey = (Deno.env.get('RESEND_API_KEY') ?? '').trim();
  const from = (Deno.env.get('KWILT_EMAIL_FROM') ?? '').trim();
  if (!admin || !resendKey || !from) {
    return json(503, { error: { message: 'Digest service unavailable', code: 'provider_unavailable' } });
  }

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: events, error } = await admin
    .from('kwilt_feed_events')
    .select('entity_id, actor_id, type, payload, created_at')
    .eq('entity_type', 'goal')
    .in('type', ['checkin_submitted', 'reaction_added', 'checkin_reply'])
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return json(503, { error: { message: 'Unable to load digest events', code: 'provider_unavailable' } });
  }

  const byGoal = new Map<string, Array<any>>();
  for (const event of events ?? []) {
    const goalId = typeof (event as any).entity_id === 'string' ? (event as any).entity_id : '';
    if (!goalId) continue;
    byGoal.set(goalId, [...(byGoal.get(goalId) ?? []), event]);
  }

  let sent = 0;
  for (const [goalId, goalEvents] of byGoal) {
    const { data: ownerMembership } = await admin
      .from('kwilt_memberships')
      .select('user_id')
      .eq('entity_type', 'goal')
      .eq('entity_id', goalId)
      .in('role', ['owner', 'co_owner'])
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const userId = typeof ownerMembership?.user_id === 'string' ? ownerMembership.user_id : '';
    if (!userId) continue;

    const { data: userData } = await (admin as any).auth.admin.getUserById(userId).catch(() => ({ data: null }));
    const email = typeof userData?.user?.email === 'string' ? userData.user.email : '';
    if (!email) continue;

    const checkins = goalEvents.filter((event) => event.type === 'checkin_submitted').length;
    const cheers = goalEvents.filter((event) => event.type === 'reaction_added').length;
    const replies = goalEvents.filter((event) => event.type === 'checkin_reply').length;
    const emailContent = buildSharedGoalDigestEmail({
      goalId,
      checkins,
      cheers,
      replies,
    });

    const outcome = await sendEmailViaResend({
      resendKey,
      from,
      to: email,
      subject: emailContent.subject,
      text: emailContent.text,
      html: emailContent.html,
      campaign: 'share_digest',
      userId,
      admin,
      idempotencyKey: `share-digest/${goalId}/${new Date().toISOString().slice(0, 10)}`,
      extraTags: [{ name: 'kind', value: 'share_digest' }],
    });

    if (outcome.ok) sent += 1;
  }

  return json(200, { ok: true, goals: byGoal.size, sent });
});

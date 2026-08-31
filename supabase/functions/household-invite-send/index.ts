import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildHouseholdInviteEmail } from '../_shared/emailTemplates.ts';
import { sendEmailViaResend } from '../_shared/emailSend.ts';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: JsonValue) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function validEmail(email: string): boolean {
  return email.length >= 5 && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: { code: 'method_not_allowed', message: 'Method not allowed' } });

  const authorization = (req.headers.get('authorization') ?? '').trim();
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  if (!authorization || !supabaseUrl || !anonKey) {
    return json(401, { error: { code: 'unauthorized', message: 'Sign in to send an invitation' } });
  }

  const body = await req.json().catch(() => null);
  const householdId = typeof body?.householdId === 'string' ? body.householdId.trim() : null;
  const role = body?.role === 'child' ? 'child' : body?.role === 'caregiver' ? 'caregiver' : null;
  const invitedEmail = typeof body?.invitedEmail === 'string' ? body.invitedEmail.trim().toLowerCase() : '';
  const ownerDisplayName = typeof body?.ownerDisplayName === 'string' ? body.ownerDisplayName.trim() : 'Kwilter';
  if (!role || !validEmail(invitedEmail)) {
    return json(400, { error: { code: 'bad_request', message: 'Enter a valid email address' } });
  }

  const caller = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: invitation, error: invitationError } = await caller.rpc('create_kwilt_household_member_invite', {
    p_household_id: householdId,
    p_invited_role: role,
    p_invited_email: invitedEmail,
    p_owner_display_name: ownerDisplayName,
  });
  if (invitationError || !invitation || typeof invitation !== 'object') {
    return json(400, { error: { code: 'invite_failed', message: invitationError?.message ?? 'Unable to create invitation' } });
  }

  const receipt = invitation as { code?: unknown; expiresAt?: unknown; role?: unknown; recovered?: unknown };
  if (typeof receipt.code !== 'string' || typeof receipt.expiresAt !== 'string'
    || (receipt.role !== 'caregiver' && receipt.role !== 'child')
    || typeof receipt.recovered !== 'boolean') {
    return json(500, { error: { code: 'invalid_receipt', message: 'Invitation receipt was invalid' } });
  }

  const { data: snapshot } = await caller.rpc('get_kwilt_household_snapshot');
  const householdName = typeof snapshot?.household?.name === 'string'
    ? snapshot.household.name
    : 'your family Household';
  const inviteLink = `https://go.kwilt.app/open/household/${encodeURIComponent(receipt.code)}`;
  const email = buildHouseholdInviteEmail({
    inviterName: ownerDisplayName,
    householdName,
    role: receipt.role,
    inviteLink,
    inviteCode: formatCode(receipt.code),
  });
  const resendKey = (Deno.env.get('RESEND_API_KEY') ?? '').trim();
  const from = (Deno.env.get('INVITE_EMAIL_FROM') ?? 'no-reply@mail.kwilt.app').trim();
  const outcome = resendKey
    ? await sendEmailViaResend({
      resendKey,
      from,
      to: invitedEmail,
      subject: email.subject,
      text: email.text,
      html: email.html,
      campaign: 'household_invite',
      idempotencyKey: `household-invite:${householdId ?? 'created'}:${invitedEmail}:${receipt.expiresAt}`,
    })
    : { ok: false as const, reason: 'resend_error' as const };

  return json(200, {
    code: receipt.code,
    expiresAt: receipt.expiresAt,
    role: receipt.role,
    recovered: receipt.recovered,
    emailDelivery: outcome.ok ? 'sent' : 'failed',
  });
});

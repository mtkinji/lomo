// Invite email sending for shared goals (auth-backed)
//
// Route:
// - POST /invite-email-send -> { ok: true }
//
// Notes:
// - Requires Authorization: Bearer <supabase access token>
// - Uses service role to create invite rows.
// - Sends email via Resend.

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

function isValidEmail(raw: string): boolean {
  const email = raw.trim();
  if (email.length < 5 || email.length > 254) return false;
  // Conservative validation. Enough to catch obvious mistakes without being too strict.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function randomInviteCode(): string {
  const raw = crypto.randomUUID().replace(/-/g, '');
  return raw.slice(0, 12);
}

function deriveFunctionBase(args: { reqUrl: string; functionName: string }): string | null {
  const { reqUrl, functionName } = args;
  try {
    const u = new URL(reqUrl);
    const idx = u.pathname.indexOf('/functions/v1/');
    if (idx < 0) return null;
    const origin = u.origin;
    const prefix = u.pathname.slice(0, idx + '/functions/v1/'.length);
    return `${origin}${prefix}${functionName}`;
  } catch {
    return null;
  }
}

function renderEmailHtml(params: { goalTitle: string; inviteLink: string; kind: 'people' | 'buddy' | 'squad' }) {
  const title = params.goalTitle.trim() || 'Shared goal';
  const link = params.inviteLink;
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Join ${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
    <div style="max-width:560px;margin:0 auto;padding:24px;">
      <h1 style="margin:0 0 12px;font-size:22px;line-height:28px;">Join my shared goal in Kwilt</h1>
      <p style="margin:0 0 18px;font-size:16px;line-height:22px;color:#374151;">
        <strong style="color:#111827;">“${title.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}”</strong>
      </p>
      <p style="margin:0 0 18px;font-size:14px;line-height:20px;color:#6b7280;">
        By default you share signals only (check-ins + cheers). Activity titles stay private unless you choose to share them.
      </p>
      <a href="${link}" style="display:inline-block;background:#1F5226;color:#ffffff;text-decoration:none;padding:12px 16px;border-radius:12px;font-weight:700;">
        Open invite
      </a>
      <p style="margin:18px 0 0;font-size:13px;line-height:18px;color:#6b7280;">
        If the button doesn’t work, copy and paste this link into your browser:<br/>
        <a href="${link}" style="color:#1F5226;">${link}</a>
      </p>
    </div>
  </body>
</html>`;
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

  const resendKey = (Deno.env.get('RESEND_API_KEY') ?? '').trim();
  const fromEmail = (Deno.env.get('INVITE_EMAIL_FROM') ?? 'no-reply@mail.kwilt.app').trim();
  if (!resendKey) {
    return json(503, { error: { message: 'Email service unavailable', code: 'provider_unavailable' } });
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
  const goalId = typeof body?.goalId === 'string' ? body.goalId.trim() : '';
  const goalTitle = typeof body?.goalTitle === 'string' ? body.goalTitle.trim() : '';
  const rawKind = typeof body?.kind === 'string' ? body.kind.trim() : '';
  // Backward compatible: accept legacy kinds but map to unified behavior.
  const kind = rawKind === 'people' || rawKind === 'squad' || rawKind === 'buddy' ? 'people' : 'people';
  const recipientEmail = typeof body?.recipientEmail === 'string' ? body.recipientEmail.trim() : '';
  const providedInviteCode = typeof body?.inviteCode === 'string' ? body.inviteCode.trim() : '';
  const referralCode = typeof body?.referralCode === 'string' ? body.referralCode.trim() : '';

  if (!goalId || !isValidEmail(recipientEmail)) {
    return json(400, { error: { message: 'Invalid request', code: 'bad_request' } });
  }

  // Lightweight abuse cap: max N emails/day per user.
  // (We count invites created in the last 24h; this is approximate but good enough.)
  const EMAILS_PER_DAY_CAP = 25;
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from('kwilt_invites')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', userId)
      .gte('created_at', since);
    if (typeof count === 'number' && count >= EMAILS_PER_DAY_CAP) {
      return json(429, { error: { message: 'Too many invites today', code: 'rate_limited' } });
    }
  } catch {
    // best-effort only
  }

  // Ensure inviter is a member (co_owner). Idempotent.
  await admin.from('kwilt_memberships').upsert(
    {
      entity_type: 'goal',
      entity_id: goalId,
      user_id: userId,
      role: 'co_owner',
      status: 'active',
    },
    { onConflict: 'entity_type,entity_id,user_id' },
  );

  const maxUses = 25;
  const expiresDays = 14;
  const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString();

  // Prefer reusing an existing inviteCode when provided so the SMS + email channels
  // share the same link from a single share session.
  let inviteCode = '';
  if (providedInviteCode) {
    try {
      const { data: existing } = await admin
        .from('kwilt_invites')
        .select('entity_id, expires_at, max_uses, uses')
        .eq('code', providedInviteCode)
        .maybeSingle();
      const existingGoalId = (existing as any)?.entity_id as string | null;
      const existingExpiresAt = (existing as any)?.expires_at as string | null;
      const existingMaxUses = (existing as any)?.max_uses as number | null;
      const existingUses = (existing as any)?.uses as number | null;
      const isForGoal = existingGoalId ? String(existingGoalId) === goalId : false;
      const isExpired = Boolean(existingExpiresAt && Date.parse(String(existingExpiresAt)) < Date.now());
      const isConsumed =
        typeof existingUses === 'number' &&
        typeof existingMaxUses === 'number' &&
        existingUses >= existingMaxUses;
      if (isForGoal && !isExpired && !isConsumed) {
        inviteCode = providedInviteCode;
      }
    } catch {
      // ignore; we'll create a new one below
    }
  }

  if (!inviteCode) {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      inviteCode = randomInviteCode();
      const { error } = await admin.from('kwilt_invites').insert({
        entity_type: 'goal',
        entity_id: goalId,
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
  }

  if (!inviteCode) {
    return json(500, { error: { message: 'Unable to create invite', code: 'server_error' } });
  }

  const landingBase = (Deno.env.get('INVITE_LANDING_BASE_URL') ?? 'https://go.kwilt.app').trim().replace(/\/+$/, '');
  const landingUrlBase = `${landingBase}/i/${encodeURIComponent(inviteCode)}`;
  const landingUrl =
    referralCode.length > 0
      ? `${landingUrlBase}?ref=${encodeURIComponent(referralCode)}`
      : landingUrlBase;

  const redirectBase = deriveFunctionBase({ reqUrl: req.url, functionName: 'invite-redirect' });
  const inviteRedirectUrl = redirectBase ? `${redirectBase}/i/${encodeURIComponent(inviteCode)}` : null;
  const fallbackSchemeUrl = `kwilt://invite?code=${encodeURIComponent(inviteCode)}${referralCode ? `&ref=${encodeURIComponent(referralCode)}` : ''}`;
  const inviteLink = landingUrl || inviteRedirectUrl || fallbackSchemeUrl;

  const subject = `Join my shared goal in Kwilt`;
  const html = renderEmailHtml({ goalTitle, inviteLink, kind });
  const text =
    `${subject}: "${goalTitle || 'Shared goal'}"\n\n` +
    `Open invite: ${inviteLink}\n\n` +
    `By default you share signals only (check-ins + cheers). Activity titles stay private unless you choose to share them.`;

  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: recipientEmail,
      subject,
      html,
      text,
    }),
  }).catch(() => null);

  if (!resendRes) {
    return json(503, { error: { message: 'Email provider unavailable', code: 'provider_unavailable' } });
  }
  if (!resendRes.ok) {
    const bodyText = await resendRes.text().catch(() => '');
    return json(502, {
      error: {
        message: 'Email send failed',
        code: 'provider_error',
        status: resendRes.status,
        body: bodyText.slice(0, 500),
      },
    });
  }

  // Emit lightweight feed event (members-only). Best-effort.
  await admin.from('kwilt_feed_events').insert({
    entity_type: 'goal',
    entity_id: goalId,
    actor_id: userId,
    type: 'invite_emailed',
    payload: { kind },
  });

  return json(200, { ok: true });
});



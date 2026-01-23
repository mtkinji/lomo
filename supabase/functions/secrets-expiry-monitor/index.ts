// Secret expiry monitor (metadata only; does not read secret values).
//
// Intended usage:
// - Schedule this function daily in Supabase (Cron / Scheduled functions).
// - It queries `public.kwilt_secret_expirations` for the configured environment.
// - If any items are expired or within their alert window, it emails admins via Resend.
//
// Env:
// - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (required)
// - RESEND_API_KEY (required to email)
// - KWILT_SECRET_MONITOR_EMAIL_TO (CSV list) (recommended)
//   - Fallbacks: KWILT_SUPER_ADMIN_EMAILS, KWILT_ADMIN_EMAILS (CSV)
// - KWILT_SECRET_MONITOR_EMAIL_FROM (optional; fallback INVITE_EMAIL_FROM; then no-reply@kwilt.app)
// - KWILT_SECRET_MONITOR_FROM_NAME (optional; default "Kwilt")
// - KWILT_SECRET_MONITOR_ENVIRONMENT (optional; default "prod")

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildSecretExpiryAlertEmail } from '../_shared/emailTemplates.ts';

type DbRow = {
  id: string;
  display_name: string;
  secret_key: string;
  provider: string | null;
  environment: string;
  expires_at: string | null;
  alert_days_before: number;
  owner_email: string | null;
  rotation_url: string | null;
  notes: string | null;
  is_active: boolean;
  last_notified_at: string | null;
  last_notified_severity: 'warning' | 'expired' | null;
};

type AlertItem = {
  id: string;
  displayName: string;
  secretKey: string;
  provider: string | null;
  expiresAtIso: string;
  daysUntilExpiry: number;
  ownerEmail: string | null;
  rotationUrl: string | null;
  notes: string | null;
  severity: 'warning' | 'expired';
};

function csvList(raw: string | null): string[] {
  return (raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function getSupabaseAdmin() {
  const url = (Deno.env.get('SUPABASE_URL') ?? '').trim();
  const serviceRole = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim();
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
}

function clampInt(raw: unknown, fallback: number) {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.floor(n);
}

function shouldNotify(params: {
  severity: 'warning' | 'expired';
  lastNotifiedAtIso: string | null;
  lastNotifiedSeverity: 'warning' | 'expired' | null;
  nowMs: number;
}) {
  const { severity, lastNotifiedAtIso, lastNotifiedSeverity, nowMs } = params;

  // Always notify immediately when crossing into a higher severity (warning -> expired).
  if (lastNotifiedSeverity && lastNotifiedSeverity !== severity) {
    return true;
  }

  const lastMs = lastNotifiedAtIso ? Date.parse(lastNotifiedAtIso) : NaN;
  if (!Number.isFinite(lastMs)) return true;

  // Throttle repeats.
  const minHours = severity === 'expired' ? 12 : 24;
  return nowMs - lastMs >= minHours * 60 * 60 * 1000;
}

async function sendResendEmail(params: {
  resendKey: string;
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
}) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${params.resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: params.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  }).catch(() => null);

  if (!res) {
    return { ok: false as const, status: 0, body: 'network_error' };
  }
  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    return { ok: false as const, status: res.status, body: bodyText.slice(0, 800) };
  }
  return { ok: true as const };
}

serve(async (req) => {
  // Allow cron to call GET; keep POST for manual triggers.
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: { message: 'Method not allowed' } }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return new Response(JSON.stringify({ error: { message: 'Supabase not configured' } }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const env = (Deno.env.get('KWILT_SECRET_MONITOR_ENVIRONMENT') ?? 'prod').trim() || 'prod';

  const resendKey = (Deno.env.get('RESEND_API_KEY') ?? '').trim();
  const fromEmail = (
    (Deno.env.get('KWILT_SECRET_MONITOR_EMAIL_FROM') ?? '').trim() ||
    (Deno.env.get('INVITE_EMAIL_FROM') ?? '').trim() ||
    'no-reply@kwilt.app'
  ).trim();
  const fromName = (Deno.env.get('KWILT_SECRET_MONITOR_FROM_NAME') ?? 'Kwilt').trim() || 'Kwilt';
  const from = fromEmail.includes('<') ? fromEmail : `${fromName} <${fromEmail}>`;

  const recipientsPrimary = csvList(Deno.env.get('KWILT_SECRET_MONITOR_EMAIL_TO'));
  const recipientsFallbackA = csvList(Deno.env.get('KWILT_SUPER_ADMIN_EMAILS'));
  const recipientsFallbackB = csvList(Deno.env.get('KWILT_ADMIN_EMAILS'));
  const recipients =
    recipientsPrimary.length > 0
      ? recipientsPrimary
      : recipientsFallbackA.length > 0
        ? recipientsFallbackA
        : recipientsFallbackB;

  if (!resendKey) {
    return new Response(JSON.stringify({ error: { message: 'RESEND_API_KEY not set' } }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  if (!recipients || recipients.length === 0) {
    return new Response(JSON.stringify({ error: { message: 'No recipients configured' } }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data, error } = await admin
    .from('kwilt_secret_expirations')
    .select(
      'id,display_name,secret_key,provider,environment,expires_at,alert_days_before,owner_email,rotation_url,notes,is_active,last_notified_at,last_notified_severity',
    )
    .eq('environment', env)
    .eq('is_active', true);

  if (error) {
    return new Response(JSON.stringify({ error: { message: 'Query failed', detail: error.message } }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const rows = (Array.isArray(data) ? (data as DbRow[]) : []) || [];
  const nowMs = Date.now();

  const candidates: AlertItem[] = [];
  for (const r of rows) {
    const expiresAtIso = typeof r.expires_at === 'string' ? r.expires_at : null;
    if (!expiresAtIso) continue;
    const expiresMs = Date.parse(expiresAtIso);
    if (!Number.isFinite(expiresMs)) continue;

    const daysUntil = Math.floor((expiresMs - nowMs) / (24 * 60 * 60 * 1000));
    const alertDays = Math.max(0, clampInt(r.alert_days_before, 30));

    const severity: 'warning' | 'expired' | null =
      expiresMs <= nowMs ? 'expired' : daysUntil <= alertDays ? 'warning' : null;
    if (!severity) continue;

    if (
      shouldNotify({
        severity,
        lastNotifiedAtIso: typeof r.last_notified_at === 'string' ? r.last_notified_at : null,
        lastNotifiedSeverity:
          r.last_notified_severity === 'warning' || r.last_notified_severity === 'expired' ? r.last_notified_severity : null,
        nowMs,
      })
    ) {
      candidates.push({
        id: r.id,
        displayName: r.display_name,
        secretKey: r.secret_key,
        provider: r.provider ?? null,
        expiresAtIso,
        daysUntilExpiry: daysUntil,
        ownerEmail: r.owner_email ?? null,
        rotationUrl: r.rotation_url ?? null,
        notes: r.notes ?? null,
        severity,
      });
    }
  }

  if (candidates.length === 0) {
    return new Response(JSON.stringify({ ok: true, environment: env, notified: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const email = buildSecretExpiryAlertEmail({
    environment: env,
    items: candidates.map((c) => ({
      displayName: c.displayName,
      secretKey: c.secretKey,
      provider: c.provider,
      expiresAtIso: c.expiresAtIso,
      daysUntilExpiry: c.daysUntilExpiry,
      ownerEmail: c.ownerEmail,
      rotationUrl: c.rotationUrl,
      notes: c.notes,
      severity: c.severity,
    })),
  });

  const send = await sendResendEmail({
    resendKey,
    from,
    to: recipients,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  if (!send.ok) {
    return new Response(JSON.stringify({ error: { message: 'Email send failed', status: send.status, body: send.body } }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const nowIso = new Date(nowMs).toISOString();
  // Best-effort: mark notified so we can throttle repeats.
  await Promise.all(
    candidates.map((c) =>
      admin
        .from('kwilt_secret_expirations')
        .update({ last_notified_at: nowIso, last_notified_severity: c.severity, updated_at: nowIso })
        .eq('id', c.id),
    ),
  );

  return new Response(JSON.stringify({ ok: true, environment: env, notified: candidates.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});



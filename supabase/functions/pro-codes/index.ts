// Kwilt Pro codes (install-based, pre-account)
//
// Routes:
// - POST /redeem  -> { ok, alreadyRedeemed }
// - POST /status  -> { isPro, expiresAt? }
// - POST /create  -> { code } (admin-only via header secret)
//
// Called via:
//   https://<project-ref>.functions.supabase.co/functions/v1/pro-codes/<route>

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-kwilt-install-id, x-kwilt-client, x-kwilt-admin-secret',
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

function getSupabaseAnon() {
  const url = (Deno.env.get('SUPABASE_URL') ?? '').trim();
  const anon =
    (Deno.env.get('SUPABASE_ANON_KEY') ?? '').trim() ||
    (Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '').trim();
  if (!url || !anon) return null;
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function parseCsvList(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function getBearerToken(req: Request): string | null {
  const h = (req.headers.get('authorization') ?? '').trim();
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m?.[1]?.trim() ? m[1].trim() : null;
}

async function requireAdminUser(req: Request): Promise<
  | { ok: true; userId: string; email: string | null }
  | { ok: false; response: Response }
> {
  const token = getBearerToken(req);
  if (!token) {
    return { ok: false, response: json(401, { error: { message: 'Missing Authorization', code: 'unauthorized' } }) };
  }

  const anon = getSupabaseAnon();
  if (!anon) {
    return {
      ok: false,
      response: json(503, { error: { message: 'Auth unavailable', code: 'provider_unavailable' } }),
    };
  }

  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) {
    return { ok: false, response: json(401, { error: { message: 'Unauthorized', code: 'unauthorized' } }) };
  }

  const userId = String(data.user.id);
  const email = typeof data.user.email === 'string' ? data.user.email : null;
  const emailLower = email?.toLowerCase() ?? null;

  const superAdminEmails = parseCsvList(Deno.env.get('KWILT_SUPER_ADMIN_EMAILS'));
  const superAdminUserIds = parseCsvList(Deno.env.get('KWILT_SUPER_ADMIN_USER_IDS'));
  const adminEmails = parseCsvList(Deno.env.get('KWILT_ADMIN_EMAILS'));
  const adminUserIds = parseCsvList(Deno.env.get('KWILT_ADMIN_USER_IDS'));

  if (
    superAdminEmails.length === 0 &&
    superAdminUserIds.length === 0 &&
    adminEmails.length === 0 &&
    adminUserIds.length === 0
  ) {
    return {
      ok: false,
      response: json(403, { error: { message: 'Admin not configured', code: 'forbidden' } }),
    };
  }

  const isSuperAdmin =
    superAdminUserIds.includes(userId) ||
    (emailLower ? superAdminEmails.map((e) => e.toLowerCase()).includes(emailLower) : false);

  const isAdmin =
    isSuperAdmin ||
    adminUserIds.includes(userId) ||
    (emailLower ? adminEmails.map((e) => e.toLowerCase()).includes(emailLower) : false);

  if (!isAdmin) {
    return { ok: false, response: json(403, { error: { message: 'Forbidden', code: 'forbidden' } }) };
  }

  return { ok: true, userId, email };
}

async function requireSuperAdminUser(req: Request): Promise<
  | { ok: true; userId: string; email: string | null }
  | { ok: false; response: Response }
> {
  const token = getBearerToken(req);
  if (!token) {
    return { ok: false, response: json(401, { error: { message: 'Missing Authorization', code: 'unauthorized' } }) };
  }

  const anon = getSupabaseAnon();
  if (!anon) {
    return {
      ok: false,
      response: json(503, { error: { message: 'Auth unavailable', code: 'provider_unavailable' } }),
    };
  }

  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) {
    return { ok: false, response: json(401, { error: { message: 'Unauthorized', code: 'unauthorized' } }) };
  }

  const userId = String(data.user.id);
  const email = typeof data.user.email === 'string' ? data.user.email : null;
  const emailLower = email?.toLowerCase() ?? null;

  const superAdminEmails = parseCsvList(Deno.env.get('KWILT_SUPER_ADMIN_EMAILS'));
  const superAdminUserIds = parseCsvList(Deno.env.get('KWILT_SUPER_ADMIN_USER_IDS'));
  if (superAdminEmails.length === 0 && superAdminUserIds.length === 0) {
    return {
      ok: false,
      response: json(403, { error: { message: 'Super admin not configured', code: 'forbidden' } }),
    };
  }

  const isSuperAdmin =
    superAdminUserIds.includes(userId) ||
    (emailLower ? superAdminEmails.map((e) => e.toLowerCase()).includes(emailLower) : false);

  if (!isSuperAdmin) {
    return { ok: false, response: json(403, { error: { message: 'Forbidden', code: 'forbidden' } }) };
  }

  return { ok: true, userId, email };
}

function deriveAdminRole(params: { userId: string; emailLower: string | null }): 'super_admin' | 'admin' | 'none' {
  const { userId, emailLower } = params;
  const superAdminEmails = parseCsvList(Deno.env.get('KWILT_SUPER_ADMIN_EMAILS')).map((e) => e.toLowerCase());
  const superAdminUserIds = parseCsvList(Deno.env.get('KWILT_SUPER_ADMIN_USER_IDS'));
  const adminEmails = parseCsvList(Deno.env.get('KWILT_ADMIN_EMAILS')).map((e) => e.toLowerCase());
  const adminUserIds = parseCsvList(Deno.env.get('KWILT_ADMIN_USER_IDS'));

  const isSuper =
    superAdminUserIds.includes(userId) || (emailLower ? superAdminEmails.includes(emailLower) : false);
  if (isSuper) return 'super_admin';
  const isAdmin = adminUserIds.includes(userId) || (emailLower ? adminEmails.includes(emailLower) : false);
  return isAdmin ? 'admin' : 'none';
}

function normalizeCode(input: string): string {
  // Accept codes with spaces/dashes; normalize to lowercase alphanumerics + dashes removed.
  return input.trim().replace(/\s+/g, '').replace(/-/g, '').toLowerCase();
}

function randomProCode(): string {
  // Human-friendly-ish: 20 chars, grouped 5-5-5-5.
  // Not stored plaintext; server hashes it via SQL fn on insert (or we hash client-side on redeem).
  const raw = crypto.randomUUID().replace(/-/g, '');
  const token = raw.slice(0, 20).toUpperCase();
  return `${token.slice(0, 5)}-${token.slice(5, 10)}-${token.slice(10, 15)}-${token.slice(15, 20)}`;
}

async function isProForQuotaKey(admin: any, quotaKey: string): Promise<{ isPro: boolean; expiresAt: string | null }> {
  const { data, error } = await admin
    .from('kwilt_pro_entitlements')
    .select('is_pro, expires_at')
    .eq('quota_key', quotaKey)
    .maybeSingle();
  if (error || !data) return { isPro: false, expiresAt: null };
  const isPro = Boolean((data as any).is_pro);
  const expiresAt = typeof (data as any).expires_at === 'string' ? ((data as any).expires_at as string) : null;
  if (!isPro) return { isPro: false, expiresAt };
  if (expiresAt && Number.isFinite(Date.parse(expiresAt)) && Date.parse(expiresAt) < Date.now()) {
    return { isPro: false, expiresAt };
  }
  return { isPro: true, expiresAt };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json(405, { error: { message: 'Method not allowed', code: 'method_not_allowed' } });
  }

  const url = new URL(req.url);
  const fullPath = url.pathname;
  const marker = '/pro-codes';
  const idx = fullPath.indexOf(marker);
  const route = idx >= 0 ? fullPath.slice(idx + marker.length) : fullPath;

  const admin = getSupabaseAdmin();
  if (!admin) {
    return json(503, { error: { message: 'Pro codes service unavailable', code: 'provider_unavailable' } });
  }

  const installId = (req.headers.get('x-kwilt-install-id') ?? '').trim();
  const quotaKey = installId ? `install:${installId}` : '';

  if (route === '/admin/status') {
    const check = await requireAdminUser(req);
    if (!check.ok) return check.response;
    const role = deriveAdminRole({ userId: check.userId, emailLower: (check.email ?? '').toLowerCase() || null });
    return json(200, {
      isAdmin: true,
      isSuperAdmin: role === 'super_admin',
      role,
      userId: check.userId,
      email: check.email,
    });
  }

  if (route === '/status') {
    if (!installId) {
      return json(400, { error: { message: 'Missing x-kwilt-install-id', code: 'bad_request' } });
    }
    const status = await isProForQuotaKey(admin, quotaKey);
    return json(200, { isPro: status.isPro, expiresAt: status.expiresAt });
  }

  if (route === '/redeem') {
    if (!installId) {
      return json(400, { error: { message: 'Missing x-kwilt-install-id', code: 'bad_request' } });
    }
    const body = await req.json().catch(() => null);
    const raw = typeof body?.code === 'string' ? body.code : '';
    const code = normalizeCode(raw);
    if (!code) {
      return json(400, { error: { message: 'Missing code', code: 'bad_request' } });
    }

    const { data, error } = await admin.rpc('kwilt_redeem_pro_code', {
      p_code: code,
      p_quota_key: quotaKey,
    });

    if (error) {
      return json(503, { error: { message: 'Unable to redeem code', code: 'provider_unavailable' } });
    }

    // Supabase RPC returns rows for table returns; accept either array or object.
    const row = Array.isArray(data) ? data[0] : data;
    const ok = Boolean(row?.ok);
    const alreadyRedeemed = Boolean(row?.already_redeemed);
    const message = typeof row?.message === 'string' ? row.message : null;
    if (!ok) {
      return json(400, { error: { message: message ?? 'Invalid code', code: 'bad_request' } });
    }

    return json(200, { ok: true, alreadyRedeemed });
  }

  if (route === '/create') {
    // Admin-only: allow either (A) shared secret header for scripts or
    // (B) authenticated Supabase user on allowlist (for in-app admin UI).
    const required = (Deno.env.get('KWILT_PRO_CODE_ADMIN_SECRET') ?? '').trim();
    const provided = (req.headers.get('x-kwilt-admin-secret') ?? '').trim();
    const hasSecretAuth = Boolean(required && provided && provided === required);
    if (!hasSecretAuth) {
      const check = await requireAdminUser(req);
      if (!check.ok) return check.response;
    }

    const body = await req.json().catch(() => ({}));
    const maxUsesRaw = typeof body?.maxUses === 'number' ? body.maxUses : 1;
    const maxUses = Number.isFinite(maxUsesRaw) ? Math.max(1, Math.floor(maxUsesRaw)) : 1;
    const expiresAt = typeof body?.expiresAt === 'string' ? body.expiresAt : null;
    const note = typeof body?.note === 'string' ? body.note : null;

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const code = randomProCode();
      const normalized = normalizeCode(code);
      const { data: hashData, error: hashErr } = await admin.rpc('kwilt_hash_pro_code', { p_code: normalized });
      const codeHash = typeof hashData === 'string' ? hashData : null;
      if (hashErr || !codeHash) {
        return json(503, { error: { message: 'Unable to create code', code: 'provider_unavailable' } });
      }

      const { error } = await admin.from('kwilt_pro_codes').insert({
        code_hash: codeHash,
        max_uses: maxUses,
        expires_at: expiresAt,
        note,
      });
      if (!error) {
        return json(200, { code });
      }
    }

    return json(500, { error: { message: 'Unable to create code', code: 'server_error' } });
  }

  if (route === '/admin/send') {
    // Super-admin only: send an existing code via email or SMS.
    const check = await requireSuperAdminUser(req);
    if (!check.ok) return check.response;

    const body = await req.json().catch(() => null);
    const channel = typeof body?.channel === 'string' ? body.channel.trim().toLowerCase() : '';
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    const recipientEmail = typeof body?.recipientEmail === 'string' ? body.recipientEmail.trim() : '';
    const recipientPhone = typeof body?.recipientPhone === 'string' ? body.recipientPhone.trim() : '';
    const note = typeof body?.note === 'string' ? body.note.trim() : '';
    const fromName = (Deno.env.get('KWILT_PRO_CODE_FROM_NAME') ?? 'Kwilt').trim();

    if (!code) {
      return json(400, { error: { message: 'Missing code', code: 'bad_request' } });
    }

    const subject = 'Your Kwilt Pro access code';
    const message =
      `Here’s your Kwilt Pro access code:\n\n${code}\n\n` +
      `Open Kwilt → Settings → Redeem Pro code.\n` +
      (note ? `\nNote: ${note}\n` : '');

    if (channel === 'email') {
      const resendKey = (Deno.env.get('RESEND_API_KEY') ?? '').trim();
      const fromEmail = (Deno.env.get('PRO_CODE_EMAIL_FROM') ?? 'no-reply@mail.kwilt.app').trim();
      if (!resendKey) {
        return json(503, { error: { message: 'Email service unavailable', code: 'provider_unavailable' } });
      }
      if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
        return json(400, { error: { message: 'Invalid recipientEmail', code: 'bad_request' } });
      }

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${fromName} <${fromEmail}>`,
          to: recipientEmail,
          subject,
          text: message,
        }),
      }).catch(() => null);

      if (!resendRes) {
        return json(503, { error: { message: 'Email provider unavailable', code: 'provider_unavailable' } });
      }
      if (!resendRes.ok) {
        const bodyText = await resendRes.text().catch(() => '');
        return json(502, {
          error: { message: 'Email send failed', code: 'provider_error', status: resendRes.status, body: bodyText.slice(0, 500) },
        });
      }
      return json(200, { ok: true });
    }

    if (channel === 'sms' || channel === 'text') {
      const sid = (Deno.env.get('TWILIO_ACCOUNT_SID') ?? '').trim();
      const token = (Deno.env.get('TWILIO_AUTH_TOKEN') ?? '').trim();
      const from = (Deno.env.get('TWILIO_FROM_NUMBER') ?? '').trim();
      if (!sid || !token || !from) {
        return json(503, { error: { message: 'SMS service unavailable', code: 'provider_unavailable' } });
      }
      if (!recipientPhone) {
        return json(400, { error: { message: 'Missing recipientPhone', code: 'bad_request' } });
      }

      const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`;
      const auth = btoa(`${sid}:${token}`);
      const form = new URLSearchParams();
      form.set('To', recipientPhone);
      form.set('From', from);
      form.set('Body', message);

      const twilioRes = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      }).catch(() => null);

      if (!twilioRes) {
        return json(503, { error: { message: 'SMS provider unavailable', code: 'provider_unavailable' } });
      }
      if (!twilioRes.ok) {
        const bodyText = await twilioRes.text().catch(() => '');
        return json(502, {
          error: { message: 'SMS send failed', code: 'provider_error', status: twilioRes.status, body: bodyText.slice(0, 500) },
        });
      }
      return json(200, { ok: true });
    }

    return json(400, { error: { message: 'Invalid channel (use email|sms)', code: 'bad_request' } });
  }

  return json(404, { error: { message: 'Not found', code: 'not_found' } });
});





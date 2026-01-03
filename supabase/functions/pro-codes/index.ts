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
  // Prefer deriving the project URL from the request host so we don't accidentally
  // validate JWTs against the wrong Supabase project (a common source of 401 Unauthorized
  // when multiple environments/custom domains exist).
  //
  // - https://<project-ref>.functions.supabase.co/... -> https://<project-ref>.supabase.co
  // - https://auth.custom-domain.tld/...             -> https://auth.custom-domain.tld
  function deriveUrlFromReq(req: Request): string | null {
    try {
      const u = new URL(req.url);
      const host = (u.hostname ?? '').trim();
      if (!host) return null;
      const fnSuffix = '.functions.supabase.co';
      if (host.endsWith(fnSuffix)) {
        const projectRef = host.slice(0, -fnSuffix.length);
        return projectRef ? `https://${projectRef}.supabase.co` : null;
      }
      // If the request is coming through a custom domain (or already on *.supabase.co),
      // use that as the base.
      return `${u.protocol}//${host}`;
    } catch {
      return null;
    }
  }

  // NOTE: these helpers are hoisted per invocation, but still safe.
  const url = null as unknown as string;
  // (patched below; see getSupabaseAdminFromReq)
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceRole) return null;
  return {
    deriveUrlFromReq,
    serviceRole,
  };
}

function getSupabaseAdminFromReq(req: Request) {
  const base = getSupabaseAdmin();
  if (!base) return null;
  const url = base.deriveUrlFromReq(req) ?? (Deno.env.get('SUPABASE_URL') ?? '').trim();
  if (!url) return null;
  return createClient(url, base.serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getSupabaseAnonFromReq(req: Request) {
  let url = '';
  try {
    const u = new URL(req.url);
    const host = (u.hostname ?? '').trim();
    const fnSuffix = '.functions.supabase.co';
    if (host && host.endsWith(fnSuffix)) {
      const projectRef = host.slice(0, -fnSuffix.length);
      url = projectRef ? `https://${projectRef}.supabase.co` : '';
    } else if (host) {
      url = `${u.protocol}//${host}`;
    }
  } catch {
    url = '';
  }
  if (!url) {
    url = (Deno.env.get('SUPABASE_URL') ?? '').trim();
  }
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

async function getUserFromBearer(req: Request): Promise<{ userId: string; email: string | null } | null> {
  const token = getBearerToken(req);
  if (!token) return null;
  const anon = getSupabaseAnonFromReq(req);
  if (!anon) return null;
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) return null;
  const userId = String(data.user.id);
  const email = typeof data.user.email === 'string' ? data.user.email : null;
  return { userId, email };
}

function addDaysIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + Math.floor(days));
  return d.toISOString();
}

async function findUserIdByEmail(admin: any, email: string): Promise<{ userId: string; email: string } | null> {
  const target = (email ?? '').trim().toLowerCase();
  if (!target) return null;
  // Best-effort: page through users using admin API. Keep bounded to avoid runaway costs.
  const perPage = 200;
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await (admin as any).auth.admin.listUsers({ page, perPage });
    if (error) return null;
    const users = Array.isArray((data as any)?.users) ? ((data as any).users as any[]) : [];
    for (const u of users) {
      const uEmail = typeof u?.email === 'string' ? u.email.trim().toLowerCase() : '';
      if (uEmail && uEmail === target) {
        const userId = typeof u?.id === 'string' ? u.id : '';
        if (userId) return { userId, email: (typeof u?.email === 'string' ? u.email : email).trim() };
      }
    }
    // If we got fewer than a full page, we’ve reached the end.
    if (users.length < perPage) break;
  }
  return null;
}

async function getProForQuotaKeys(
  admin: any,
  quotaKeys: string[],
): Promise<{ isPro: boolean; expiresAt: string | null }> {
  const keys = quotaKeys.map((k) => (k ?? '').trim()).filter(Boolean);
  if (keys.length === 0) return { isPro: false, expiresAt: null };
  const { data, error } = await admin
    .from('kwilt_pro_entitlements')
    .select('quota_key, is_pro, expires_at')
    .in('quota_key', keys);
  if (error || !Array.isArray(data)) return { isPro: false, expiresAt: null };

  let bestExpiresAt: string | null = null;
  for (const row of data as any[]) {
    const isPro = Boolean(row?.is_pro);
    if (!isPro) continue;
    const expiresAt = typeof row?.expires_at === 'string' ? row.expires_at : null;
    if (expiresAt && Number.isFinite(Date.parse(expiresAt)) && Date.parse(expiresAt) < Date.now()) {
      continue;
    }
    // Active grant. If any grant has no expiry, treat it as best (infinite).
    if (!expiresAt) return { isPro: true, expiresAt: null };
    if (!bestExpiresAt) {
      bestExpiresAt = expiresAt;
      continue;
    }
    if (Number.isFinite(Date.parse(expiresAt)) && Number.isFinite(Date.parse(bestExpiresAt))) {
      if (Date.parse(expiresAt) > Date.parse(bestExpiresAt)) bestExpiresAt = expiresAt;
    }
  }
  return { isPro: Boolean(bestExpiresAt), expiresAt: bestExpiresAt };
}

async function requireAdminUser(req: Request): Promise<
  | { ok: true; userId: string; email: string | null }
  | { ok: false; response: Response }
> {
  const token = getBearerToken(req);
  if (!token) {
    return { ok: false, response: json(401, { error: { message: 'Missing Authorization', code: 'unauthorized' } }) };
  }

  const anon = getSupabaseAnonFromReq(req);
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

  const anon = getSupabaseAnonFromReq(req);
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

  const admin = getSupabaseAdminFromReq(req);
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
    // Supports install-based status (pre-account) and optional user-based status (post-auth).
    const maybeUser = await getUserFromBearer(req);
    const keys: string[] = [];
    if (installId) keys.push(`install:${installId}`);
    if (maybeUser?.userId) keys.push(`user:${maybeUser.userId}`);
    if (keys.length === 0) {
      return json(400, { error: { message: 'Missing identity (installId or Authorization)', code: 'bad_request' } });
    }
    const status = await getProForQuotaKeys(admin, keys);
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

  if (route === '/admin/grant') {
    // Super-admin only: grant Pro for 1 year to either a user account or an install/device.
    const check = await requireSuperAdminUser(req);
    if (!check.ok) return check.response;

    const body = await req.json().catch(() => null);
    const targetType = typeof body?.targetType === 'string' ? body.targetType.trim().toLowerCase() : '';
    const installIdRaw = typeof body?.installId === 'string' ? body.installId.trim() : '';
    const emailRaw = typeof body?.email === 'string' ? body.email.trim() : '';

    let quotaKeyGrant = '';
    let resolvedUserId: string | null = null;
    let resolvedEmail: string | null = null;

    if (targetType === 'install') {
      if (!installIdRaw) {
        return json(400, { error: { message: 'Missing installId', code: 'bad_request' } });
      }
      quotaKeyGrant = `install:${installIdRaw}`;
    } else if (targetType === 'user') {
      if (!emailRaw) {
        return json(400, { error: { message: 'Missing email', code: 'bad_request' } });
      }
      const found = await findUserIdByEmail(admin, emailRaw);
      if (!found) {
        return json(404, { error: { message: 'User not found', code: 'not_found' } });
      }
      resolvedUserId = found.userId;
      resolvedEmail = found.email;
      quotaKeyGrant = `user:${found.userId}`;
    } else {
      return json(400, { error: { message: 'Invalid targetType (use user|install)', code: 'bad_request' } });
    }

    const expiresAt = addDaysIso(365);
    const now = new Date().toISOString();
    const { error } = await admin.from('kwilt_pro_entitlements').upsert(
      {
        quota_key: quotaKeyGrant,
        is_pro: true,
        source: 'admin',
        granted_at: now,
        expires_at: expiresAt,
        updated_at: now,
      },
      { onConflict: 'quota_key' },
    );

    if (error) {
      return json(503, { error: { message: 'Unable to grant Pro', code: 'provider_unavailable' } });
    }

    return json(200, {
      ok: true,
      quotaKey: quotaKeyGrant,
      expiresAt,
      userId: resolvedUserId,
      email: resolvedEmail,
    });
  }

  return json(404, { error: { message: 'Not found', code: 'not_found' } });
});





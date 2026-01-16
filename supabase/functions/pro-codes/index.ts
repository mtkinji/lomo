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
import { buildProCodeEmail, buildProGrantEmail } from '../_shared/emailTemplates.ts';

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
  // NOTE: For custom domains, some setups only front Auth/Functions, not PostgREST (RPC).
  // For service-role DB access we prefer `SUPABASE_URL` so RPCs always work.
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
      // For non-functions hosts (custom domains), fall back to SUPABASE_URL.
      return null;
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

function decodeBase64Url(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  return atob(padded);
}

function deriveSupabaseUrlFromJwtIssuer(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payloadJson = decodeBase64Url(parts[1] ?? '');
    const payload = JSON.parse(payloadJson) as { iss?: unknown };
    const iss = typeof payload?.iss === 'string' ? payload.iss.trim() : '';
    if (!iss) return null;
    const u = new URL(iss);
    const host = (u.hostname ?? '').trim();
    if (!host) return null;
    return `${u.protocol}//${host}`;
  } catch {
    return null;
  }
}

function getSupabaseAnonFromReq(req: Request) {
  // Prefer JWT issuer origin (supports Supabase custom domain setups).
  const token = getBearerToken(req);
  let url = token ? deriveSupabaseUrlFromJwtIssuer(token) ?? '' : '';
  try {
    const u = new URL(req.url);
    const host = (u.hostname ?? '').trim();
    const fnSuffix = '.functions.supabase.co';
    // Only fall back to request-host derivation if we couldn't infer from token.
    if (!url) {
      if (host && host.endsWith(fnSuffix)) {
        const projectRef = host.slice(0, -fnSuffix.length);
        url = projectRef ? `https://${projectRef}.supabase.co` : '';
      } else if (host) {
        url = `${u.protocol}//${host}`;
      }
    }
  } catch {
    // keep url as-is
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

function parseCsvList(raw: string | null | undefined): string[] {
  const v = typeof raw === 'string' ? raw : '';
  if (!v) return [];
  return v
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

type InstallPingBody = {
  revenuecatAppUserId?: string;
  platform?: string;
  appVersion?: string;
  buildNumber?: string;
  posthogDistinctId?: string;
};

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

function formatExpiresAt(iso: string): string {
  try {
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms)) return iso;
    return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
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

function deriveDisplayNameFromUser(user: any): string | null {
  if (!user) return null;
  const md = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    (typeof md.full_name === 'string' && md.full_name.trim()) ||
    (typeof md.name === 'string' && md.name.trim()) ||
    (typeof md.display_name === 'string' && md.display_name.trim()) ||
    (typeof md.preferred_username === 'string' && md.preferred_username.trim()) ||
    null;
  return name;
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

  if (route === '/webhook/revenuecat') {
    // RevenueCat webhook receiver (server-to-server).
    // Configure RevenueCat to POST here and set `REVENUECAT_WEBHOOK_SECRET` in function secrets.
    const secret = (Deno.env.get('REVENUECAT_WEBHOOK_SECRET') ?? '').trim();
    if (secret) {
      const auth = (req.headers.get('authorization') ?? '').trim();
      const ok = auth.toLowerCase() === `bearer ${secret}`.toLowerCase();
      if (!ok) {
        return json(401, { error: { message: 'Unauthorized', code: 'unauthorized' } });
      }
    }

    const payload = await req.json().catch(() => null);
    const event = (payload as any)?.event ?? (payload as any) ?? null;
    const appUserIdRaw =
      (typeof event?.app_user_id === 'string' && event.app_user_id.trim()) ||
      (typeof event?.original_app_user_id === 'string' && event.original_app_user_id.trim()) ||
      (typeof event?.subscriber?.app_user_id === 'string' && event.subscriber.app_user_id.trim()) ||
      '';
    if (!appUserIdRaw) {
      return json(400, { error: { message: 'Missing app_user_id', code: 'bad_request' } });
    }

    const type = typeof event?.type === 'string' ? event.type.trim() : '';
    const productId = typeof event?.product_id === 'string' ? event.product_id.trim() : '';

    // Normalize expiry time if present.
    let expiresAt: string | null = null;
    const expMsRaw = (event as any)?.expiration_at_ms;
    if (typeof expMsRaw === 'number' && Number.isFinite(expMsRaw) && expMsRaw > 0) {
      expiresAt = new Date(expMsRaw).toISOString();
    } else {
      const expStr =
        (typeof event?.expiration_at === 'string' && event.expiration_at.trim()) ||
        (typeof event?.expires_at === 'string' && event.expires_at.trim()) ||
        '';
      if (expStr && Number.isFinite(Date.parse(expStr))) {
        expiresAt = new Date(Date.parse(expStr)).toISOString();
      }
    }

    const nowIso = new Date().toISOString();
    const isExpired = Boolean(expiresAt && Number.isFinite(Date.parse(expiresAt)) && Date.parse(expiresAt) < Date.now());

    // Best-effort pro inference based on event type. RevenueCat sources-of-truth are their dashboards;
    // we keep this conservative and rely on expiry if provided.
    const positiveTypes = new Set([
      'INITIAL_PURCHASE',
      'RENEWAL',
      'UNCANCELLATION',
      'NON_RENEWING_PURCHASE',
      'PRODUCT_CHANGE',
      'TEST',
      'SUBSCRIPTION_PAUSED',
      'SUBSCRIPTION_RESUMED',
      'BILLING_ISSUE',
    ]);
    const negativeTypes = new Set(['CANCELLATION', 'EXPIRATION', 'REFUND', 'TRANSFER']);
    let isPro = false;
    if (negativeTypes.has(type)) {
      isPro = false;
    } else if (positiveTypes.has(type)) {
      isPro = true;
    } else {
      // Unknown event; keep current state if possible by not forcing false.
      // We'll upsert with whatever we can infer; default false.
      isPro = false;
    }

    if (isExpired) {
      isPro = false;
    }

    const { error } = await admin.from('kwilt_revenuecat_subscriptions').upsert(
      {
        revenuecat_app_user_id: appUserIdRaw,
        is_pro: Boolean(isPro),
        product_id: productId || null,
        expires_at: expiresAt,
        last_event_type: type || null,
        last_event_at: nowIso,
        updated_at: nowIso,
        raw: payload as any,
      },
      { onConflict: 'revenuecat_app_user_id' },
    );
    if (error) {
      return json(503, { error: { message: 'Unable to persist webhook', code: 'provider_unavailable' } });
    }
    return json(200, { ok: true });
  }

  if (route === '/ping') {
    if (!installId) {
      return json(400, { error: { message: 'Missing x-kwilt-install-id', code: 'bad_request' } });
    }
    const body = (await req.json().catch(() => ({}))) as InstallPingBody;
    const maybeUser = await getUserFromBearer(req);
    const now = new Date().toISOString();
    const rcId = typeof body?.revenuecatAppUserId === 'string' ? body.revenuecatAppUserId.trim() : '';
    const platform = typeof body?.platform === 'string' ? body.platform.trim() : '';
    const appVersion = typeof body?.appVersion === 'string' ? body.appVersion.trim() : '';
    const buildNumber = typeof body?.buildNumber === 'string' ? body.buildNumber.trim() : '';
    const posthogDistinctId = typeof body?.posthogDistinctId === 'string' ? body.posthogDistinctId.trim() : '';

    const { error } = await admin.from('kwilt_installs').upsert(
      {
        install_id: installId,
        last_seen_at: now,
        user_id: maybeUser?.userId ?? null,
        user_email: maybeUser?.email ?? null,
        revenuecat_app_user_id: rcId || null,
        platform: platform || null,
        app_version: appVersion || null,
        build_number: buildNumber || null,
        posthog_distinct_id: posthogDistinctId || null,
      },
      { onConflict: 'install_id' },
    );
    if (error) {
      return json(503, { error: { message: 'Unable to record install', code: 'provider_unavailable' } });
    }

    // Best-effort: persist install ↔ identity history (so Admin Tools can show shared devices / multiple accounts).
    if (maybeUser?.userId) {
      try {
        await admin.from('kwilt_install_identities').upsert(
          {
            install_id: installId,
            identity_key: `user:${maybeUser.userId}`,
            user_id: maybeUser.userId,
            user_email: maybeUser.email ?? null,
            last_seen_at: now,
          },
          { onConflict: 'install_id,identity_key' },
        );
      } catch {
        // best-effort only
      }
    } else if (maybeUser?.email) {
      try {
        await admin.from('kwilt_install_identities').upsert(
          {
            install_id: installId,
            identity_key: `email:${maybeUser.email.toLowerCase()}`,
            user_id: null,
            user_email: maybeUser.email,
            last_seen_at: now,
          },
          { onConflict: 'install_id,identity_key' },
        );
      } catch {
        // best-effort only
      }
    }
    return json(200, { ok: true });
  }

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

    const emailContent = buildProCodeEmail({ code, note });
    // Reuse the same message body for SMS/text sending.
    const message = emailContent.text;

    if (channel === 'email') {
      const resendKey = (Deno.env.get('RESEND_API_KEY') ?? '').trim();
      // Prefer a pro-code specific from, but fall back to the invite sender so one verified domain
      // can cover both systems without extra configuration.
      const fromEmail = (
        (Deno.env.get('PRO_CODE_EMAIL_FROM') ?? '').trim() ||
        (Deno.env.get('INVITE_EMAIL_FROM') ?? '').trim() ||
        'no-reply@kwilt.app'
      ).trim();
      if (!resendKey) {
        return json(503, { error: { message: 'Email service unavailable', code: 'provider_unavailable' } });
      }
      if (!fromEmail) {
        return json(503, {
          error: { message: 'Email sender not configured', code: 'provider_unavailable' },
        });
      }
      if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
        return json(400, { error: { message: 'Invalid recipientEmail', code: 'bad_request' } });
      }

      const from = fromEmail.includes('<') ? fromEmail : `${fromName} <${fromEmail}>`;
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: recipientEmail,
          subject: emailContent.subject,
          text: emailContent.text,
          html: emailContent.html,
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

    // Send email notification if we have an email address (user grants only)
    if (resolvedEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resolvedEmail)) {
      const resendKey = (Deno.env.get('RESEND_API_KEY') ?? '').trim();
      const fromEmail = (
        (Deno.env.get('PRO_CODE_EMAIL_FROM') ?? '').trim() ||
        (Deno.env.get('INVITE_EMAIL_FROM') ?? '').trim() ||
        'no-reply@kwilt.app'
      ).trim();
      const fromName = (Deno.env.get('KWILT_PRO_CODE_FROM_NAME') ?? 'Kwilt').trim();

      if (resendKey && fromEmail) {
        const emailContent = buildProGrantEmail({ expiresAtIso: expiresAt });

        const from = fromEmail.includes('<') ? fromEmail : `${fromName} <${fromEmail}>`;
        // Best-effort: don't fail the grant if email send fails
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from,
            to: resolvedEmail,
            subject: emailContent.subject,
            text: emailContent.text,
            html: emailContent.html,
          }),
        }).catch(() => {
          // Silently fail - email is best-effort notification
        });
      }
    }

    return json(200, {
      ok: true,
      quotaKey: quotaKeyGrant,
      expiresAt,
      userId: resolvedUserId,
      email: resolvedEmail,
    });
  }

  if (route === '/admin/revoke') {
    // Super-admin only: revoke a previously granted Pro entitlement (does NOT cancel RevenueCat/Apple subscriptions).
    const check = await requireSuperAdminUser(req);
    if (!check.ok) return check.response;

    const body = await req.json().catch(() => null);
    const targetType = typeof body?.targetType === 'string' ? body.targetType.trim().toLowerCase() : '';
    const installIdRaw = typeof body?.installId === 'string' ? body.installId.trim() : '';
    const emailRaw = typeof body?.email === 'string' ? body.email.trim() : '';

    let quotaKeyRevoke = '';
    let resolvedUserId: string | null = null;
    let resolvedEmail: string | null = null;

    if (targetType === 'install') {
      if (!installIdRaw) {
        return json(400, { error: { message: 'Missing installId', code: 'bad_request' } });
      }
      quotaKeyRevoke = `install:${installIdRaw}`;
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
      quotaKeyRevoke = `user:${found.userId}`;
    } else {
      return json(400, { error: { message: 'Invalid targetType (use user|install)', code: 'bad_request' } });
    }

    // We don't delete the row so the action is auditable; instead, we set is_pro=false and expire immediately.
    const now = new Date().toISOString();
    const { error } = await admin.from('kwilt_pro_entitlements').upsert(
      {
        quota_key: quotaKeyRevoke,
        is_pro: false,
        source: 'admin_revoke',
        granted_at: now,
        expires_at: now,
        updated_at: now,
      },
      { onConflict: 'quota_key' },
    );
    if (error) {
      return json(503, { error: { message: 'Unable to revoke Pro', code: 'provider_unavailable' } });
    }

    return json(200, {
      ok: true,
      quotaKey: quotaKeyRevoke,
      userId: resolvedUserId,
      email: resolvedEmail,
    });
  }

  if (route === '/admin/list-installs') {
    // Super-admin only: list devices keyed by install_id for directory UI.
    const check = await requireSuperAdminUser(req);
    if (!check.ok) return check.response;

    const body = await req.json().catch(() => ({}));
    const limitRaw = typeof (body as any)?.limit === 'number' ? (body as any).limit : 100;
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(250, Math.floor(limitRaw))) : 100;
    // Be resilient to schema drift (older deployments may not have all optional columns).
    let installs: any[] = [];
    {
      const r1 = await admin
        .from('kwilt_installs')
        .select(
          'install_id, created_at, last_seen_at, user_id, user_email, revenuecat_app_user_id, platform, app_version, build_number, posthog_distinct_id',
        )
        .order('last_seen_at', { ascending: false })
        .limit(limit);
      if (!r1.error && Array.isArray(r1.data)) {
        installs = r1.data as any[];
      } else {
        const r2 = await admin
          .from('kwilt_installs')
          .select('install_id, created_at, last_seen_at, user_id, user_email, revenuecat_app_user_id')
          .order('last_seen_at', { ascending: false })
          .limit(limit);
        if (r2.error || !Array.isArray(r2.data)) {
          return json(503, { error: { message: 'Unable to load installs', code: 'provider_unavailable' } });
        }
        installs = r2.data as any[];
      }
    }

    const installKeys = installs.map((i: any) => `install:${i.install_id}`);
    const userKeys = installs
      .map((i: any) => (typeof i?.user_id === 'string' ? `user:${i.user_id}` : ''))
      .filter(Boolean);
    const quotaKeys = Array.from(new Set([...installKeys, ...userKeys]));
    const rcIds = Array.from(
      new Set(
        installs
          .map((i: any) => (typeof i?.revenuecat_app_user_id === 'string' ? i.revenuecat_app_user_id : ''))
          .filter(Boolean),
      ),
    );

    const entByKey = new Map<string, { isPro: boolean; expiresAt: string | null; source: string | null }>();
    if (quotaKeys.length > 0) {
      const { data: ents } = await admin
        .from('kwilt_pro_entitlements')
        .select('quota_key, is_pro, expires_at, source')
        .in('quota_key', quotaKeys);
      if (Array.isArray(ents)) {
        for (const e of ents as any[]) {
          const k = typeof e?.quota_key === 'string' ? e.quota_key : '';
          if (!k) continue;
          entByKey.set(k, {
            isPro: Boolean(e?.is_pro),
            expiresAt: typeof e?.expires_at === 'string' ? e.expires_at : null,
            source: typeof e?.source === 'string' ? e.source : null,
          });
        }
      }
    }

    const rcById = new Map<string, { isPro: boolean; expiresAt: string | null; productId: string | null }>();
    if (rcIds.length > 0) {
      const { data: rcs } = await admin
        .from('kwilt_revenuecat_subscriptions')
        .select('revenuecat_app_user_id, is_pro, expires_at, product_id')
        .in('revenuecat_app_user_id', rcIds);
      if (Array.isArray(rcs)) {
        for (const r of rcs as any[]) {
          const k = typeof r?.revenuecat_app_user_id === 'string' ? r.revenuecat_app_user_id : '';
          if (!k) continue;
          rcById.set(k, {
            isPro: Boolean(r?.is_pro),
            expiresAt: typeof r?.expires_at === 'string' ? r.expires_at : null,
            productId: typeof r?.product_id === 'string' ? r.product_id : null,
          });
        }
      }
    }

    const isExpired = (expiresAt: string | null) =>
      Boolean(expiresAt && Number.isFinite(Date.parse(expiresAt)) && Date.parse(expiresAt) < Date.now());
    const pickBest = (candidates: Array<{ isPro: boolean; expiresAt: string | null; source: string }>) => {
      const active = candidates.filter((c) => c.isPro && !isExpired(c.expiresAt));
      if (active.length === 0) return { isPro: false, expiresAt: null, source: 'none' };
      // Prefer non-expiring, else latest expiry.
      const nonExp = active.find((a) => !a.expiresAt);
      if (nonExp) return nonExp;
      active.sort((a, b) => (Date.parse(b.expiresAt ?? '0') || 0) - (Date.parse(a.expiresAt ?? '0') || 0));
      return active[0];
    };

    // Best-effort: include all identities ever seen on each install.
    const identitiesByInstallId = new Map<string, Array<{ userId: string | null; userEmail: string | null; lastSeenAt: string | null }>>();
    try {
      const installIds = installs
        .map((i: any) => (typeof i?.install_id === 'string' ? i.install_id : ''))
        .filter(Boolean);
      if (installIds.length > 0) {
        const { data: ids } = await admin
          .from('kwilt_install_identities')
          .select('install_id, user_id, user_email, last_seen_at')
          .in('install_id', installIds)
          .order('last_seen_at', { ascending: false });
        if (Array.isArray(ids)) {
          for (const row of ids as any[]) {
            const id = typeof row?.install_id === 'string' ? row.install_id : '';
            if (!id) continue;
            const arr = identitiesByInstallId.get(id) ?? [];
            arr.push({
              userId: typeof row?.user_id === 'string' ? row.user_id : null,
              userEmail: typeof row?.user_email === 'string' ? row.user_email : null,
              lastSeenAt: typeof row?.last_seen_at === 'string' ? row.last_seen_at : null,
            });
            identitiesByInstallId.set(id, arr);
          }
        }
      }
    } catch {
      // ignore (table may not exist yet)
    }

    // Query credit usage for current month
    const usageByQuotaKey = new Map<string, number>();
    try {
      const now = new Date();
      const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
      if (quotaKeys.length > 0) {
        const { data: usage } = await admin
          .from('kwilt_ai_usage_monthly')
          .select('quota_key, actions_count')
          .eq('month', month)
          .in('quota_key', quotaKeys);
        if (Array.isArray(usage)) {
          for (const u of usage as any[]) {
            const k = typeof u?.quota_key === 'string' ? u.quota_key : '';
            const count = typeof u?.actions_count === 'number' ? u.actions_count : 0;
            if (k) usageByQuotaKey.set(k, count);
          }
        }
      }
    } catch {
      // ignore (table may not exist yet)
    }

    const enriched = installs.map((i: any) => {
      const installKey = `install:${i.install_id}`;
      const userKey = typeof i?.user_id === 'string' ? `user:${i.user_id}` : '';
      const entInstall = entByKey.get(installKey) ?? null;
      const entUser = userKey ? entByKey.get(userKey) ?? null : null;
      const rc = typeof i?.revenuecat_app_user_id === 'string' ? rcById.get(i.revenuecat_app_user_id) ?? null : null;

      const best = pickBest([
        ...(rc ? [{ isPro: rc.isPro, expiresAt: rc.expiresAt, source: 'revenuecat' }] : []),
        ...(entUser ? [{ isPro: entUser.isPro, expiresAt: entUser.expiresAt, source: entUser.source ?? 'entitlement' }] : []),
        ...(entInstall ? [{ isPro: entInstall.isPro, expiresAt: entInstall.expiresAt, source: entInstall.source ?? 'entitlement' }] : []),
      ]);

      // Sum credit usage from both install and user quota keys
      const installUsage = usageByQuotaKey.get(installKey) ?? 0;
      const userUsage = userKey ? usageByQuotaKey.get(userKey) ?? 0 : 0;
      const creditsUsed = installUsage + userUsage;

      return {
        installId: i.install_id,
        createdAt: i.created_at,
        lastSeenAt: i.last_seen_at,
        userId: i.user_id ?? null,
        userEmail: i.user_email ?? null,
        revenuecatAppUserId: i.revenuecat_app_user_id ?? null,
        platform: i.platform ?? null,
        appVersion: i.app_version ?? null,
        buildNumber: i.build_number ?? null,
        posthogDistinctId: i.posthog_distinct_id ?? null,
        identities: identitiesByInstallId.get(i.install_id) ?? [],
        creditsUsed,
        pro: {
          isPro: best.isPro,
          source: best.source,
          expiresAt: best.expiresAt,
          revenuecat: rc
            ? { isPro: rc.isPro, expiresAt: rc.expiresAt, productId: rc.productId }
            : { isPro: false, expiresAt: null, productId: null },
          entitlements: {
            install: entInstall ? { isPro: entInstall.isPro, expiresAt: entInstall.expiresAt, source: entInstall.source } : null,
            user: entUser ? { isPro: entUser.isPro, expiresAt: entUser.expiresAt, source: entUser.source } : null,
          },
        },
      };
    });

    return json(200, { ok: true, installs: enriched });
  }

  if (route === '/admin/list-users') {
    // Super-admin only: list signed-up users from Supabase Auth, merged with known installs + pro status.
    const check = await requireSuperAdminUser(req);
    if (!check.ok) return check.response;

    const body = await req.json().catch(() => ({}));
    const pageRaw = typeof (body as any)?.page === 'number' ? (body as any).page : 1;
    const perPageRaw = typeof (body as any)?.perPage === 'number' ? (body as any).perPage : 100;
    const page = Number.isFinite(pageRaw) ? Math.max(1, Math.floor(pageRaw)) : 1;
    const perPage = Number.isFinite(perPageRaw) ? Math.max(1, Math.min(200, Math.floor(perPageRaw))) : 100;

    const { data, error } = await (admin as any).auth.admin.listUsers({ page, perPage });
    if (error) {
      return json(503, { error: { message: 'Unable to load users', code: 'provider_unavailable' } });
    }
    const users = Array.isArray((data as any)?.users) ? ((data as any).users as any[]) : [];

    const userIds = users.map((u) => (typeof u?.id === 'string' ? u.id : '')).filter(Boolean);
    const userKeys = userIds.map((id) => `user:${id}`);

    // Load known installs for these users.
    // - `kwilt_installs` reflects the *latest* association (used for RevenueCat lookup).
    // - `kwilt_install_identities` (if present) captures history, so installsCount + lastSeenAt remain accurate
    //   even if a device has been used across multiple accounts.
    const installsByUserIdCurrent = new Map<string, any[]>();
    if (userIds.length > 0) {
      const { data: installs } = await admin
        .from('kwilt_installs')
        .select('install_id, last_seen_at, revenuecat_app_user_id, user_id')
        .in('user_id', userIds)
        .order('last_seen_at', { ascending: false });
      if (Array.isArray(installs)) {
        for (const i of installs as any[]) {
          const uid = typeof i?.user_id === 'string' ? i.user_id : null;
          if (!uid) continue;
          const arr = installsByUserIdCurrent.get(uid) ?? [];
          arr.push(i);
          installsByUserIdCurrent.set(uid, arr);
        }
      }
    }

    const installsByUserIdHistory = new Map<string, any[]>();
    if (userIds.length > 0) {
      try {
        const { data: ids } = await admin
          .from('kwilt_install_identities')
          .select('install_id, user_id, last_seen_at')
          .in('user_id', userIds)
          .order('last_seen_at', { ascending: false });
        if (Array.isArray(ids)) {
          for (const row of ids as any[]) {
            const uid = typeof row?.user_id === 'string' ? row.user_id : null;
            const installId = typeof row?.install_id === 'string' ? row.install_id : null;
            if (!uid || !installId) continue;
            const arr = installsByUserIdHistory.get(uid) ?? [];
            arr.push({
              install_id: installId,
              last_seen_at: row.last_seen_at,
              revenuecat_app_user_id: null,
              user_id: uid,
            });
            installsByUserIdHistory.set(uid, arr);
          }
        }
      } catch {
        // ignore (table may not exist yet)
      }
    }

    // Entitlements for users + installs (so Pro granted to a device still shows up on the user row).
    const entByKey = new Map<string, { isPro: boolean; expiresAt: string | null; source: string | null }>();
    const installIdsAll = Array.from(
      new Set(
        userIds
          .flatMap((uid) => (installsByUserIdCurrent.get(uid) ?? []).map((i: any) => i?.install_id))
          .filter((v) => typeof v === 'string' && v.trim().length > 0)
          .map((v) => (v as string).trim()),
      ),
    );
    const installKeys = installIdsAll.map((id) => `install:${id}`);
    const entitlementKeys = Array.from(new Set([...userKeys, ...installKeys]));

    if (entitlementKeys.length > 0) {
      const { data: ents } = await admin
        .from('kwilt_pro_entitlements')
        .select('quota_key, is_pro, expires_at, source')
        .in('quota_key', entitlementKeys);
      if (Array.isArray(ents)) {
        for (const e of ents as any[]) {
          const k = typeof e?.quota_key === 'string' ? e.quota_key : '';
          if (!k) continue;
          entByKey.set(k, {
            isPro: Boolean(e?.is_pro),
            expiresAt: typeof e?.expires_at === 'string' ? e.expires_at : null,
            source: typeof e?.source === 'string' ? e.source : null,
          });
        }
      }
    }

    const isExpired = (expiresAt: string | null) =>
      Boolean(expiresAt && Number.isFinite(Date.parse(expiresAt)) && Date.parse(expiresAt) < Date.now());
    const pickBest = (candidates: Array<{ isPro: boolean; expiresAt: string | null; source: string }>) => {
      const active = candidates.filter((c) => c.isPro && !isExpired(c.expiresAt));
      if (active.length === 0) return { isPro: false, expiresAt: null, source: 'none' };
      const nonExp = active.find((a) => !a.expiresAt);
      if (nonExp) return nonExp;
      active.sort((a, b) => (Date.parse(b.expiresAt ?? '0') || 0) - (Date.parse(a.expiresAt ?? '0') || 0));
      return active[0];
    };

    // RevenueCat status is keyed by revenuecat_app_user_id (which we only know via installs).
    const rcIds = Array.from(
      new Set(
        userIds
          .flatMap((uid) => (installsByUserIdCurrent.get(uid) ?? []).map((i: any) => i?.revenuecat_app_user_id))
          .filter((v) => typeof v === 'string' && v.trim().length > 0)
          .map((v) => (v as string).trim()),
      ),
    );
    const rcById = new Map<string, { isPro: boolean; expiresAt: string | null; productId: string | null }>();
    if (rcIds.length > 0) {
      const { data: rcs } = await admin
        .from('kwilt_revenuecat_subscriptions')
        .select('revenuecat_app_user_id, is_pro, expires_at, product_id')
        .in('revenuecat_app_user_id', rcIds);
      if (Array.isArray(rcs)) {
        for (const r of rcs as any[]) {
          const k = typeof r?.revenuecat_app_user_id === 'string' ? r.revenuecat_app_user_id : '';
          if (!k) continue;
          rcById.set(k, {
            isPro: Boolean(r?.is_pro),
            expiresAt: typeof r?.expires_at === 'string' ? r.expires_at : null,
            productId: typeof r?.product_id === 'string' ? r.product_id : null,
          });
        }
      }
    }

    // Query credit usage for current month
    const usageByQuotaKey = new Map<string, number>();
    try {
      const now = new Date();
      const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
      const allQuotaKeys = Array.from(new Set([...userKeys, ...installKeys]));
      if (allQuotaKeys.length > 0) {
        const { data: usage } = await admin
          .from('kwilt_ai_usage_monthly')
          .select('quota_key, actions_count')
          .eq('month', month)
          .in('quota_key', allQuotaKeys);
        if (Array.isArray(usage)) {
          for (const u of usage as any[]) {
            const k = typeof u?.quota_key === 'string' ? u.quota_key : '';
            const count = typeof u?.actions_count === 'number' ? u.actions_count : 0;
            if (k) usageByQuotaKey.set(k, count);
          }
        }
      }
    } catch {
      // ignore (table may not exist yet)
    }

    const enrichedUsers = users.map((u) => {
      const userId = typeof u?.id === 'string' ? u.id : '';
      const email = typeof u?.email === 'string' ? u.email : null;
      const createdAt = typeof u?.created_at === 'string' ? u.created_at : null;
      const name = deriveDisplayNameFromUser(u);
      const userKey = userId ? `user:${userId}` : '';
      const entUser = userKey ? entByKey.get(userKey) ?? null : null;
      const installsCurrent = installsByUserIdCurrent.get(userId) ?? [];
      const installsHistory = installsByUserIdHistory.get(userId) ?? installsCurrent;
      const installs = installsHistory;
      const lastSeenAt =
        installs.length > 0 && typeof installs[0]?.last_seen_at === 'string' ? installs[0].last_seen_at : null;

      const rcCandidates = installsCurrent
        .map((i: any) => (typeof i?.revenuecat_app_user_id === 'string' ? rcById.get(i.revenuecat_app_user_id) ?? null : null))
        .filter(Boolean) as Array<{ isPro: boolean; expiresAt: string | null; productId: string | null }>;

      const entInstallCandidates = installs
        .map((i: any) => (typeof i?.install_id === 'string' ? entByKey.get(`install:${i.install_id}`) ?? null : null))
        .filter(Boolean) as Array<{ isPro: boolean; expiresAt: string | null; source: string | null }>;

      const best = pickBest([
        ...rcCandidates.map((r) => ({ isPro: r.isPro, expiresAt: r.expiresAt, source: 'revenuecat' })),
        ...(entUser ? [{ isPro: entUser.isPro, expiresAt: entUser.expiresAt, source: entUser.source ?? 'entitlement' }] : []),
        ...entInstallCandidates.map((e) => ({ isPro: e.isPro, expiresAt: e.expiresAt, source: e.source ?? 'entitlement' })),
      ]);

      // Sum credit usage from user quota key and all install quota keys
      const userUsage = userKey ? usageByQuotaKey.get(userKey) ?? 0 : 0;
      const installUsage = installs.reduce((sum, i: any) => {
        const installId = typeof i?.install_id === 'string' ? i.install_id : '';
        if (!installId) return sum;
        return sum + (usageByQuotaKey.get(`install:${installId}`) ?? 0);
      }, 0);
      const creditsUsed = userUsage + installUsage;

      return {
        userId,
        email,
        name,
        createdAt,
        lastSeenAt,
        installsCount: installs.length,
        installIds: Array.from(
          new Set(
            installs
              .map((i: any) => (typeof i?.install_id === 'string' ? i.install_id : ''))
              .filter(Boolean),
          ),
        ).slice(0, 5),
        creditsUsed,
        pro: {
          isPro: best.isPro,
          source: best.source,
          expiresAt: best.expiresAt,
          entitlement: entUser ? { isPro: entUser.isPro, expiresAt: entUser.expiresAt, source: entUser.source } : null,
        },
      };
    });

    return json(200, { ok: true, page, perPage, users: enrichedUsers });
  }

  if (route === '/admin/use-summary') {
    // Super-admin only: fetch a small user-level usage summary (e.g. last 7 days) for Admin Tools.
    const check = await requireSuperAdminUser(req);
    if (!check.ok) return check.response;

    const body = await req.json().catch(() => null);
    const userIdRaw = typeof body?.userId === 'string' ? body.userId.trim() : '';
    const installIdsRaw = Array.isArray(body?.installIds) ? body.installIds : [];
    const windowDaysRaw = typeof body?.windowDays === 'number' ? body.windowDays : 7;

    if (!userIdRaw) {
      return json(400, { error: { message: 'Missing userId', code: 'bad_request' } });
    }

    const windowDays = Number.isFinite(windowDaysRaw) ? Math.max(1, Math.min(90, Math.floor(windowDaysRaw))) : 7;
    const installIds = installIdsRaw
      .filter((x: any) => typeof x === 'string')
      .map((x: string) => x.trim())
      .filter(Boolean)
      .slice(0, 25);

    const { data, error } = await admin.rpc('kwilt_admin_use_summary', {
      p_user_id: userIdRaw,
      p_install_ids: installIds,
      p_window_days: windowDays,
    });
    if (error) {
      const details =
        (typeof (error as any)?.details === 'string' && (error as any).details) ||
        (typeof (error as any)?.hint === 'string' && (error as any).hint) ||
        '';
      const msg = (typeof (error as any)?.message === 'string' && (error as any).message.trim()) || 'RPC failed';
      return json(503, {
        error: {
          message: `Unable to load use summary: ${msg}${details ? ` (${details})` : ''}`,
          code: 'provider_unavailable',
        },
      });
    }
    const summary = Array.isArray(data) ? (data[0] ?? null) : data ?? null;
    return json(200, { ok: true, summary });
  }

  if (route === '/admin/adoption-metrics') {
    // Super-admin only: fetch aggregate platform metrics for the admin dashboard.
    const check = await requireSuperAdminUser(req);
    if (!check.ok) return check.response;

    const body = await req.json().catch(() => null);
    const timePeriodRaw = typeof body?.timePeriod === 'string' ? body.timePeriod.trim() : 'all_time';
    
    type TimePeriod = 'all_time' | 'this_year' | 'this_quarter' | 'this_month' | 'this_week';
    const validPeriods: TimePeriod[] = ['all_time', 'this_year', 'this_quarter', 'this_month', 'this_week'];
    const timePeriod: TimePeriod = validPeriods.includes(timePeriodRaw as TimePeriod) 
      ? (timePeriodRaw as TimePeriod) 
      : 'all_time';

    // Calculate date boundaries based on time period
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date = now;

    switch (timePeriod) {
      case 'this_week': {
        // Start of current week (Sunday)
        const dayOfWeek = now.getUTCDay();
        periodStart = new Date(now);
        periodStart.setUTCDate(now.getUTCDate() - dayOfWeek);
        periodStart.setUTCHours(0, 0, 0, 0);
        break;
      }
      case 'this_month': {
        periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        break;
      }
      case 'this_quarter': {
        const quarter = Math.floor(now.getUTCMonth() / 3);
        periodStart = new Date(Date.UTC(now.getUTCFullYear(), quarter * 3, 1));
        break;
      }
      case 'this_year': {
        periodStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
        break;
      }
      case 'all_time':
      default: {
        periodStart = new Date(Date.UTC(2020, 0, 1)); // A date before the app existed
        break;
      }
    }

    const periodStartIso = periodStart.toISOString();
    const periodEndIso = periodEnd.toISOString();

    // Collect metrics from various tables
    try {
      // User metrics - count unique users from kwilt_installs (auth.users can't be queried via PostgREST)
      // Get all distinct user_ids from installs to count total users
      const { data: allUserInstalls } = await admin
        .from('kwilt_installs')
        .select('user_id, created_at')
        .not('user_id', 'is', null);
      
      const allUserIds = new Set((allUserInstalls ?? []).map((i: any) => i.user_id).filter(Boolean));
      const totalUsers = allUserIds.size;

      // Users in period - count users whose first install was created in the period
      const userFirstSeen = new Map<string, string>();
      for (const install of allUserInstalls ?? []) {
        const userId = (install as any)?.user_id;
        const createdAt = (install as any)?.created_at;
        if (!userId || !createdAt) continue;
        const existing = userFirstSeen.get(userId);
        if (!existing || createdAt < existing) {
          userFirstSeen.set(userId, createdAt);
        }
      }
      let usersInPeriod = 0;
      for (const [_userId, firstSeen] of userFirstSeen) {
        if (firstSeen >= periodStartIso && firstSeen <= periodEndIso) {
          usersInPeriod++;
        }
      }

      // Active users in the last 7 days of the period
      const wauStart = new Date(periodEnd);
      wauStart.setUTCDate(wauStart.getUTCDate() - 7);
      const { data: activeInstalls } = await admin
        .from('kwilt_installs')
        .select('user_id')
        .gte('last_seen_at', wauStart.toISOString())
        .lte('last_seen_at', periodEndIso)
        .not('user_id', 'is', null);
      const weeklyActiveUsers = new Set((activeInstalls ?? []).map((i: any) => i.user_id).filter(Boolean)).size;

      // Pro users
      const { count: proUsers } = await admin
        .from('kwilt_pro_entitlements')
        .select('*', { count: 'exact', head: true })
        .eq('is_pro', true)
        .or(`expires_at.is.null,expires_at.gt.${now.toISOString()}`);

      // Arcs created in period
      const { count: arcsCreated } = await admin
        .from('kwilt_arcs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', periodStartIso)
        .lte('created_at', periodEndIso)
        .or('deleted_at.is.null');

      // Goals created in period
      const { count: goalsCreated } = await admin
        .from('kwilt_goals')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', periodStartIso)
        .lte('created_at', periodEndIso)
        .or('deleted_at.is.null');

      // Activities created in period
      const { count: activitiesCreated } = await admin
        .from('kwilt_activities')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', periodStartIso)
        .lte('created_at', periodEndIso)
        .or('deleted_at.is.null');

      // Check-ins in period
      const { count: checkinsCompleted } = await admin
        .from('goal_checkins')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', periodStartIso)
        .lte('created_at', periodEndIso);

      // Focus sessions in period (table may not exist yet - returns 0)
      let focusSessionsCompleted: number | null = 0;

      // AI usage metrics
      // Sum from monthly usage table (has both actions_count and tokens_count)
      let aiActionsTotal = 0;
      let aiSpendCents = 0;
      
      // Get month range for the period (YYYY-MM format)
      const periodStartMonth = periodStartIso.slice(0, 7);
      const periodEndMonth = periodEndIso.slice(0, 7);
      
      // Query monthly usage for better accuracy (includes token counts)
      const { data: monthlyUsage } = await admin
        .from('kwilt_ai_usage_monthly')
        .select('actions_count, tokens_count')
        .gte('month', periodStartMonth)
        .lte('month', periodEndMonth);
      
      let totalTokens = 0;
      if (Array.isArray(monthlyUsage)) {
        for (const row of monthlyUsage) {
          aiActionsTotal += typeof (row as any)?.actions_count === 'number' ? (row as any).actions_count : 0;
          totalTokens += typeof (row as any)?.tokens_count === 'number' ? (row as any).tokens_count : 0;
        }
      }
      
      // Calculate spend based on tokens if available, otherwise estimate from actions
      // Average GPT-4 pricing: ~$0.03/1K input + ~$0.06/1K output ≈ $0.04/1K tokens blended
      // We also fall back to daily table if monthly is empty (for backwards compatibility)
      if (totalTokens > 0) {
        // Token-based cost: ~$0.04 per 1000 tokens (4 cents per 1K)
        aiSpendCents = Math.round((totalTokens / 1000) * 4);
      } else {
        // Fall back to daily table for action count if monthly data is empty
        const periodStartDate = periodStartIso.split('T')[0];
        const periodEndDate = periodEndIso.split('T')[0];
        const { data: dailyUsage } = await admin
          .from('kwilt_ai_usage_daily')
          .select('count')
          .gte('day', periodStartDate)
          .lte('day', periodEndDate);
        
        if (Array.isArray(dailyUsage) && aiActionsTotal === 0) {
          aiActionsTotal = dailyUsage.reduce((sum, row: any) => {
            return sum + (typeof row?.count === 'number' ? row.count : 0);
          }, 0);
        }
        // Rough cost estimate: ~$0.02 per AI action (typical request uses ~500 tokens)
        aiSpendCents = Math.round(aiActionsTotal * 2);
      }

      // Activated users (users who have created at least one arc, goal, or activity)
      // This is an approximation - real activation may require joining multiple tables
      const { data: usersWithArcs } = await admin
        .from('kwilt_arcs')
        .select('user_id')
        .or('deleted_at.is.null');
      const { data: usersWithGoals } = await admin
        .from('kwilt_goals')
        .select('user_id')
        .or('deleted_at.is.null');
      const { data: usersWithActivities } = await admin
        .from('kwilt_activities')
        .select('user_id')
        .or('deleted_at.is.null');
      
      const activatedUserIds = new Set<string>();
      for (const row of usersWithArcs ?? []) {
        if (typeof (row as any)?.user_id === 'string') activatedUserIds.add((row as any).user_id);
      }
      for (const row of usersWithGoals ?? []) {
        if (typeof (row as any)?.user_id === 'string') activatedUserIds.add((row as any).user_id);
      }
      for (const row of usersWithActivities ?? []) {
        if (typeof (row as any)?.user_id === 'string') activatedUserIds.add((row as any).user_id);
      }
      const activatedUsers = activatedUserIds.size;

      const aiActionsPerActiveUser = weeklyActiveUsers > 0 ? aiActionsTotal / weeklyActiveUsers : 0;

      // User locations from activities with location data
      // Extract distinct locations and cluster by approximate area
      const { data: activitiesWithLocation } = await admin
        .from('kwilt_activities')
        .select('user_id, data')
        .not('data->location', 'is', null);

      type LocationPoint = {
        lat: number;
        lon: number;
        count: number;
        city?: string;
        region?: string;
        country?: string;
      };

      // Cluster locations by rounding to ~10km grid for privacy
      const locationClusters = new Map<string, LocationPoint>();
      for (const row of activitiesWithLocation ?? []) {
        const data = (row as any)?.data;
        const loc = data?.location;
        if (!loc || typeof loc.latitude !== 'number' || typeof loc.longitude !== 'number') continue;

        // Round to 1 decimal place (~11km grid)
        const roundedLat = Math.round(loc.latitude * 10) / 10;
        const roundedLon = Math.round(loc.longitude * 10) / 10;
        const key = `${roundedLat},${roundedLon}`;

        const existing = locationClusters.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          locationClusters.set(key, {
            lat: roundedLat,
            lon: roundedLon,
            count: 1,
            city: typeof loc.label === 'string' ? loc.label : undefined,
          });
        }
      }

      // Convert to array and sort by count (hotspots first)
      const userLocations = Array.from(locationClusters.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 50); // Limit to top 50 locations

      const metrics = {
        timePeriod,
        periodStartIso,
        periodEndIso,
        aiSpend: aiSpendCents,
        userAcquisition: timePeriod === 'all_time' ? totalUsers : usersInPeriod,
        weeklyActiveUsers,
        totalUsers,
        activatedUsers,
        proUsers: proUsers ?? 0,
        arcsCreated: arcsCreated ?? 0,
        goalsCreated: goalsCreated ?? 0,
        activitiesCreated: activitiesCreated ?? 0,
        checkinsCompleted: checkinsCompleted ?? 0,
        focusSessionsCompleted: focusSessionsCompleted ?? 0,
        aiActionsTotal,
        aiActionsPerActiveUser,
        userLocations,
        computedAtIso: now.toISOString(),
      };

      return json(200, { ok: true, metrics });
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'Unable to compute metrics';
      return json(503, { error: { message: msg, code: 'provider_unavailable' } });
    }
  }

  return json(404, { error: { message: 'Not found', code: 'not_found' } });
});





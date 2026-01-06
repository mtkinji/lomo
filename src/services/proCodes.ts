import { getEnvVar, getSupabaseUrl } from '../utils/getEnv';
import { getInstallId } from './installId';
import { setProCodeOverrideEnabled } from './entitlements';
import { useEntitlementsStore } from '../store/useEntitlementsStore';
import { useToastStore } from '../store/useToastStore';
import { getAccessToken, ensureSignedInWithPrompt } from './backend/auth';
import { getSupabaseClient } from './backend/supabaseClient';

const AI_PROXY_BASE_URL_RAW = getEnvVar<string>('aiProxyBaseUrl');
const AI_PROXY_BASE_URL =
  typeof AI_PROXY_BASE_URL_RAW === 'string' ? AI_PROXY_BASE_URL_RAW.trim().replace(/\/+$/, '') : undefined;

function decodeBase64Url(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyGlobal = globalThis as any;
  if (typeof anyGlobal?.atob === 'function') return anyGlobal.atob(padded);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (typeof (anyGlobal?.Buffer as any)?.from === 'function') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (anyGlobal.Buffer as any).from(padded, 'base64').toString('utf8');
  }
  throw new Error('No base64 decoder available');
}

function deriveFunctionsProCodesBaseFromJwt(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payloadJson = decodeBase64Url(parts[1] ?? '');
    const payload = JSON.parse(payloadJson) as { iss?: unknown };
    const iss = typeof payload?.iss === 'string' ? payload.iss.trim() : '';
    if (!iss) return null;
    const u = new URL(iss);
    const host = (u.hostname ?? '').trim();
    const suffix = '.supabase.co';
    if (!host.endsWith(suffix)) return null;
    const projectRef = host.slice(0, -suffix.length);
    if (!projectRef) return null;
    return `https://${projectRef}.functions.supabase.co/functions/v1/pro-codes`;
  } catch {
    return null;
  }
}

function getProCodesBaseUrlForHeaders(headers?: Headers | null): string | null {
  const auth = (headers?.get('Authorization') ?? headers?.get('authorization') ?? '').trim();
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  const token = m?.[1]?.trim() ?? '';
  const derived = token ? deriveFunctionsProCodesBaseFromJwt(token) : null;
  return derived ?? getProCodesBaseUrl();
}

function getProCodesBaseUrl(): string | null {
  // Fallback: derive from Supabase project URL if aiProxyBaseUrl isn't set in this build.
  // supabaseUrl format: https://<project-ref>.supabase.co
  const supabaseUrl = getSupabaseUrl()?.trim();
  if (!supabaseUrl) return null;
  try {
    const u = new URL(supabaseUrl);
    const host = u.hostname ?? '';
    const suffix = '.supabase.co';
    // If we're using a custom domain (e.g. https://auth.kwilt.app), prefer hitting Edge
    // Functions through the same base URL so the JWT issuer/validation matches.
    // (Expo Go/dev builds can otherwise see 401 Unauthorized from auth.getUser.)
    if (!host.endsWith(suffix)) {
      const normalized = supabaseUrl.replace(/\/+$/, '');
      return `${normalized}/functions/v1/pro-codes`;
    }

    // Standard Supabase URL (project-ref).supabase.co -> (project-ref).functions.supabase.co
    const projectRef = host.slice(0, -suffix.length);
    if (!projectRef) return null;
    return `https://${projectRef}.functions.supabase.co/functions/v1/pro-codes`;
  } catch {
    return null;
  }
}

async function buildEdgeHeaders(): Promise<Headers> {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('x-kwilt-client', 'kwilt-mobile');
  const supabaseKey = getEnvVar<string>('supabasePublishableKey')?.trim();
  if (supabaseKey) {
    headers.set('apikey', supabaseKey);
  }
  const installId = await getInstallId();
  headers.set('x-kwilt-install-id', installId);
  return headers;
}

async function buildAuthedAdminHeaders(): Promise<Headers> {
  // Ensure the user is signed in so we can attach a JWT for admin authorization.
  const session = await ensureSignedInWithPrompt('admin');
  const token = (session as any)?.access_token ?? (await getAccessToken());
  if (!token) {
    throw new Error('Missing session token');
  }
  const headers = await buildEdgeHeaders();
  headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

async function buildMaybeAuthedHeaders(): Promise<Headers> {
  const token = await getAccessToken().catch(() => null);
  const headers = await buildEdgeHeaders();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

export async function redeemProCode(code: string): Promise<{ alreadyRedeemed: boolean }> {
  const base = getProCodesBaseUrl();
  if (!base) {
    throw new Error('Pro codes service not configured');
  }

  const res = await fetch(`${base}/redeem`, {
    method: 'POST',
    headers: await buildEdgeHeaders(),
    body: JSON.stringify({ code }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = typeof data?.error?.message === 'string' ? data.error.message : 'Unable to redeem code';
    throw new Error(msg);
  }

  const alreadyRedeemed = Boolean(data?.alreadyRedeemed);

  // Persist local Pro override so RevenueCat refreshes can't overwrite it.
  await setProCodeOverrideEnabled(true);
  void useEntitlementsStore.getState().refreshEntitlements({ force: true }).catch(() => undefined);

  useToastStore.getState().showToast({
    message: alreadyRedeemed ? 'Code already redeemed.' : 'Kwilt Pro unlocked.',
    variant: alreadyRedeemed ? 'default' : 'success',
  });

  return { alreadyRedeemed };
}

export type AdminRole = 'none' | 'admin' | 'super_admin';

export async function getAdminProCodesStatus(params?: { requireAuth?: boolean }): Promise<{
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  role?: AdminRole;
  email?: string | null;
  httpStatus?: number;
  errorMessage?: string;
  errorCode?: string;
  debugProCodesBaseUrl?: string;
  debugSupabaseUrl?: string;
}> {
  const requireAuth = Boolean(params?.requireAuth);
  const doFetch = async (headers: Headers) => {
    const base = getProCodesBaseUrlForHeaders(headers);
    if (!base) {
      throw new Error('Pro codes service not configured');
    }
    const res = await fetch(`${base}/admin/status`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });
    const text = await res.text().catch(() => '');
    const data = (() => {
      try {
        return text ? (JSON.parse(text) as any) : null;
      } catch {
        return null;
      }
    })();
    return { res, data, text };
  };

  // Default behavior (requireAuth=false): do NOT prompt sign-in just to "check" status.
  // If not signed in, treat as not admin and keep the UI quiet.
  // When requireAuth=true: attach a JWT and prompt sign-in if needed (used by Admin/Super Admin screens).
  let headers = requireAuth ? await buildAuthedAdminHeaders() : await buildMaybeAuthedHeaders();
  let { res, data, text } = await doFetch(headers);

  const baseForDebug = getProCodesBaseUrlForHeaders(headers);
  const debugProCodesBaseUrl = __DEV__ ? (baseForDebug ?? undefined) : undefined;
  const debugSupabaseUrl = __DEV__ ? (getSupabaseUrl()?.trim() ?? '') : undefined;

  // Never force-log-out on 401.
  // A 401 here can be caused by a backend/config mismatch (issuer/audience/domain), not user intent.
  // If we blow away the session, we immediately trigger another sign-in prompt which feels broken.
  //
  // Best-effort: if we *do* have a session, try refreshing once and retrying the request.
  if (requireAuth && res.status === 401) {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.refreshSession().catch(() => null);
      headers = await buildAuthedAdminHeaders();
      ({ res, data, text } = await doFetch(headers));
    } catch {
      // best-effort only; fall through to return "not admin" below.
    }
  }

  if (!res.ok) {
    // 401/403 should be treated as "not admin" for UI gating.
    if (res.status === 401 || res.status === 403)
      return {
        isAdmin: false,
        role: 'none',
        httpStatus: res.status,
        errorMessage:
          (typeof data?.error?.message === 'string' && data.error.message) ||
          (typeof text === 'string' && text.trim() ? text.trim().slice(0, 180) : undefined),
        errorCode: typeof data?.error?.code === 'string' ? data.error.code : undefined,
        debugProCodesBaseUrl,
        debugSupabaseUrl,
      };
    const msg = typeof data?.error?.message === 'string' ? data.error.message : 'Unable to check admin status';
    throw new Error(msg);
  }

  const roleRaw = typeof data?.role === 'string' ? data.role : null;
  const role: AdminRole =
    roleRaw === 'super_admin' ? 'super_admin' : roleRaw === 'admin' ? 'admin' : 'none';

  return {
    isAdmin: Boolean(data?.isAdmin),
    isSuperAdmin: Boolean(data?.isSuperAdmin),
    role,
    email: typeof data?.email === 'string' ? data.email : null,
    httpStatus: res.status,
    debugProCodesBaseUrl,
    debugSupabaseUrl,
  };
}

export type CreateProCodeAdminInput = {
  maxUses?: number;
  expiresAt?: string;
  note?: string;
};

export async function createProCodeAdmin(input?: CreateProCodeAdminInput): Promise<{ code: string }> {
  const headers = await buildAuthedAdminHeaders();
  const base = getProCodesBaseUrlForHeaders(headers);
  if (!base) throw new Error('Pro codes service not configured');
  const res = await fetch(`${base}/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...(typeof input?.maxUses === 'number' ? { maxUses: input.maxUses } : {}),
      ...(typeof input?.expiresAt === 'string' && input.expiresAt.trim() ? { expiresAt: input.expiresAt.trim() } : {}),
      ...(typeof input?.note === 'string' && input.note.trim() ? { note: input.note.trim() } : {}),
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('Pro codes service not deployed (HTTP 404). Deploy the `pro-codes` edge function.');
    }
    const msg = typeof data?.error?.message === 'string' ? data.error.message : 'Unable to create code';
    throw new Error(msg);
  }
  const code = typeof data?.code === 'string' ? data.code : '';
  if (!code) throw new Error('No code returned');
  return { code };
}

export async function sendProCodeSuperAdmin(params: {
  channel: 'email' | 'sms';
  code: string;
  recipientEmail?: string;
  recipientPhone?: string;
  note?: string;
}): Promise<void> {
  const headers = await buildAuthedAdminHeaders();
  const base = getProCodesBaseUrlForHeaders(headers);
  if (!base) throw new Error('Pro codes service not configured');
  const res = await fetch(`${base}/admin/send`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      channel: params.channel,
      code: params.code,
      recipientEmail: params.recipientEmail,
      recipientPhone: params.recipientPhone,
      note: params.note,
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = typeof data?.error?.message === 'string' ? data.error.message : 'Unable to send code';
    throw new Error(msg);
  }
}

export { getProStatus } from './proCodesStatus';
export type { ProStatus } from './proCodesStatus';

export async function grantProSuperAdmin(params: { targetType: 'user' | 'install'; email?: string; installId?: string }) {
  const headers = await buildAuthedAdminHeaders();
  const base = getProCodesBaseUrlForHeaders(headers);
  if (!base) throw new Error('Pro codes service not configured');
  const res = await fetch(`${base}/admin/grant`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      targetType: params.targetType,
      email: params.email,
      installId: params.installId,
    }),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = typeof data?.error?.message === 'string' ? data.error.message : 'Unable to grant Pro';
    throw new Error(msg);
  }
  return {
    quotaKey: typeof data?.quotaKey === 'string' ? data.quotaKey : null,
    expiresAt: typeof data?.expiresAt === 'string' ? data.expiresAt : null,
    userId: typeof data?.userId === 'string' ? data.userId : null,
    email: typeof data?.email === 'string' ? data.email : null,
  };
}





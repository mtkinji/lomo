import { getSupabaseUrl } from '../utils/getEnv';
import { setProCodeOverrideEnabled } from './entitlements';
import { useEntitlementsStore } from '../store/useEntitlementsStore';
import { useToastStore } from '../store/useToastStore';
import { getSupabaseClient } from './backend/supabaseClient';
import {
  buildAuthedHeaders,
  buildEdgeHeaders,
  buildMaybeAuthedHeaders,
  getProCodesBaseUrl,
  getProCodesBaseUrlForHeaders,
} from './proCodesClient';

async function buildAuthedAdminHeaders(): Promise<Headers> {
  return await buildAuthedHeaders({ promptReason: 'admin' });
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





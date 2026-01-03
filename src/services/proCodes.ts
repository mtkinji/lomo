import { getEnvVar, getSupabaseUrl } from '../utils/getEnv';
import { getInstallId } from './installId';
import { setProCodeOverrideEnabled } from './entitlements';
import { useEntitlementsStore } from '../store/useEntitlementsStore';
import { useToastStore } from '../store/useToastStore';
import { getAccessToken, ensureSignedInWithPrompt } from './backend/auth';

const AI_PROXY_BASE_URL_RAW = getEnvVar<string>('aiProxyBaseUrl');
const AI_PROXY_BASE_URL =
  typeof AI_PROXY_BASE_URL_RAW === 'string' ? AI_PROXY_BASE_URL_RAW.trim().replace(/\/+$/, '') : undefined;

function getProCodesBaseUrl(): string | null {
  // Prefer aiProxyBaseUrl when available because it already points at Edge Functions.
  // Expected to end with `/ai-chat` (edge function name). Derive sibling pro-codes URL.
  if (AI_PROXY_BASE_URL && AI_PROXY_BASE_URL.endsWith('/ai-chat')) {
    return `${AI_PROXY_BASE_URL.slice(0, -'/ai-chat'.length)}/pro-codes`;
  }
  // Fallback: derive from Supabase project URL if aiProxyBaseUrl isn't set in this build.
  // supabaseUrl format: https://<project-ref>.supabase.co
  const supabaseUrl = getSupabaseUrl()?.trim();
  if (!supabaseUrl) return null;
  try {
    const u = new URL(supabaseUrl);
    const host = u.hostname ?? '';
    const suffix = '.supabase.co';
    if (!host.endsWith(suffix)) return null;
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
  await ensureSignedInWithPrompt('admin');
  const token = await getAccessToken();
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

export async function getAdminProCodesStatus(): Promise<{
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  role?: AdminRole;
  email?: string | null;
}> {
  const base = getProCodesBaseUrl();
  if (!base) {
    throw new Error('Pro codes service not configured');
  }

  const res = await fetch(`${base}/admin/status`, {
    method: 'POST',
    // Important: do NOT prompt sign-in just to "check" status.
    // If not signed in, treat as not admin and keep the UI quiet.
    headers: await buildMaybeAuthedHeaders(),
    body: JSON.stringify({}),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // 401/403 should be treated as "not admin" for UI gating.
    if (res.status === 401 || res.status === 403) return { isAdmin: false };
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
  };
}

export type CreateProCodeAdminInput = {
  maxUses?: number;
  expiresAt?: string;
  note?: string;
};

export async function createProCodeAdmin(input?: CreateProCodeAdminInput): Promise<{ code: string }> {
  const base = getProCodesBaseUrl();
  if (!base) {
    throw new Error('Pro codes service not configured');
  }

  const res = await fetch(`${base}/create`, {
    method: 'POST',
    headers: await buildAuthedAdminHeaders(),
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
  const base = getProCodesBaseUrl();
  if (!base) {
    throw new Error('Pro codes service not configured');
  }

  const res = await fetch(`${base}/admin/send`, {
    method: 'POST',
    headers: await buildAuthedAdminHeaders(),
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





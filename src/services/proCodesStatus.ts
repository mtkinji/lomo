import { getSupabaseUrl } from '../utils/getEnv';
import { buildMaybeAuthedHeaders, getProCodesBaseUrl } from './proCodesClient';
import { getSupabaseClient } from './backend/supabaseClient';

export type ProStatus = {
  isPro: boolean;
  expiresAt: string | null;
  // Dev-only diagnostics
  httpStatus?: number;
  errorMessage?: string;
  errorCode?: string;
  debugProCodesBaseUrl?: string;
  debugSupabaseUrl?: string;
};

export async function getProStatus(): Promise<ProStatus> {
  const base = getProCodesBaseUrl();
  if (!base) {
    throw new Error('Pro codes service not configured');
  }

  const debugProCodesBaseUrl = __DEV__ ? base : undefined;
  const debugSupabaseUrl = __DEV__ ? (getSupabaseUrl()?.trim() ?? '') : undefined;

  const doFetch = async (headers: Headers) => {
    const res = await fetch(`${base}/status`, {
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

  let headers = await buildMaybeAuthedHeaders();
  let { res, data, text } = await doFetch(headers);

  // Best-effort: if the server returns 401 and we *did* send a token, try refreshing
  // the Supabase session and retry once. This fixes cases where the client has a
  // persisted identity but an expired/invalid access token.
  const hadAuthHeader = Boolean((headers.get('Authorization') ?? headers.get('authorization') ?? '').trim());
  if (res.status === 401 && hadAuthHeader) {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.refreshSession().catch(() => null);
      headers = await buildMaybeAuthedHeaders();
      ({ res, data, text } = await doFetch(headers));
    } catch {
      // best-effort only
    }
  }

  if (!res.ok) {
    const msg =
      (typeof data?.error?.message === 'string' && data.error.message) ||
      (typeof text === 'string' && text.trim() ? text.trim().slice(0, 180) : 'Unable to check Pro status');
    const code = typeof data?.error?.code === 'string' ? data.error.code : undefined;
    return {
      isPro: false,
      expiresAt: null,
      httpStatus: res.status,
      errorMessage: msg,
      errorCode: code,
      debugProCodesBaseUrl,
      debugSupabaseUrl,
    };
  }

  return {
    isPro: Boolean(data?.isPro),
    expiresAt: typeof data?.expiresAt === 'string' ? data.expiresAt : null,
    httpStatus: res.status,
    debugProCodesBaseUrl,
    debugSupabaseUrl,
  };
}



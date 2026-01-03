import { getSupabaseUrl } from '../utils/getEnv';
import { buildMaybeAuthedHeaders, getProCodesBaseUrl } from './proCodesClient';

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

  const res = await fetch(`${base}/status`, {
    method: 'POST',
    headers: await buildMaybeAuthedHeaders(),
    body: JSON.stringify({}),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = typeof data?.error?.message === 'string' ? data.error.message : 'Unable to check Pro status';
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



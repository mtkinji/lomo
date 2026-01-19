import { getAiProxyBaseUrl, getSupabasePublishableKey, getSupabaseUrl } from '../utils/getEnv';

function trimUrl(raw: string | undefined | null): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().replace(/\/+$/, '');
  return trimmed.length > 0 ? trimmed : null;
}

function decodeBase64Url(input: string): string | null {
  try {
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
    return null;
  } catch {
    return null;
  }
}

function getFunctionsBaseUrlFromJwt(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payloadJson = decodeBase64Url(parts[1] ?? '');
    if (!payloadJson) return null;
    const payload = JSON.parse(payloadJson) as { iss?: unknown };
    const iss = typeof payload?.iss === 'string' ? payload.iss.trim() : '';
    if (!iss) return null;
    const u = new URL(iss);
    const host = (u.hostname ?? '').trim();
    const suffix = '.supabase.co';
    if (!host.endsWith(suffix)) return null;
    const projectRef = host.slice(0, -suffix.length);
    if (!projectRef) return null;
    return `https://${projectRef}.functions.supabase.co/functions/v1`;
  } catch {
    return null;
  }
}

function getFunctionsBaseUrlFromPublishableKey(): string | null {
  const key = getSupabasePublishableKey()?.trim();
  if (!key) return null;
  return getFunctionsBaseUrlFromJwt(key);
}

function getFunctionsBaseUrlFromHeaders(headers?: Headers | null): string | null {
  if (!headers) return null;
  const auth = (headers.get('Authorization') ?? headers.get('authorization') ?? '').trim();
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  const bearer = m?.[1]?.trim() ?? '';
  if (bearer) {
    const derived = getFunctionsBaseUrlFromJwt(bearer);
    if (derived) return derived;
  }
  const apikey = (headers.get('apikey') ?? '').trim();
  if (apikey) {
    const derived = getFunctionsBaseUrlFromJwt(apikey);
    if (derived) return derived;
  }
  return null;
}

export function getEdgeFunctionUrlFromSupabaseUrl(functionName: string): string | null {
  const sb = trimUrl(getSupabaseUrl());
  if (!sb) return null;
  return `${sb}/functions/v1/${functionName}`;
}

export function getEdgeFunctionUrlFromAiProxy(functionName: string): string | null {
  const ai = trimUrl(getAiProxyBaseUrl());
  if (!ai) return null;

  // Only allow derivation if the URL looks like a Supabase Edge Functions host.
  // Example:
  //   https://<project-ref>.functions.supabase.co/functions/v1/ai-chat
  // -> https://<project-ref>.functions.supabase.co/functions/v1/<functionName>
  try {
    const u = new URL(ai);
    const host = (u.hostname ?? '').toLowerCase();
    const isSupabaseFunctionsHost = host.endsWith('.functions.supabase.co');
    const looksLikeFunctionsPath = (u.pathname ?? '').includes('/functions/v1/');
    if (isSupabaseFunctionsHost || looksLikeFunctionsPath) {
      const lastSlash = ai.lastIndexOf('/');
      if (lastSlash >= 0) {
        return `${ai.slice(0, lastSlash)}/${functionName}`;
      }
    }
  } catch {
    // ignore
  }

  return null;
}

export function getEdgeFunctionUrlCandidates(functionName: string): string[] {
  const derivedFunctionsBase = getFunctionsBaseUrlFromPublishableKey();
  const urls = [
    getEdgeFunctionUrlFromAiProxy(functionName),
    derivedFunctionsBase ? `${derivedFunctionsBase}/${functionName}` : null,
    getEdgeFunctionUrlFromSupabaseUrl(functionName),
  ].filter((u): u is string => typeof u === 'string' && u.length > 0);
  // De-dupe while keeping order.
  const seen = new Set<string>();
  return urls.filter((u) => {
    if (seen.has(u)) return false;
    seen.add(u);
    return true;
  });
}

export function getEdgeFunctionUrlForHeaders(functionName: string, headers?: Headers | null): string | null {
  const derivedFromHeaders = getFunctionsBaseUrlFromHeaders(headers);
  if (derivedFromHeaders) return `${derivedFromHeaders}/${functionName}`;
  return getEdgeFunctionUrl(functionName);
}

export function getEdgeFunctionUrlCandidatesForHeaders(functionName: string, headers?: Headers | null): string[] {
  const derivedFromHeaders = getFunctionsBaseUrlFromHeaders(headers);
  const derivedFromPublishableKey = getFunctionsBaseUrlFromPublishableKey();
  const urls = [
    derivedFromHeaders ? `${derivedFromHeaders}/${functionName}` : null,
    derivedFromPublishableKey ? `${derivedFromPublishableKey}/${functionName}` : null,
    getEdgeFunctionUrlFromSupabaseUrl(functionName),
    getEdgeFunctionUrlFromAiProxy(functionName),
  ].filter((u): u is string => typeof u === 'string' && u.length > 0);
  const seen = new Set<string>();
  return urls.filter((u) => {
    if (seen.has(u)) return false;
    seen.add(u);
    return true;
  });
}

/**
 * Returns a Supabase Edge Function URL for a given function name.
 *
 * Prefers `aiProxyBaseUrl` ONLY if it appears to be an actual Supabase functions host
 * (e.g. https://<project-ref>.functions.supabase.co/functions/v1/<fn>), otherwise
 * falls back to `supabaseUrl` (e.g. https://<project-ref>.supabase.co).
 *
 * This prevents mistakenly treating a dedicated AI proxy endpoint as if it also
 * hosts other edge functions (which causes 404s like attachments-init-upload).
 */
export function getEdgeFunctionUrl(functionName: string): string | null {
  const candidates = getEdgeFunctionUrlCandidates(functionName);
  return candidates.length > 0 ? candidates[0] : null;
}



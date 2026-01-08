import { getAiProxyBaseUrl, getSupabaseUrl } from '../utils/getEnv';

function trimUrl(raw: string | undefined | null): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().replace(/\/+$/, '');
  return trimmed.length > 0 ? trimmed : null;
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
  const urls = [getEdgeFunctionUrlFromAiProxy(functionName), getEdgeFunctionUrlFromSupabaseUrl(functionName)].filter(
    (u): u is string => typeof u === 'string' && u.length > 0,
  );
  // De-dupe while keeping order.
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
  return getEdgeFunctionUrlFromAiProxy(functionName) ?? getEdgeFunctionUrlFromSupabaseUrl(functionName) ?? null;
}



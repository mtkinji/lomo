import { getEnvVar, getSupabaseUrl } from '../utils/getEnv';
import { getInstallId } from './installId';
import { getAccessToken, ensureSignedInWithPrompt } from './backend/auth';

function decodeBase64Url(input: string): string {
  // Convert base64url -> base64
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  // Pad to 4 chars
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  // atob is available in React Native JS runtimes; fall back to Buffer when present.
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

export function getProCodesBaseUrl(): string | null {
  // Derive from Supabase project URL.
  // supabaseUrl format: https://<project-ref>.supabase.co
  const supabaseUrl = getSupabaseUrl()?.trim();
  if (!supabaseUrl) return null;
  try {
    const u = new URL(supabaseUrl);
    const host = u.hostname ?? '';
    const suffix = '.supabase.co';
    // If we're using a custom domain (e.g. https://auth.kwilt.app), prefer hitting Edge
    // Functions through the same base URL so the JWT issuer/validation matches.
    if (!host.endsWith(suffix)) {
      const normalized = supabaseUrl.replace(/\/+$/, '');
      return `${normalized}/functions/v1/pro-codes`;
    }
    // Standard Supabase URL (project-ref).supabase.co -> (project-ref).functions.supabase.co
    if (!host.endsWith(suffix)) return null;
    const projectRef = host.slice(0, -suffix.length);
    if (!projectRef) return null;
    return `https://${projectRef}.functions.supabase.co/functions/v1/pro-codes`;
  } catch {
    return null;
  }
}

export function getProCodesBaseUrlForHeaders(headers?: Headers | null): string | null {
  // If we're on a custom SUPABASE_URL (e.g. auth.kwilt.app) but the Functions gateway
  // doesn’t accept tokens minted under that domain, we can still reliably reach the
  // correct project functions host by deriving the project ref from the JWT issuer.
  const auth = (headers?.get('Authorization') ?? headers?.get('authorization') ?? '').trim();
  const m = /^Bearer\s+(.+)$/i.exec(auth);
  const token = m?.[1]?.trim() ?? '';
  const derived = token ? deriveFunctionsProCodesBaseFromJwt(token) : null;
  return derived ?? getProCodesBaseUrl();
}

export async function buildEdgeHeaders(): Promise<Headers> {
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

export async function buildAuthedHeaders(args?: { promptReason?: 'admin' | 'settings' }): Promise<Headers> {
  const promptReason = args?.promptReason ?? 'admin';
  // Ensure the user is signed in so we can attach a JWT.
  const session = await ensureSignedInWithPrompt(promptReason);
  const token = (session as any)?.access_token ?? (await getAccessToken());
  if (!token) {
    throw new Error('Missing session token');
  }
  const headers = await buildEdgeHeaders();
  headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

export async function buildMaybeAuthedHeaders(): Promise<Headers> {
  const token = await getAccessToken().catch(() => null);
  const headers = await buildEdgeHeaders();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}



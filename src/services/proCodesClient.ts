import { getEnvVar, getSupabaseUrl } from '../utils/getEnv';
import { getInstallId } from './installId';
import { getAccessToken, ensureSignedInWithPrompt } from './backend/auth';

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



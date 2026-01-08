import { getSupabasePublishableKey } from '../utils/getEnv';
import { getInstallId } from './installId';
import { getAccessToken } from './backend/auth';
import { getEdgeFunctionUrl } from './edgeFunctions';

async function buildEdgeHeaders(requireAuth: boolean): Promise<Headers> {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');
  headers.set('x-kwilt-client', 'kwilt-mobile');

  const supabaseKey = getSupabasePublishableKey()?.trim();
  if (supabaseKey) {
    headers.set('apikey', supabaseKey);
  }

  const installId = await getInstallId();
  headers.set('x-kwilt-install-id', installId);

  if (requireAuth) {
    const token = (await getAccessToken())?.trim();
    if (!token) {
      throw new Error('Missing access token (not signed in)');
    }
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

export type SharedMember = {
  userId: string;
  role?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
};

export async function listGoalMembers(goalId: string): Promise<SharedMember[] | null> {
  const base = getEdgeFunctionUrl('memberships-list');
  if (!base) return null;

  // Do not prompt sign-in from passive UI surfaces (goal canvas). If not signed in, return null.
  const token = (await getAccessToken())?.trim();
  if (!token) return null;

  let res: Response;
  let rawText: string | null = null;
  try {
    const headers = await buildEdgeHeaders(true);
    // Ensure we use the already-checked token (avoid double getSession hops).
    headers.set('Authorization', `Bearer ${token}`);
    res = await fetch(base, {
      method: 'POST',
      headers,
      body: JSON.stringify({ entityType: 'goal', entityId: goalId }),
    });
    rawText = await res.text().catch(() => null);
  } catch (e: any) {
    const msg = typeof e?.message === 'string' ? e.message : 'Network request failed';
    throw new Error(`[memberships-list] ${msg}`);
  }

  let data: any = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    // Treat "not a member" as a non-fatal empty state (e.g. auth mismatch or invite not accepted yet).
    const code = (data?.error?.code ?? '').toString();
    if (res.status === 403 || code === 'forbidden') return [];

    const msg =
      typeof data?.error?.message === 'string'
        ? data.error.message
        : typeof data?.message === 'string'
          ? data.message
          : `Unable to load members (status ${res.status})`;
    const bodyPreview =
      typeof rawText === 'string' && rawText.length > 0 ? rawText.slice(0, 500) : '(empty)';
    throw new Error(`[memberships-list] ${msg}\nstatus=${res.status}\nbody=${bodyPreview}`);
  }

  const members = Array.isArray(data?.members) ? data.members : [];
  return members
    .map((m: any) => ({
      userId: typeof m?.userId === 'string' ? m.userId : '',
      role: typeof m?.role === 'string' ? m.role : null,
      name: typeof m?.name === 'string' ? m.name : null,
      avatarUrl: typeof m?.avatarUrl === 'string' ? m.avatarUrl : null,
    }))
    .filter((m: SharedMember) => Boolean(m.userId));
}

export async function leaveSharedGoal(goalId: string): Promise<{ ok: true }> {
  const base = getEdgeFunctionUrl('memberships-leave');
  if (!base) {
    throw new Error('Membership service not configured');
  }

  let res: Response;
  let rawText: string | null = null;
  try {
    res = await fetch(base, {
      method: 'POST',
      headers: await buildEdgeHeaders(true),
      body: JSON.stringify({ entityType: 'goal', entityId: goalId }),
    });
    rawText = await res.text().catch(() => null);
  } catch (e: any) {
    const msg = typeof e?.message === 'string' ? e.message : 'Network request failed';
    throw new Error(`[memberships-leave] ${msg}`);
  }

  let data: any = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg =
      typeof data?.error?.message === 'string'
        ? data.error.message
        : typeof data?.message === 'string'
          ? data.message
          : `Unable to leave goal (status ${res.status})`;
    const code = typeof data?.error?.code === 'string' ? data.error.code : undefined;
    const bodyPreview = typeof rawText === 'string' && rawText.length > 0 ? rawText.slice(0, 500) : '(empty)';
    const err = new Error(`[memberships-leave] ${msg}\nstatus=${res.status}\nbody=${bodyPreview}`) as Error & {
      status?: number;
      code?: string;
    };
    err.status = res.status;
    err.code = code;
    throw err;
  }

  return { ok: true };
}



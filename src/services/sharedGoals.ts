import { getSupabasePublishableKey } from '../utils/getEnv';
import { getInstallId } from './installId';
import { getAccessToken } from './backend/auth';
import { getEdgeFunctionUrl } from './edgeFunctions';
import { getSupabaseClient } from './backend/supabaseClient';

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

export type GoalSharingDirection = 'by_you' | 'with_you';
export type GoalSharingAccessState = 'pending' | 'expired' | 'active';
export type GoalSharingItem = {
  direction: GoalSharingDirection;
  goalId: string;
  goalTitle: string;
  accessState: GoalSharingAccessState;
  counterpartName: string;
  counterpartAvatarUrl: string | null;
  inviteId: string | null;
  inviteCode: string | null;
  counterpartUserId: string | null;
  changedAt: string;
};

export async function listGoalSharing(): Promise<GoalSharingItem[]> {
  const { data, error } = await getSupabaseClient().rpc('get_kwilt_goal_sharing');
  if (error) throw new Error(error.message || 'Unable to load Goal sharing');
  if (!Array.isArray(data)) return [];
  return data.flatMap((value: unknown) => {
    if (!value || typeof value !== 'object') return [];
    const row = value as Record<string, unknown>;
    const direction = row.direction;
    const accessState = row.access_state;
    const goalId = typeof row.goal_id === 'string' ? row.goal_id.trim() : '';
    const goalTitle = typeof row.goal_title === 'string' ? row.goal_title.trim() : '';
    const counterpartName = typeof row.counterpart_name === 'string' ? row.counterpart_name.trim() : '';
    const changedAt = typeof row.changed_at === 'string' ? row.changed_at : '';
    if (
      (direction !== 'by_you' && direction !== 'with_you')
      || (accessState !== 'pending' && accessState !== 'expired' && accessState !== 'active')
      || !goalId
      || !goalTitle
      || !counterpartName
      || !changedAt
    ) return [];
    return [{
      direction,
      goalId,
      goalTitle,
      accessState,
      counterpartName,
      counterpartAvatarUrl:
        typeof row.counterpart_avatar_url === 'string' && row.counterpart_avatar_url.trim()
          ? row.counterpart_avatar_url.trim()
          : null,
      inviteId: typeof row.invite_id === 'string' && row.invite_id.trim() ? row.invite_id.trim() : null,
      inviteCode: typeof row.invite_code === 'string' && row.invite_code.trim() ? row.invite_code.trim() : null,
      counterpartUserId:
        typeof row.counterpart_user_id === 'string' && row.counterpart_user_id.trim()
          ? row.counterpart_user_id.trim()
          : null,
      changedAt,
    }];
  });
}

export async function revokeTargetedGoalInvite(inviteId: string): Promise<{ ok: true }> {
  const id = inviteId.trim();
  if (!id) throw new Error('Missing invitation id');
  const { error } = await getSupabaseClient().rpc('revoke_kwilt_targeted_goal_invite', {
    p_invite_id: id,
  });
  if (error) throw new Error(error.message || 'Unable to revoke invitation');
  return { ok: true };
}

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

export async function removeGoalPartner(goalId: string, userId: string): Promise<{ ok: true }> {
  const base = getEdgeFunctionUrl('memberships-remove');
  if (!base) {
    throw new Error('Membership service not configured');
  }

  let res: Response;
  let rawText: string | null = null;
  try {
    res = await fetch(base, {
      method: 'POST',
      headers: await buildEdgeHeaders(true),
      body: JSON.stringify({ entityType: 'goal', entityId: goalId, userId }),
    });
    rawText = await res.text().catch(() => null);
  } catch (e: any) {
    const msg = typeof e?.message === 'string' ? e.message : 'Network request failed';
    throw new Error(`[memberships-remove] ${msg}`);
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
          : `Unable to remove partner (status ${res.status})`;
    const code = typeof data?.error?.code === 'string' ? data.error.code : undefined;
    const bodyPreview = typeof rawText === 'string' && rawText.length > 0 ? rawText.slice(0, 500) : '(empty)';
    const err = new Error(`[memberships-remove] ${msg}\nstatus=${res.status}\nbody=${bodyPreview}`) as Error & {
      status?: number;
      code?: string;
    };
    err.status = res.status;
    err.code = code;
    throw err;
  }

  return { ok: true };
}


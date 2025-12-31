import { Alert } from 'react-native';
import Constants from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import { getAiProxyBaseUrl, getSupabasePublishableKey } from '../utils/getEnv';
import { getInstallId } from './installId';
import { ensureSignedInWithPrompt, getAccessToken } from './backend/auth';
import { rootNavigationRef } from '../navigation/rootNavigationRef';
import { useToastStore } from '../store/useToastStore';
import { useAppStore } from '../store/useAppStore';

const AI_PROXY_BASE_URL_RAW = getAiProxyBaseUrl();
const AI_PROXY_BASE_URL =
  typeof AI_PROXY_BASE_URL_RAW === 'string' ? AI_PROXY_BASE_URL_RAW.trim().replace(/\/+$/, '') : undefined;

function getFunctionBaseUrl(functionName: string): string | null {
  if (!AI_PROXY_BASE_URL) return null;
  if (AI_PROXY_BASE_URL.endsWith('/ai-chat')) {
    return `${AI_PROXY_BASE_URL.slice(0, -'/ai-chat'.length)}/${functionName}`;
  }
  return null;
}

async function buildEdgeHeaders(requireAuth: boolean, accessToken?: string | null): Promise<Headers> {
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
    const token = (accessToken ?? (await getAccessToken()))?.trim();
    if (!token) {
      throw new Error('Missing access token (not signed in)');
    }
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

export type InviteKind = 'buddy' | 'squad';

export async function createGoalInvite(params: {
  goalId: string;
  goalTitle: string;
  kind: InviteKind;
}): Promise<{ inviteCode: string; inviteUrl: string; inviteRedirectUrl: string | null }> {
  const base = getFunctionBaseUrl('invite-create');
  if (!base) throw new Error('Invites service not configured');

  // Auth-gated flow: ensure we have an account session before creating invites.
  const session = await ensureSignedInWithPrompt('share_goal');
  const accessToken = session?.access_token ?? null;

  let res: Response;
  let rawText: string | null = null;
  try {
    res = await fetch(base, {
      method: 'POST',
      headers: await buildEdgeHeaders(true, accessToken),
      body: JSON.stringify({
        entityType: 'goal',
        entityId: params.goalId,
        kind: params.kind,
        goalTitle: params.goalTitle,
      }),
    });
    rawText = await res.text().catch(() => null);
  } catch (e: any) {
    const msg =
      typeof e?.message === 'string'
        ? e.message
        : 'Network request failed';
    throw new Error(`[invite-create] ${msg}`);
  }

  const data = rawText ? JSON.parse(rawText) : null;
  const inviteCode = typeof data?.inviteCode === 'string' ? data.inviteCode.trim() : '';
  const inviteUrl = typeof data?.inviteUrl === 'string' ? data.inviteUrl.trim() : '';

  if (!res.ok || !inviteCode || !inviteUrl) {
    const msg =
      typeof data?.error?.message === 'string'
        ? data.error.message
        : typeof data?.message === 'string'
          ? data.message
          : `Unable to create invite (status ${res.status})`;
    const bodyPreview =
      typeof rawText === 'string' && rawText.length > 0
        ? rawText.slice(0, 500)
        : '(empty)';
    throw new Error(`[invite-create] ${msg}\nstatus=${res.status}\nbody=${bodyPreview}`);
  }

  const redirectBase = getFunctionBaseUrl('invite-redirect');
  const inviteRedirectUrl = redirectBase ? `${redirectBase}/i/${encodeURIComponent(inviteCode)}` : null;

  return { inviteCode, inviteUrl, inviteRedirectUrl };
}

export function extractInviteCode(inviteUrlOrCode: string): string {
  const raw = inviteUrlOrCode.trim();
  if (!raw) return '';
  // Accept either a raw code or a kwilt://invite?code=... URL.
  if (!raw.includes('://')) return raw;
  try {
    const u = new URL(raw);
    const code = (u.searchParams.get('code') ?? '').trim();
    return code;
  } catch {
    return '';
  }
}

export async function acceptGoalInvite(inviteCode: string): Promise<{ goalId: string; goalTitle?: string | null }> {
  const base = getFunctionBaseUrl('invite-accept');
  if (!base) throw new Error('Invites service not configured');

  const session = await ensureSignedInWithPrompt('join_goal');
  const accessToken = session?.access_token ?? null;

  let res: Response;
  let rawText: string | null = null;
  try {
    res = await fetch(base, {
      method: 'POST',
      headers: await buildEdgeHeaders(true, accessToken),
      body: JSON.stringify({ inviteCode }),
    });
    rawText = await res.text().catch(() => null);
  } catch (e: any) {
    const msg =
      typeof e?.message === 'string'
        ? e.message
        : 'Network request failed';
    throw new Error(`[invite-accept] ${msg}`);
  }

  const data = rawText ? JSON.parse(rawText) : null;
  if (!res.ok) {
    const msg =
      typeof data?.error?.message === 'string'
        ? data.error.message
        : typeof data?.message === 'string'
          ? data.message
          : `Unable to join (status ${res.status})`;
    const code =
      typeof data?.error?.code === 'string'
        ? data.error.code
        : undefined;
    const bodyPreview =
      typeof rawText === 'string' && rawText.length > 0
        ? rawText.slice(0, 500)
        : '(empty)';
    const err = new Error(`[invite-accept] ${msg}\nstatus=${res.status}\nbody=${bodyPreview}`) as Error & {
      status?: number;
      code?: string;
    };
    err.status = res.status;
    err.code = code;
    throw err;
  }

  const goalId = typeof data?.entityId === 'string' ? data.entityId : '';
  const goalTitle = typeof data?.payload?.goalTitle === 'string' ? data.payload.goalTitle : null;

  if (!goalId) {
    throw new Error('Invite response missing goal id');
  }

  return { goalId, goalTitle };
}

export async function previewGoalInvite(inviteCode: string): Promise<{
  goalId: string;
  goalTitle?: string | null;
  inviter?: { userId: string; name?: string | null; avatarUrl?: string | null } | null;
  inviteState?: 'active' | 'expired' | 'consumed';
  canJoin?: boolean;
}> {
  const base = getFunctionBaseUrl('invite-preview');
  if (!base) throw new Error('Invites service not configured');

  let res: Response;
  let rawText: string | null = null;
  try {
    res = await fetch(base, {
      method: 'POST',
      headers: await buildEdgeHeaders(false),
      body: JSON.stringify({ inviteCode }),
    });
    rawText = await res.text().catch(() => null);
  } catch (e: any) {
    const msg = typeof e?.message === 'string' ? e.message : 'Network request failed';
    throw new Error(`[invite-preview] ${msg}`);
  }

  const data = rawText ? JSON.parse(rawText) : null;
  if (!res.ok) {
    const msg =
      typeof data?.error?.message === 'string'
        ? data.error.message
        : typeof data?.message === 'string'
          ? data.message
          : `Unable to preview invite (status ${res.status})`;
    const bodyPreview =
      typeof rawText === 'string' && rawText.length > 0 ? rawText.slice(0, 500) : '(empty)';
    throw new Error(`[invite-preview] ${msg}\nstatus=${res.status}\nbody=${bodyPreview}`);
  }

  const goalId = typeof data?.entityId === 'string' ? data.entityId : '';
  const goalTitle = typeof data?.payload?.goalTitle === 'string' ? data.payload.goalTitle : null;
  const inviter =
    data?.inviter && typeof data.inviter === 'object'
      ? {
          userId: typeof data.inviter.userId === 'string' ? data.inviter.userId : '',
          name: typeof data.inviter.name === 'string' ? data.inviter.name : null,
          avatarUrl: typeof data.inviter.avatarUrl === 'string' ? data.inviter.avatarUrl : null,
        }
      : null;
  const inviteState =
    data?.inviteState === 'active' || data?.inviteState === 'expired' || data?.inviteState === 'consumed'
      ? (data.inviteState as 'active' | 'expired' | 'consumed')
      : undefined;
  const canJoin = typeof data?.canJoin === 'boolean' ? data.canJoin : undefined;

  if (!goalId) {
    throw new Error('Invite response missing goal id');
  }

  return { goalId, goalTitle, inviter, inviteState, canJoin };
}

/**
 * Side-effect deep link handler (not a navigation path) because we want invite
 * links to work even if the navigation config doesn’t include them yet.
 *
 * Supported format:
 * - kwilt://invite?code=<code>
 */
export async function handleIncomingInviteUrl(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    let code = '';

    // 1) Production/dev-build format: kwilt://invite?code=...
    if (parsed.protocol === 'kwilt:' && parsed.hostname === 'invite') {
      code = (parsed.searchParams.get('code') ?? '').trim();
    }

    // 2) Expo Go format: exp://<ip>:<port>/--/invite?code=...
    // In Expo Go, custom schemes like kwilt:// are not registered system-wide.
    if (!code && (parsed.protocol === 'exp:' || parsed.protocol === 'exps:')) {
      const path = parsed.pathname ?? '';
      if (path.endsWith('/invite') || path.endsWith('/--/invite')) {
        code = (parsed.searchParams.get('code') ?? '').trim();
      } else if (path.includes('/--/invite')) {
        code = (parsed.searchParams.get('code') ?? '').trim();
      }
    }

    if (!code) return true;

    // If we can resolve the goal id and it's already in the local store,
    // skip the join UI entirely and jump straight into the goal.
    // This prevents users from ever re-seeing the join affordance after they've already joined.
    try {
      const preview = await previewGoalInvite(code);
      const goalId = (preview?.goalId ?? '').trim();
      if (goalId) {
        const goals = (useAppStore.getState().goals ?? []) as Array<{ id: string }>;
        const alreadyHasGoal = goals.some((g) => g.id === goalId);
        if (alreadyHasGoal) {
          useToastStore.getState().showToast({
            message: 'You’re already a member',
            variant: 'success',
            durationMs: 2200,
          });
          rootNavigationRef.navigate('Goals', {
            screen: 'GoalDetail',
            params: { goalId, entryPoint: 'goalsTab', initialTab: 'details' },
          } as any);
          return true;
        }

        // If the invite is no longer joinable, attempt an idempotent accept to check whether
        // the user is already a member (e.g. owner) even if the invite was consumed/expired.
        if (preview?.canJoin === false) {
          try {
            const accepted = await acceptGoalInvite(code);
            const acceptedGoalId = accepted?.goalId?.trim();
            if (acceptedGoalId) {
              rootNavigationRef.navigate('Goals', {
                screen: 'GoalDetail',
                params: { goalId: acceptedGoalId, entryPoint: 'goalsTab', initialTab: 'details' },
              } as any);
              return true;
            }
          } catch {
            // fall through to the join UI which will explain the failure
          }
        }
      }
    } catch {
      // Preview can fail (bad code / network). Fall back to join UI.
    }

    // Default: show the join affordance.
    rootNavigationRef.navigate('Goals', { screen: 'JoinSharedGoal', params: { inviteCode: code } } as any);

    return true;
  } catch {
    return false;
  }
}

export function buildInviteOpenUrl(inviteCode: string): { primary: string; alt: string } {
  const code = inviteCode.trim();
  // Primary: in Expo Go, use an exp:// deep link; otherwise use kwilt://.
  const isExpoGo = Constants.appOwnership === 'expo';
  const primary = isExpoGo
    ? AuthSession.makeRedirectUri({
        path: 'invite',
        queryParams: { code },
        preferLocalhost: false,
      })
    : `kwilt://invite?code=${encodeURIComponent(code)}`;

  // Alt: always provide kwilt:// for copy/paste (works in dev builds/prod).
  const alt = `kwilt://invite?code=${encodeURIComponent(code)}`;
  return { primary, alt };
}

export async function shareGoalInviteLink(params: {
  goalTitle: string;
  inviteUrl: string;
  kind: InviteKind;
}): Promise<void> {
  const kindLabel = params.kind === 'squad' ? 'squad' : 'buddy';
  await new Promise<void>((resolve) => {
    Alert.alert(
      'Invite link ready',
      `You’re inviting a ${kindLabel}.\n\nBy default you share signals only (check-ins + cheers). Activity titles stay private unless you choose to share them.`,
      [{ text: 'OK', onPress: () => resolve() }],
      { cancelable: true },
    );
  });
}



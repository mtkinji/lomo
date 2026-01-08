import { Alert } from 'react-native';
import Constants from 'expo-constants';
import * as AuthSession from 'expo-auth-session';
import { getSupabasePublishableKey } from '../utils/getEnv';
import { getEnvVar } from '../utils/getEnv';
import { getInstallId } from './installId';
import { ensureSignedInWithPrompt, getAccessToken } from './backend/auth';
import { rootNavigationRef } from '../navigation/rootNavigationRef';
import { useToastStore } from '../store/useToastStore';
import { useAppStore } from '../store/useAppStore';
import { useJoinSharedGoalDrawerStore } from '../store/useJoinSharedGoalDrawerStore';
import { handleIncomingReferralUrl } from './referrals';
import { getEdgeFunctionUrl } from './edgeFunctions';

function getInviteLandingBaseUrl(): string | null {
  const raw = getEnvVar<string>('inviteLandingBaseUrl');
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().replace(/\/+$/, '');
  return trimmed.length > 0 ? trimmed : null;
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

// Backward compatible: older builds may still send buddy/squad.
export type InviteKind = 'people' | 'buddy' | 'squad';

export async function sendGoalInviteEmail(params: {
  goalId: string;
  goalTitle: string;
  kind?: InviteKind;
  recipientEmail: string;
  inviteCode?: string | null;
  referralCode?: string | null;
}): Promise<{ ok: true }> {
  const base = getEdgeFunctionUrl('invite-email-send');
  if (!base) throw new Error('Invites service not configured');

  const session = await ensureSignedInWithPrompt('share_goal_email');
  const accessToken = session?.access_token ?? null;

  let res: Response;
  let rawText: string | null = null;
  try {
    res = await fetch(base, {
      method: 'POST',
      headers: await buildEdgeHeaders(true, accessToken),
      body: JSON.stringify({
        goalId: params.goalId,
        goalTitle: params.goalTitle,
        kind: (params.kind ?? 'people'),
        recipientEmail: params.recipientEmail,
        inviteCode: typeof params.inviteCode === 'string' ? params.inviteCode.trim() : null,
        referralCode: typeof params.referralCode === 'string' ? params.referralCode.trim() : null,
      }),
    });
    rawText = await res.text().catch(() => null);
  } catch (e: any) {
    const msg = typeof e?.message === 'string' ? e.message : 'Network request failed';
    throw new Error(`[invite-email-send] ${msg}`);
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
          : `Unable to send invite email (status ${res.status})`;
    const bodyPreview = typeof rawText === 'string' && rawText.length > 0 ? rawText.slice(0, 500) : '(empty)';
    const err = new Error(`[invite-email-send] ${msg}\nstatus=${res.status}\nbody=${bodyPreview}`) as Error & {
      status?: number;
      code?: string;
    };
    err.status = res.status;
    err.code = typeof data?.error?.code === 'string' ? data.error.code : undefined;
    throw err;
  }

  return { ok: true };
}

export async function createGoalInvite(params: {
  goalId: string;
  goalTitle: string;
  goalImageUrl?: string;
  kind?: InviteKind;
}): Promise<{
  inviteCode: string;
  inviteUrl: string;
  inviteRedirectUrl: string | null;
  inviteLandingUrl: string | null;
}> {
  const base = getEdgeFunctionUrl('invite-create');
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
        kind: (params.kind ?? 'people'),
        goalTitle: params.goalTitle,
        goalImageUrl: typeof params.goalImageUrl === 'string' ? params.goalImageUrl : undefined,
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

  let data: any = null;
  try {
    data = rawText ? JSON.parse(rawText) : null;
  } catch {
    data = null;
  }
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

  const redirectBase = getEdgeFunctionUrl('invite-redirect');
  const inviteRedirectUrl = redirectBase ? `${redirectBase}/i/${encodeURIComponent(inviteCode)}` : null;

  const landingBase = getInviteLandingBaseUrl();
  const inviteLandingUrl = landingBase ? `${landingBase}/i/${encodeURIComponent(inviteCode)}` : null;

  return { inviteCode, inviteUrl, inviteRedirectUrl, inviteLandingUrl };
}

export function extractInviteCode(inviteUrlOrCode: string): string {
  const raw = inviteUrlOrCode.trim();
  if (!raw) return '';
  // Accept either a raw code or a URL.
  if (!raw.includes('://')) return raw;
  try {
    const u = new URL(raw);
    // 1) kwilt://invite?code=...
    const codeFromQuery = (u.searchParams.get('code') ?? '').trim();
    if (codeFromQuery) return codeFromQuery;

    // 2) https://go.kwilt.app/i/<code> (or kwilt.app)
    const host = (u.hostname ?? '').toLowerCase();
    if (u.protocol === 'https:' || u.protocol === 'http:') {
      if (host === 'go.kwilt.app' || host === 'kwilt.app') {
        const m = /^\/i\/([^/]+)$/.exec(u.pathname ?? '');
        if (m?.[1]) {
          try {
            return decodeURIComponent(m[1]).trim();
          } catch {
            return m[1].trim();
          }
        }
      }
    }

    return '';
  } catch {
    return '';
  }
}

export async function acceptGoalInvite(inviteCode: string): Promise<{ goalId: string; goalTitle?: string | null }> {
  const base = getEdgeFunctionUrl('invite-accept');
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
  const base = getEdgeFunctionUrl('invite-preview');
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
    let looksLikeInvite = false;
    const ref = (parsed.searchParams.get('ref') ?? '').trim() || (parsed.searchParams.get('referral') ?? '').trim();

    // 1) Production/dev-build format: kwilt://invite?code=...
    if (parsed.protocol === 'kwilt:' && parsed.hostname === 'invite') {
      looksLikeInvite = true;
      code = (parsed.searchParams.get('code') ?? '').trim();
    }

    // 2) Expo Go format: exp://<ip>:<port>/--/invite?code=...
    // In Expo Go, custom schemes like kwilt:// are not registered system-wide.
    if (!code && (parsed.protocol === 'exp:' || parsed.protocol === 'exps:')) {
      const path = parsed.pathname ?? '';
      if (path.endsWith('/invite') || path.endsWith('/--/invite')) {
        looksLikeInvite = true;
        code = (parsed.searchParams.get('code') ?? '').trim();
      } else if (path.includes('/--/invite')) {
        looksLikeInvite = true;
        code = (parsed.searchParams.get('code') ?? '').trim();
      }
    }

    // 3) Universal link format:
    // - https://go.kwilt.app/i/<code>
    // - https://kwilt.app/i/<code>
    if (!code && (parsed.protocol === 'https:' || parsed.protocol === 'http:')) {
      const host = (parsed.hostname ?? '').toLowerCase();
      if (host === 'go.kwilt.app' || host === 'kwilt.app') {
        const path = parsed.pathname ?? '';
        const m = /^\/i\/([^/]+)$/.exec(path);
        if (m?.[1]) {
          looksLikeInvite = true;
          try {
            code = decodeURIComponent(m[1]).trim();
          } catch {
            code = m[1].trim();
          }
        } else if (path === '/invite' || path === '/join') {
          looksLikeInvite = true;
          code = (parsed.searchParams.get('code') ?? '').trim();
        } else if ((parsed.searchParams.get('code') ?? '').trim()) {
          // Allow query-param invite code so link generators can evolve.
          looksLikeInvite = true;
          code = (parsed.searchParams.get('code') ?? '').trim();
        }
      }
    }

    if (!looksLikeInvite) return false;
    if (!code) return true;

    // Best-effort: if the invite includes a referral code, redeem it so both sides get credits.
    if (ref) {
      // Use existing referral handler for idempotence + persistence.
      void handleIncomingReferralUrl(`kwilt://referral?code=${encodeURIComponent(ref)}`);
    }

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

    // Default: open the join drawer (avoid showing a dedicated "join page").
    useJoinSharedGoalDrawerStore.getState().open({ inviteCode: code, source: 'deeplink' });

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
  const kindLabel = params.kind === 'people' ? 'people' : params.kind === 'squad' ? 'squad' : 'buddy';
  await new Promise<void>((resolve) => {
    Alert.alert(
      'Invite link ready',
      `You’re inviting ${kindLabel === 'people' ? 'people' : `a ${kindLabel}`}.\n\nBy default you share signals only (check-ins + cheers). Activity titles stay private unless you choose to share them.`,
      [{ text: 'OK', onPress: () => resolve() }],
      { cancelable: true },
    );
  });
}


